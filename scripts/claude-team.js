#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { checkStoplist, explainMatches } = require("./stoplist");

const ROOT = process.cwd();
const TEMPLATE_DIR = path.join(ROOT, "templates");
const TRACKS = ["full", "quick", "nano", "config-only", "dep-update", "hotfix"];

// Tracks that bypass the safety stoplist:
//   - hotfix: by design (urgent prod bugs follow their own rules)
//   - full pipeline: doesn't go through runTrack
const STOPLIST_GUARDED_TRACKS = new Set(["quick", "nano", "config-only", "dep-update"]);

// Claude stage numbering:
//   1 = requirements, 2 = design, 3 = clarify, 4 = build,
//   4.5a = pre-review, 4.5b = security review,
//   5 = peer-review, 6 = tests, 7 = sign-off, 8 = deploy, 9 = retro
//
// Gate file naming: stage-01 through stage-09, stage-05-<area> for peer review

const STAGES = {
  requirements: {
    stage: "stage-01",
    role: "PM",
    objective: "Turn the feature request into requirements, acceptance criteria, and scope boundaries.",
    readFirst: ["CLAUDE.md", ".claude/rules/pipeline.md", ".claude/rules/gates.md", "pipeline/context.md"],
    allowedWrites: ["pipeline/brief.md", "pipeline/gates/stage-01.json", "pipeline/context.md"],
    artifact: "pipeline/brief.md",
    template: "brief-template.md",
    gate: {
      agent: "pm",
      acceptance_criteria_count: 0,
      out_of_scope_items: [],
      required_sections_complete: false,
    },
  },
  design: {
    stage: "stage-02",
    role: "Principal",
    objective: "Convert approved requirements into an implementable architecture and explicit decisions.",
    readFirst: ["CLAUDE.md", ".claude/rules/pipeline.md", ".claude/rules/gates.md", "pipeline/context.md", "pipeline/brief.md"],
    allowedWrites: ["pipeline/design-spec.md", "pipeline/adr/", "pipeline/gates/stage-02.json", "pipeline/context.md"],
    artifact: "pipeline/design-spec.md",
    template: "design-spec-template.md",
    gate: {
      agent: "principal",
      arch_approved: false,
      pm_approved: false,
      adr_count: 0,
    },
  },
  clarification: {
    stage: "stage-03",
    role: "PM",
    objective: "Resolve open questions from requirements and design before implementation starts.",
    readFirst: ["CLAUDE.md", ".claude/rules/pipeline.md", ".claude/rules/gates.md", "pipeline/context.md", "pipeline/brief.md", "pipeline/design-spec.md"],
    allowedWrites: ["pipeline/clarification-log.md", "pipeline/gates/stage-03.json", "pipeline/context.md"],
    artifact: "pipeline/clarification-log.md",
    template: "clarification-template.md",
    gate: {
      agent: "pm",
      open_questions_count: 0,
      answered_questions_count: 0,
      scope_changed: false,
    },
  },
  build: {
    stage: "stage-04",
    role: "Backend | Frontend | Platform | QA",
    objective: "Implement the approved design in role-owned workstreams and record local verification.",
    readFirst: ["CLAUDE.md", ".claude/rules/pipeline.md", ".claude/rules/gates.md", "pipeline/context.md", "pipeline/brief.md", "pipeline/design-spec.md"],
    allowedWrites: ["src/backend/", "src/frontend/", "src/infra/", "src/tests/", "pipeline/pr-*.md", "pipeline/build-plan.md", "pipeline/gates/stage-04.json"],
    artifact: "pipeline/build-plan.md",
    template: "build-template.md",
    gate: {
      agent: "claude-team",
      workstreams: [],
      pr_summaries_written: [],
      local_verification: [],
    },
  },
  "pre-review": {
    stage: "stage-04a",
    role: "Platform",
    objective: "Run lint, tests, dependency/license review, and security-trigger checks before peer review. (Stage 4.5a)",
    readFirst: ["CLAUDE.md", ".claude/rules/pipeline.md", ".claude/rules/gates.md", "pipeline/context.md", "pipeline/build-plan.md", "pipeline/pr-*.md"],
    allowedWrites: ["pipeline/pre-review.md", "pipeline/security-review.md", "pipeline/gates/stage-04a.json", "pipeline/context.md"],
    artifact: "pipeline/pre-review.md",
    template: "pre-review-template.md",
    gate: {
      agent: "platform",
      lint_passed: false,
      tests_passed: false,
      dependency_review_passed: false,
      security_review_required: false,
    },
  },
  "peer-review": {
    stage: "stage-05-backend",
    role: "Reviewer",
    objective: "Review peer implementation notes, record findings, and derive deterministic approval gates. (Stage 5)",
    readFirst: ["CLAUDE.md", ".claude/rules/pipeline.md", ".claude/rules/gates.md", "pipeline/context.md", "pipeline/pr-*.md"],
    allowedWrites: ["pipeline/code-review/by-<role>.md", "pipeline/gates/stage-05-*.json"],
    artifact: "pipeline/code-review/by-backend.md",
    template: "review-template.md",
    gate: {
      agent: "claude-team",
      area: "backend",
      review_shape: "matrix",
      required_approvals: 2,
      approvals: [],
      changes_requested: [],
      escalated_to_principal: false,
    },
  },
  review: null,
  qa: {
    stage: "stage-06",
    role: "QA",
    objective: "Verify every acceptance criterion with a one-to-one test mapping and report results. (Stage 6)",
    readFirst: ["CLAUDE.md", ".claude/rules/pipeline.md", ".claude/rules/gates.md", "pipeline/context.md", "pipeline/brief.md", "pipeline/design-spec.md"],
    allowedWrites: ["src/tests/", "pipeline/test-report.md", "pipeline/gates/stage-06.json", "pipeline/context.md"],
    artifact: "pipeline/test-report.md",
    template: "test-report-template.md",
    gate: {
      agent: "qa",
      all_acceptance_criteria_met: false,
      tests_total: 0,
      tests_passed: 0,
      tests_failed: 0,
      failing_tests: [],
      criterion_to_test_mapping_is_one_to_one: false,
    },
  },
  "sign-off": {
    stage: "stage-07",
    role: "PM + Platform",
    objective: "PM sign-off on QA results; platform prepares deploy runbook. (Stage 7)",
    readFirst: ["CLAUDE.md", ".claude/rules/pipeline.md", ".claude/rules/gates.md", "pipeline/context.md", "pipeline/test-report.md"],
    allowedWrites: ["pipeline/runbook.md", "pipeline/gates/stage-07.json", "pipeline/context.md"],
    artifact: "pipeline/runbook.md",
    template: "runbook-template.md",
    gate: {
      agent: "platform",
      pm_signoff: false,
      deploy_requested: false,
      runbook_referenced: false,
    },
  },
  deploy: {
    stage: "stage-08",
    role: "Platform",
    objective: "Execute the deploy runbook and record results. (Stage 8)",
    readFirst: ["CLAUDE.md", ".claude/rules/pipeline.md", ".claude/rules/gates.md", "pipeline/context.md", "pipeline/runbook.md"],
    allowedWrites: ["pipeline/deploy-log.md", "pipeline/gates/stage-08.json", "pipeline/context.md"],
    artifact: "pipeline/deploy-log.md",
    template: "pr-summary-template.md",
    gate: {
      agent: "platform",
      pm_signoff: false,
      deploy_requested: false,
      runbook_referenced: false,
    },
  },
  retrospective: {
    stage: "stage-09",
    role: "Principal",
    objective: "Synthesize the run, capture durable lessons, and close the pipeline loop. (Stage 9)",
    readFirst: ["CLAUDE.md", ".claude/rules/pipeline.md", ".claude/rules/gates.md", "pipeline/context.md", "pipeline/lessons-learned.md"],
    allowedWrites: ["pipeline/retrospective.md", "pipeline/lessons-learned.md", "pipeline/gates/stage-09.json", "pipeline/context.md"],
    artifact: "pipeline/retrospective.md",
    template: "retrospective-template.md",
    gate: {
      agent: "principal",
      severity: "green",
      lessons_promoted: [],
      patterns_harvested: 0,
      contributions_written: [],
    },
  },
};

function canonicalStageName(name) {
  return name === "review" ? "peer-review" : name;
}

function stageNames() {
  return Object.keys(STAGES).filter((name) => STAGES[name]);
}

function orderedStageNames() {
  return [
    "requirements",
    "design",
    "clarification",
    "build",
    "pre-review",
    "peer-review",
    "qa",
    "sign-off",
    "deploy",
    "retrospective",
  ];
}

function orderedStageNamesForTrack(track) {
  const stagesByTrack = {
    full: orderedStageNames(),
    quick: ["requirements", "build", "peer-review", "qa", "sign-off", "deploy", "retrospective"],
    nano: ["build", "qa"],
    "config-only": ["build", "pre-review", "qa", "sign-off", "deploy"],
    "dep-update": ["build", "peer-review", "qa", "sign-off", "deploy"],
    hotfix: ["build", "pre-review", "peer-review", "qa", "sign-off", "deploy", "retrospective"],
  };
  return stagesByTrack[track] || stagesByTrack.full;
}

function stageConfigForTrackStep(track, name) {
  const config = STAGES[name];
  if (!config) return null;
  if (name === "peer-review" && track === "dep-update") {
    return { ...config, stage: "stage-05-deps" };
  }
  return config;
}

function roleNamesForConfig(config) {
  return config.role
    .split("|")
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean)
    .map((name) => {
      if (name === "pm") return "pm";
      if (name === "pm + platform") return "pm";
      return name;
    });
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function runNodeScript(script, args = []) {
  const scriptPath = path.join(__dirname, script);
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: "inherit",
  });
  return result.status || 0;
}

function readTemplate(name) {
  const tmplPath = path.join(TEMPLATE_DIR, name);
  if (!fs.existsSync(tmplPath)) {
    return `# ${name.replace("-template.md", "").replace(/-/g, " ")}\n\nTBD\n`;
  }
  return fs.readFileSync(tmplPath, "utf8");
}

function writeIfMissing(relativePath, content) {
  const full = path.join(ROOT, relativePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  if (!fs.existsSync(full)) {
    fs.writeFileSync(full, content.endsWith("\n") ? content : `${content}\n`);
    return true;
  }
  return false;
}

function ensurePipelineWorkspace() {
  fs.mkdirSync(path.join(ROOT, "pipeline", "gates"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, "pipeline", "adr"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, "pipeline", "code-review"), { recursive: true });
  writeIfMissing("pipeline/context.md", "# Project Context\n\n## Fix Log\n");
  writeIfMissing("pipeline/lessons-learned.md", "# Lessons Learned\n\n---\n");
}

function appendContext(line) {
  ensurePipelineWorkspace();
  fs.appendFileSync(path.join(ROOT, "pipeline", "context.md"), `\n${line}\n`);
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "decision";
}

function stageNameFromInput(input) {
  const raw = String(input || "").trim().toLowerCase();
  const canonicalName = canonicalStageName(raw);
  if (STAGES[canonicalName]) return canonicalName;

  // Support stage numbers: 1-9
  const stageNumber = raw.match(/^(?:stage-)?0?([1-9])(?:a|b)?(?:-.+)?$/);
  if (!stageNumber) return null;

  const num = Number(stageNumber[1]);
  const stageMap = {
    1: "requirements",
    2: "design",
    3: "clarification",
    4: "build",
    5: "peer-review",
    6: "qa",
    7: "sign-off",
    8: "deploy",
    9: "retrospective",
  };
  return stageMap[num] || null;
}

function currentTrack() {
  return process.env.CLAUDE_TEAM_TRACK || process.env.CODEX_TEAM_TRACK || "full";
}

function validateTrack() {
  const track = currentTrack();
  if (TRACKS.includes(track)) return true;
  const envVar = process.env.CLAUDE_TEAM_TRACK ? "CLAUDE_TEAM_TRACK" : "CODEX_TEAM_TRACK";
  console.error(`Unsupported ${envVar}: ${track}`);
  console.error(`Known tracks: ${TRACKS.join(", ")}`);
  return false;
}

function withTrack(track, callback) {
  const previousClaude = process.env.CLAUDE_TEAM_TRACK;
  const previousCodex = process.env.CODEX_TEAM_TRACK;
  process.env.CLAUDE_TEAM_TRACK = track;
  process.env.CODEX_TEAM_TRACK = track;
  try {
    return callback();
  } finally {
    if (previousClaude === undefined) delete process.env.CLAUDE_TEAM_TRACK;
    else process.env.CLAUDE_TEAM_TRACK = previousClaude;
    if (previousCodex === undefined) delete process.env.CODEX_TEAM_TRACK;
    else process.env.CODEX_TEAM_TRACK = previousCodex;
  }
}

function draftGateObject(stageConfig, timestamp = new Date().toISOString()) {
  return {
    stage: stageConfig.stage,
    status: "FAIL",
    agent: stageConfig.gate.agent,
    track: currentTrack(),
    timestamp,
    blockers: ["Draft gate generated by claude-team stage scaffold"],
    warnings: [],
    ...stageConfig.gate,
  };
}

function draftGate(stageConfig) {
  const gate = draftGateObject(stageConfig);
  const gatePath = path.join(ROOT, "pipeline", "gates", `${stageConfig.stage}.json`);
  fs.mkdirSync(path.dirname(gatePath), { recursive: true });
  if (!fs.existsSync(gatePath)) {
    fs.writeFileSync(gatePath, `${JSON.stringify(gate, null, 2)}\n`);
    return true;
  }
  return false;
}

function scaffoldStage(name) {
  if (!validateTrack()) return 1;
  const canonicalName = canonicalStageName(name);
  const config = STAGES[canonicalName];
  if (!config) {
    console.error(`Unknown stage: ${name}`);
    console.error(`Known stages: ${stageNames().join(", ")}`);
    return 1;
  }

  const artifactCreated = writeIfMissing(config.artifact, readTemplate(config.template));
  const gateCreated = draftGate(config);
  console.log(`${artifactCreated ? "created" : "exists"} ${config.artifact}`);
  console.log(`${gateCreated ? "created" : "exists"} pipeline/gates/${config.stage}.json`);
  return 0;
}

function printList(title, items) {
  console.log(`${title}:`);
  for (const item of items) console.log(`- ${item}`);
}

function trackInstructionLines(track, stageName) {
  const common = {
    quick: [
      "Keep the change inside one owning area; escalate to full if scope grows.",
      "Use scoped review gates with required_approvals=1.",
    ],
    nano: [
      "Use only for trivial changes that cannot affect runtime behavior.",
      "Skip requirements, design, clarification, pre-review, deploy, and retrospective.",
    ],
    "config-only": [
      "Edit only config paths confirmed in pipeline/context.md.",
      "PASS QA gates must include regression_check=PASS.",
    ],
    "dep-update": [
      "Record changelog, license, and vulnerability scan notes in the platform PR.",
      "Use the deps scoped review gate with required_approvals=1.",
    ],
    hotfix: [
      "Read pipeline/hotfix-spec.md instead of a design spec.",
      "Do not skip conditional security review when the heuristic fires.",
    ],
  };

  const stageSpecific = {
    "quick:build": ["Keep the diff small and write pipeline/pr-<area>.md with verification mapped to the mini brief."],
    "quick:peer-review": ["Review is cross-area and scoped; one approval closes the gate."],
    "nano:build": ["Skip plan ceremony; write a one-line PR note and record regression evidence if auto-folding QA."],
    "nano:qa": ["Run only affected checks; PASS gates must include regression_check=PASS."],
    "config-only:build": ["Platform edits only listed config files; any off-list change escalates."],
    "config-only:pre-review": ["Run lint and config validation such as docker compose config when applicable."],
    "dep-update:build": ["Do not make substantive code migrations in this track; escalate if the upgrade requires refactoring."],
    "dep-update:peer-review": ["Focus review on supply-chain scope, lockfile churn, package source, and changelog risk."],
    "hotfix:build": ["Constrain every edit to pipeline/hotfix-spec.md blast-radius limits."],
    "hotfix:pre-review": ["Record stage_4_5a_skipped=true on PASS and still run the security trigger."],
    "hotfix:deploy": ["PM sign-off is required before deploy regardless of urgency."],
  };

  return [
    ...(common[track] || []),
    ...(stageSpecific[`${track}:${stageName}`] || []),
  ];
}

function promptForStage(name, feature) {
  if (!validateTrack()) return 1;
  const canonicalName = canonicalStageName(name);
  const track = activeTrack();
  const config = stageConfigForTrackStep(track, canonicalName);
  if (!config) {
    console.error(`Unknown stage: ${name}`);
    console.error(`Known stages: ${stageNames().join(", ")}`);
    return 1;
  }

  console.log(`Role: ${config.role}`);
  console.log(`Stage: ${config.stage} (${canonicalName})`);
  console.log(`Track: ${track}`);
  if (feature) console.log(`Feature: ${feature}`);
  console.log(`Objective: ${config.objective}`);
  if (!orderedStageNamesForTrack(track).includes(canonicalName)) {
    console.log(`Track warning: ${canonicalName} is skipped by ${track} track.`);
  }
  console.log("");
  const trackInstructions = trackInstructionLines(track, canonicalName);
  if (trackInstructions.length > 0) {
    printList("Track instructions", trackInstructions);
    console.log("");
  }
  const agentDir = ".claude/agents";
  printList("Role briefs", roleNamesForConfig(config).map((role) => {
    const devPath = `${agentDir}/dev-${role}.md`;
    const directPath = `${agentDir}/${role}.md`;
    return fs.existsSync(path.join(ROOT, devPath)) ? devPath : directPath;
  }));
  console.log("");
  printList("Read first", config.readFirst);
  console.log("");
  printList("Allowed writes", config.allowedWrites);
  console.log("");
  printList("Expected artifacts", [config.artifact, `pipeline/gates/${config.stage}.json`]);
  console.log("");
  console.log("Gate:");
  console.log(`- Write pipeline/gates/${config.stage}.json with base fields and stage-specific fields.`);
  console.log("- Set status to PASS only when the deterministic criteria are satisfied.");
  console.log("");
  printList("Verification", ["npm run validate", "npm run status"]);
  return 0;
}

function printRole(name) {
  const normalized = (name || "").toLowerCase();
  const agentsDir = path.join(ROOT, ".claude", "agents");
  // Try dev-<name>.md first, then <name>.md
  const devPath = path.join(agentsDir, `dev-${normalized}.md`);
  const directPath = path.join(agentsDir, `${normalized}.md`);
  const rolePath = fs.existsSync(devPath) ? devPath : fs.existsSync(directPath) ? directPath : null;

  if (!normalized || !rolePath) {
    console.error(`Unknown role: ${name || ""}`);
    console.error("Known roles: backend, frontend, platform, pm, principal, qa, reviewer, security");
    return 1;
  }

  process.stdout.write(fs.readFileSync(rolePath, "utf8"));
  return 0;
}

function printContext() {
  const contextPath = path.join(ROOT, "pipeline", "context.md");
  if (fs.existsSync(contextPath)) {
    console.log(fs.readFileSync(contextPath, "utf8").trimEnd());
  } else {
    console.log("No pipeline/context.md found.");
  }

  console.log("");
  return runNodeScript("status.js");
}

function readGate(stage) {
  const gatePath = path.join(ROOT, "pipeline", "gates", `${stage}.json`);
  if (!fs.existsSync(gatePath)) return { exists: false, gate: null };

  try {
    return {
      exists: true,
      gate: JSON.parse(fs.readFileSync(gatePath, "utf8")),
    };
  } catch (error) {
    return {
      exists: true,
      gate: {
        stage,
        status: "INVALID",
        error: error.message,
      },
    };
  }
}

function scopedReviewGate(area, track) {
  return {
    stage: `stage-05-${area}`,
    status: "FAIL",
    agent: "claude-team",
    track,
    timestamp: new Date().toISOString(),
    blockers: ["Scoped review pending"],
    warnings: [],
    area,
    review_shape: "scoped",
    required_approvals: 1,
    approvals: [],
    changes_requested: [],
    escalated_to_principal: false,
  };
}

function writeScopedReviewGate(area, track) {
  fs.mkdirSync(path.join(ROOT, "pipeline", "gates"), { recursive: true });
  const gatePath = path.join(ROOT, "pipeline", "gates", `stage-05-${area}.json`);
  if (!fs.existsSync(gatePath)) {
    fs.writeFileSync(gatePath, `${JSON.stringify(scopedReviewGate(area, track), null, 2)}\n`);
    return true;
  }
  return false;
}

function reviewAreasFromPrFiles() {
  const pipelineDir = path.join(ROOT, "pipeline");
  if (!fs.existsSync(pipelineDir)) return [];
  return fs.readdirSync(pipelineDir)
    .map((file) => file.match(/^pr-([a-z0-9-]+)\.md$/))
    .filter(Boolean)
    .map((match) => match[1])
    .filter((area) => ["backend", "frontend", "platform", "qa", "security", "deps"].includes(area))
    .sort();
}

function gatesDir() {
  return path.join(ROOT, "pipeline", "gates");
}

function readAllGates() {
  const dir = gatesDir();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => readGate(file.replace(/\.json$/, "")))
    .filter((result) => result.exists)
    .map((result) => result.gate);
}

function activeTrack() {
  const envTrack = currentTrack();
  if (TRACKS.includes(envTrack) && envTrack !== "full") return envTrack;

  const gates = readAllGates();
  const nonFullGate = gates.find((gate) => TRACKS.includes(gate.track) && gate.track !== "full");
  if (nonFullGate) return nonFullGate.track;

  const contextPath = path.join(ROOT, "pipeline", "context.md");
  if (fs.existsSync(contextPath)) {
    const context = fs.readFileSync(contextPath, "utf8");
    for (const track of TRACKS.filter((name) => name !== "full")) {
      if (context.includes(`TRACK: ${track}`)) return track;
    }
  }

  return "full";
}

function stageCommandForTrack(track, name) {
  return track === "full"
    ? `npm run stage -- ${name}`
    : `CLAUDE_TEAM_TRACK=${track} npm run stage -- ${name}`;
}

function writeGate(stage, gate) {
  fs.mkdirSync(path.join(ROOT, "pipeline", "gates"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "pipeline", "gates", `${stage}.json`), `${JSON.stringify(gate, null, 2)}\n`);
}

function nanoAutoFoldEligibility() {
  const build = readGate("stage-04");
  if (!build.exists) return { ok: false, reason: "stage-04 gate is missing" };
  if (build.gate.status !== "PASS") return { ok: false, reason: "stage-04 gate is not PASS" };
  if (build.gate.regression_check !== "PASS" &&
      !(Array.isArray(build.gate.local_verification) && build.gate.local_verification.length > 0)) {
    return { ok: false, reason: "stage-04 must record regression_check=PASS or local_verification" };
  }
  return { ok: true, reason: "stage-04 has regression evidence" };
}

function signoffAutoFoldEligibility(track) {
  if (track === "hotfix") return { ok: false, reason: "hotfix requires explicit PM sign-off" };
  if (track === "nano") return { ok: false, reason: "nano has no deploy/sign-off stage" };

  const qa = readGate("stage-06");
  if (!qa.exists) return { ok: false, reason: "stage-06 gate is missing" };
  if (qa.gate.status !== "PASS") return { ok: false, reason: "stage-06 gate is not PASS" };

  if (["config-only", "dep-update"].includes(track)) {
    return qa.gate.regression_check === "PASS"
      ? { ok: true, reason: "regression-only QA gate passed" }
      : { ok: false, reason: "stage-06 requires regression_check=PASS" };
  }

  if (qa.gate.all_acceptance_criteria_met === true &&
      qa.gate.criterion_to_test_mapping_is_one_to_one === true) {
    return { ok: true, reason: "QA acceptance criteria passed with 1:1 mapping" };
  }

  return { ok: false, reason: "stage-06 must meet acceptance criteria with 1:1 mapping" };
}

function nextPayload() {
  const track = activeTrack();
  for (const name of orderedStageNamesForTrack(track)) {
    const config = stageConfigForTrackStep(track, name);
    const gate = readGate(config.stage);

    if (!gate.exists) {
      if (track === "nano" && name === "qa" && nanoAutoFoldEligibility().ok) {
        return {
          complete: false,
          action: "auto-fold-nano-qa",
          stage: config.stage,
          name,
          role: config.role,
          track,
          reason: "nano-regression-evidence-present",
          command: "npm run autofold",
        };
      }
      if ((name === "sign-off" || name === "deploy") && signoffAutoFoldEligibility(track).ok) {
        return {
          complete: false,
          action: "auto-fold-signoff",
          stage: config.stage,
          name,
          role: config.role,
          track,
          reason: "qa-gate-allows-auto-signoff",
          command: "npm run autofold",
        };
      }
      return {
        complete: false,
        action: "scaffold-stage",
        stage: config.stage,
        name,
        role: config.role,
        track,
        reason: "gate-missing",
        command: stageCommandForTrack(track, name),
      };
    }

    if (gate.gate.status === "INVALID") {
      return {
        complete: false,
        action: "repair-gate",
        stage: config.stage,
        name,
        role: config.role,
        track,
        reason: "gate-invalid",
        command: "npm run validate",
      };
    }

    if (gate.gate.status === "ESCALATE") {
      return {
        complete: false,
        action: "resolve-escalation",
        stage: config.stage,
        name,
        role: config.role,
        track,
        reason: "gate-escalated",
        command: `npm run prompt -- ${name}`,
      };
    }

    if (gate.gate.status !== "PASS") {
      return {
        complete: false,
        action: "complete-stage",
        stage: config.stage,
        name,
        role: config.role,
        track,
        reason: `gate-${String(gate.gate.status || "unknown").toLowerCase()}`,
        command: `npm run prompt -- ${name}`,
      };
    }
  }

  return {
    complete: true,
    action: "pipeline-complete",
    stage: null,
    name: null,
    role: null,
    track,
    reason: "all-gates-pass",
    command: "npm run summary",
  };
}

function printNext(args = []) {
  const payload = nextPayload();
  if (args.includes("--json")) {
    console.log(JSON.stringify(payload, null, 2));
    return 0;
  }

  if (payload.complete) {
    console.log("Pipeline complete.");
    console.log(`Next: ${payload.command}`);
    return 0;
  }

  console.log("Next Pipeline Step");
  console.log("==================");
  console.log(`Stage: ${payload.stage} (${payload.name})`);
  console.log(`Role: ${payload.role}`);
  console.log(`Track: ${payload.track}`);
  console.log(`Reason: ${payload.reason}`);
  console.log(`Action: ${payload.action}`);
  console.log(`Command: ${payload.command}`);
  return 0;
}

function runPipeline(feature) {
  const status = newPipeline(feature);
  if (status !== 0) return status;
  const stageStatus = scaffoldStage("requirements");
  if (stageStatus !== 0) return stageStatus;
  console.log("");
  console.log("Next: complete pipeline/brief.md, write the Stage 1 gate, then run npm run validate.");
  return 0;
}

function runDesign(feature) {
  const status = newPipeline(feature);
  if (status !== 0) return status;
  const requirementsStatus = scaffoldStage("requirements");
  if (requirementsStatus !== 0) return requirementsStatus;
  const designStatus = scaffoldStage("design");
  if (designStatus !== 0) return designStatus;
  console.log("");
  console.log("Next: complete requirements and design artifacts, then run npm run validate.");
  return 0;
}

function scaffoldPipeline(feature) {
  const status = newPipeline(feature);
  if (status !== 0) return status;

  for (const stage of orderedStageNames()) {
    const stageStatus = scaffoldStage(stage);
    if (stageStatus !== 0) return stageStatus;
  }

  console.log("");
  console.log("Pipeline scaffold complete. Fill artifacts in order and advance gates with npm run validate.");
  return 0;
}

function runPipelineReview() {
  const track = activeTrack();
  if (track === "dep-update") {
    writeScopedReviewGate("deps", track);
    return runNodeScript("approval-derivation.js");
  }
  if (track === "quick") {
    for (const area of reviewAreasFromPrFiles()) writeScopedReviewGate(area, track);
    return runNodeScript("approval-derivation.js");
  }

  const stageStatus = scaffoldStage("peer-review");
  if (stageStatus !== 0) return stageStatus;
  return runNodeScript("approval-derivation.js");
}

function runAutoFold() {
  const track = activeTrack();

  if (track === "nano") {
    const existingQa = readGate("stage-06");
    if (existingQa.exists) {
      console.log("exists pipeline/gates/stage-06.json");
      return 0;
    }

    const eligibility = nanoAutoFoldEligibility();
    if (!eligibility.ok) {
      console.error(`Cannot auto-fold nano QA: ${eligibility.reason}`);
      return 1;
    }

    writeGate("stage-06", {
      stage: "stage-06",
      status: "PASS",
      agent: "orchestrator",
      track,
      timestamp: new Date().toISOString(),
      blockers: [],
      warnings: [],
      all_acceptance_criteria_met: true,
      tests_total: 0,
      tests_passed: 0,
      tests_failed: 0,
      failing_tests: [],
      criterion_to_test_mapping_is_one_to_one: true,
      regression_check: "PASS",
      auto_from_stage_04: true,
    });
    appendContext(`${new Date().toISOString()} - AUTOFOLD: nano QA from stage-04 regression evidence`);
    console.log("created pipeline/gates/stage-06.json");
    return 0;
  }

  // For non-nano: autofold sign-off (stage-07)
  const existingSignoff = readGate("stage-07");
  if (existingSignoff.exists) {
    console.log("exists pipeline/gates/stage-07.json");
    return 0;
  }

  const eligibility = signoffAutoFoldEligibility(track);
  if (!eligibility.ok) {
    console.error(`Cannot auto-fold sign-off: ${eligibility.reason}`);
    return 1;
  }

  writeGate("stage-07", {
    stage: "stage-07",
    status: "PASS",
    agent: "orchestrator",
    track,
    timestamp: new Date().toISOString(),
    blockers: [],
    warnings: ["Deployment not requested by auto-fold"],
    pm_signoff: true,
    deploy_requested: false,
    runbook_referenced: false,
    auto_from_stage_06: true,
  });
  appendContext(`${new Date().toISOString()} - AUTOFOLD: Stage 7 sign-off from Stage 6 QA`);
  console.log("created pipeline/gates/stage-07.json");
  return 0;
}

function runRetrospective() {
  const stageStatus = scaffoldStage("retrospective");
  if (stageStatus !== 0) return stageStatus;
  console.log("");
  console.log("Next: add durable LESSON: lines, then run npm run lessons -- promote.");
  return 0;
}

function writeHotfixSpec(description) {
  return writeIfMissing("pipeline/hotfix-spec.md", [
    "# Hotfix Spec",
    "",
    "## Broken Behavior",
    "",
    description,
    "",
    "## Fix Approach",
    "",
    "TBD",
    "",
    "## Blast Radius Constraints",
    "",
    "- TBD",
    "",
  ].join("\n"));
}

function recordTrackStart(track, description) {
  ensurePipelineWorkspace();
  const now = new Date().toISOString();
  const linesByTrack = {
    quick: [
      `${now} - TRACK: quick`,
      `CHANGE: ${description}`,
      "SCOPE: small contained change; route to full pipeline if it crosses areas or grows past quick bounds",
    ],
    nano: [
      `${now} - TRACK: nano`,
      `CHANGE: ${description}`,
      "FILE(S): TBD",
    ],
    "config-only": [
      `${now} - TRACK: config-only`,
      "CONFIG-ONLY scope: TBD",
      `Rationale: ${description}`,
    ],
    "dep-update": [
      `${now} - TRACK: dep-update`,
      `DEP-UPDATE: ${description}`,
      "Reason: TBD",
      "Blast radius: TBD",
    ],
    hotfix: [
      `${now} - TRACK: hotfix`,
      `BUG/FIX: ${description}`,
      "STAGE-4.5A-SKIP: hotfix track",
    ],
  };

  fs.appendFileSync(
    path.join(ROOT, "pipeline", "context.md"),
    `\n${linesByTrack[track].join("\n")}\n`,
  );
}

function runTrack(track, description, options = {}) {
  const normalizedDescription = description.trim();
  if (!normalizedDescription) {
    console.error(`Usage: claude-team ${track} <change description>`);
    return 1;
  }

  if (STOPLIST_GUARDED_TRACKS.has(track) && !options.force) {
    const matches = checkStoplist({ description: normalizedDescription, cwd: ROOT });
    if (matches.length > 0) {
      console.error(explainMatches(matches));
      return 2;
    }
  }

  return withTrack(track, () => {
    recordTrackStart(track, normalizedDescription);

    if (track === "quick") {
      const status = newPipeline(normalizedDescription);
      if (status !== 0) return status;
      const stageStatus = scaffoldStage("requirements");
      if (stageStatus !== 0) return stageStatus;
      console.log("");
      console.log("Track: quick");
      console.log("Next: complete the mini brief, write the Stage 1 gate, then run npm run prompt -- build.");
      return 0;
    }

    if (track === "hotfix") {
      writeHotfixSpec(normalizedDescription);
      const stageStatus = scaffoldStage("build");
      if (stageStatus !== 0) return stageStatus;
      console.log("");
      console.log("Track: hotfix");
      console.log("Next: complete pipeline/hotfix-spec.md, then run npm run prompt -- build.");
      return 0;
    }

    if (track === "dep-update") {
      writeScopedReviewGate("deps", track);
    }

    const stageStatus = scaffoldStage("build");
    if (stageStatus !== 0) return stageStatus;
    console.log("");
    console.log(`Track: ${track}`);
    console.log("Next: complete the scoped build artifact, write the Stage 4 gate, then run npm run validate.");
    return 0;
  });
}

function nextAdrNumber() {
  ensurePipelineWorkspace();
  const adrDir = path.join(ROOT, "pipeline", "adr");
  const numbers = fs.readdirSync(adrDir)
    .map((file) => file.match(/^(\d{4})-/))
    .filter(Boolean)
    .map((match) => Number(match[1]));
  return String((numbers.length > 0 ? Math.max(...numbers) : 0) + 1).padStart(4, "0");
}

function createAdr(title) {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) {
    console.error("Usage: claude-team adr <title>");
    return 1;
  }

  const number = nextAdrNumber();
  const date = new Date().toISOString().slice(0, 10);
  const file = `pipeline/adr/${number}-${slugify(normalizedTitle)}.md`;
  const content = readTemplate("adr-template.md")
    .replace("NNNN", number)
    .replace("Title", normalizedTitle)
    .replace("YYYY-MM-DD", date);
  writeIfMissing(file, content);
  appendContext(`${new Date().toISOString()} - ADR ${number}: ${normalizedTitle}`);
  console.log(`created ${file}`);
  console.log(`ADR ${number}: ${normalizedTitle}`);
  return 0;
}

function askPm(question) {
  ensurePipelineWorkspace();
  const normalizedQuestion = question.trim();

  if (normalizedQuestion) {
    appendContext(`QUESTION: ${normalizedQuestion}`);
    console.log("recorded QUESTION in pipeline/context.md");
    console.log("Next: run npm run ask-pm with no question, then answer with PM-ANSWER lines.");
    return 0;
  }

  console.log("PM Clarification Pass");
  console.log("=====================");
  console.log("Read all open QUESTION lines in pipeline/context.md.");
  console.log("Answer each one with a PM-ANSWER line directly below it.");
  console.log("Update pipeline/brief.md only if the answer changes scope.");
  return 0;
}

function principalRuling(question) {
  const normalizedQuestion = question.trim();
  if (!normalizedQuestion) {
    console.error("Usage: claude-team principal-ruling <question or conflict>");
    return 1;
  }

  appendContext(`PRINCIPAL-RULING-REQUEST: ${normalizedQuestion}`);
  console.log("recorded PRINCIPAL-RULING-REQUEST in pipeline/context.md");
  console.log("Next: run npm run adr -- \"<ruling title>\" after the Principal makes the decision.");
  return 0;
}

function resumePipeline(input, reason) {
  if (!validateTrack()) return 1;
  const stageName = stageNameFromInput(input);
  if (!stageName) {
    console.error(`Unknown stage: ${input || ""}`);
    console.error(`Known stages: ${stageNames().join(", ")} or stage numbers 1-9`);
    return 1;
  }

  const index = orderedStageNames().indexOf(stageName);
  const blockers = [];
  for (const priorName of orderedStageNames().slice(0, index)) {
    const config = STAGES[priorName];
    const prior = readGate(config.stage);
    if (!prior.exists) blockers.push(`${config.stage} (${priorName}) is missing`);
    else if (prior.gate.status !== "PASS") blockers.push(`${config.stage} (${priorName}) is ${prior.gate.status || "unknown"}`);
  }

  if (blockers.length > 0) {
    console.error(`Cannot resume ${STAGES[stageName].stage} (${stageName}) until prior gates pass:`);
    for (const blocker of blockers) console.error(`- ${blocker}`);
    return 1;
  }

  appendContext(`${new Date().toISOString()} - RESUME: ${STAGES[stageName].stage} (${stageName})${reason ? ` - ${reason}` : ""}`);
  console.log(`Resume: ${STAGES[stageName].stage} (${stageName})`);
  if (reason) console.log(`Reason: ${reason}`);
  console.log("");
  return promptForStage(stageName, "");
}

function newPipeline(name) {
  ensurePipelineWorkspace();
  if (name) {
    fs.appendFileSync(
      path.join(ROOT, "pipeline", "context.md"),
      `\n${new Date().toISOString()} - Pipeline started: ${name}\n`,
    );
  }
  console.log("Pipeline workspace ready.");
  return 0;
}

function reset() {
  const archiveDir = path.join(ROOT, "pipeline", "archive");
  const context = path.join(ROOT, "pipeline", "context.md");
  const stamp = new Date().toISOString().replaceAll(":", "-");
  const runArchiveDir = path.join(archiveDir, `run-${stamp}`);
  const artifactFiles = [
    "brief.md",
    "design-spec.md",
    "hotfix-spec.md",
    "clarification-log.md",
    "build-plan.md",
    "pre-review.md",
    "security-review.md",
    "test-report.md",
    "runbook.md",
    "deploy-log.md",
    "retrospective.md",
    "summary.md",
  ];
  fs.mkdirSync(runArchiveDir, { recursive: true });

  if (fs.existsSync(context)) {
    fs.copyFileSync(context, path.join(runArchiveDir, "context.md"));
  }

  const pipelineDir = path.join(ROOT, "pipeline");
  for (const file of fs.existsSync(pipelineDir) ? fs.readdirSync(pipelineDir) : []) {
    if (/^pr-.+\.md$/.test(file)) artifactFiles.push(file);
  }

  for (const file of artifactFiles) {
    const full = path.join(pipelineDir, file);
    if (fs.existsSync(full)) {
      fs.copyFileSync(full, path.join(runArchiveDir, file));
      fs.rmSync(full);
    }
  }

  for (const relative of [
    "pipeline/gates",
    "pipeline/code-review",
    "pipeline/adr",
  ]) {
    const full = path.join(ROOT, relative);
    const entries = fs.existsSync(full) ? fs.readdirSync(full) : [];
    if (entries.length > 0) {
      fs.cpSync(full, path.join(runArchiveDir, path.basename(relative)), { recursive: true });
    }
    fs.rmSync(full, { recursive: true, force: true });
    fs.mkdirSync(full, { recursive: true });
  }

  console.log("Pipeline runtime state reset. Context archive preserved.");
  return 0;
}

function doctor() {
  const checks = [
    ["CLAUDE.md", exists("CLAUDE.md")],
    ["AGENTS.md", exists("AGENTS.md")],
    [".claude/config.yml", exists(".claude/config.yml")],
    [".claude/adapters/README.md", exists(".claude/adapters/README.md")],
    [".claude/adapters/docker-compose.md", exists(".claude/adapters/docker-compose.md")],
    [".claude/adapters/kubernetes.md", exists(".claude/adapters/kubernetes.md")],
    [".claude/adapters/terraform.md", exists(".claude/adapters/terraform.md")],
    [".claude/adapters/custom.md", exists(".claude/adapters/custom.md")],
    [".claude/skills/implement/SKILL.md", exists(".claude/skills/implement/SKILL.md")],
    ["schemas/gate.schema.json", exists("schemas/gate.schema.json")],
    ["scripts/approval-derivation.js", exists("scripts/approval-derivation.js")],
    ["scripts/audit.js", exists("scripts/audit.js")],
    ["scripts/bootstrap.js", exists("scripts/bootstrap.js")],
    ["scripts/claude-team.js", exists("scripts/claude-team.js")],
    ["scripts/consistency.js", exists("scripts/consistency.js")],
    ["scripts/gate-validator.js", exists("scripts/gate-validator.js")],
    ["scripts/lessons.js", exists("scripts/lessons.js")],
    ["scripts/lint-syntax.js", exists("scripts/lint-syntax.js")],
    ["scripts/pr-pack.js", exists("scripts/pr-pack.js")],
    ["scripts/parity-check.js", exists("scripts/parity-check.js")],
    ["scripts/release.js", exists("scripts/release.js")],
    ["scripts/roadmap.js", exists("scripts/roadmap.js")],
    ["scripts/runbook-check.js", exists("scripts/runbook-check.js")],
    ["scripts/security-heuristic.js", exists("scripts/security-heuristic.js")],
    ["scripts/status.js", exists("scripts/status.js")],
    ["scripts/summary.js", exists("scripts/summary.js")],
    ["pipeline/context.md", exists("pipeline/context.md")],
    ["pipeline/lessons-learned.md", exists("pipeline/lessons-learned.md")],
  ];

  for (const rule of ["coding-principles", "compaction", "escalation", "gates", "orchestrator", "pipeline", "retrospective"]) {
    checks.push([`.claude/rules/${rule}.md`, exists(`.claude/rules/${rule}.md`)]);
  }

  for (const skill of ["api-conventions", "code-conventions", "implement", "pre-pr-review", "review-rubric", "security-checklist"]) {
    checks.push([`.claude/skills/${skill}/SKILL.md`, exists(`.claude/skills/${skill}/SKILL.md`)]);
  }

  for (const stage of ["01", "02", "03", "04", "05", "06", "07", "08", "09"]) {
    checks.push([`schemas/stage-${stage}.schema.json`, exists(`schemas/stage-${stage}.schema.json`)]);
  }

  for (const template of [
    "brief-template.md",
    "adr-template.md",
    "design-spec-template.md",
    "clarification-template.md",
    "build-template.md",
    "pre-review-template.md",
    "review-template.md",
    "test-report-template.md",
    "runbook-template.md",
    "retrospective-template.md",
  ]) {
    checks.push([`templates/${template}`, exists(`templates/${template}`)]);
  }

  let failed = false;
  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
    failed = failed || !ok;
  }

  return failed ? 1 : 0;
}

function validate() {
  const lint = runNodeScript("lint-syntax.js");
  if (lint !== 0) return lint;
  const gates = runNodeScript("gate-validator.js", ["--all"]);
  if (gates !== 0) return gates;
  return runNodeScript("consistency.js");
}

function usage(exitCode = 1) {
  console.log([
    "Usage: claude-team <command>",
    "",
    "Core:",
    "  status | next | roadmap | validate | doctor | reset",
    "  review | security | runbook | budget | lessons | summary | autofold",
    "  audit | audit-quick | health-check",
    "",
    "Pipeline:",
    "  pipeline <feature>",
    "  quick <change>",
    "  nano <change>",
    "  config-only <change>",
    "  dep-update <dependency update>",
    "  hotfix <bug and fix>",
    "  pipeline:scaffold <feature>",
    "  pipeline:new <feature>",
    "  pipeline-brief [feature]",
    "  design <feature>",
    "  pipeline-review",
    "  pipeline-context",
    "  retrospective",
    "  ask-pm [question]",
    "  principal-ruling <question>",
    "  adr <title>",
    "  resume <stage|stage-number> [reason]",
    "  role <name>",
    "  prompt <stage> [feature]",
    "  stage <requirements|design|clarification|build|pre-review|peer-review|qa|sign-off|deploy|retrospective>",
  ].join("\n"));
  return exitCode;
}

// Shared --force parsing for the five lighter tracks.
function dispatchTrack(track, argv) {
  const force = argv.includes("--force");
  const description = argv.filter((a) => a !== "--force").join(" ");
  return runTrack(track, description, { force });
}

// Single source of truth for the CLI surface. Each key is a command name;
// each value is a handler that takes the post-command argv slice and
// returns an exit code. Help (`help`, `--help`, `-h`) is the only command
// with aliases — they share the same handler.
const COMMANDS = {
  help: () => usage(0),
  "--help": () => usage(0),
  "-h": () => usage(0),

  // Diagnostics & state
  status: (argv) => runNodeScript("status.js", argv),
  next: (argv) => printNext(argv),
  summary: () => runNodeScript("summary.js"),
  roadmap: (argv) => runNodeScript("roadmap.js", argv),
  validate: () => validate(),
  doctor: () => doctor(),
  reset: () => reset(),
  autofold: () => runAutoFold(),
  review: () => runNodeScript("approval-derivation.js"),
  security: (argv) => runNodeScript("security-heuristic.js", argv),
  runbook: () => runNodeScript("runbook-check.js"),
  budget: (argv) => runNodeScript("budget.js", argv),
  lessons: (argv) => runNodeScript("lessons.js", argv),

  // Audit family
  audit: (argv) => runNodeScript("audit.js", ["full", ...argv]),
  "audit-quick": (argv) => runNodeScript("audit.js", ["quick", ...argv]),
  "health-check": (argv) => runNodeScript("audit.js", ["health-check", ...argv]),

  // Pipeline (full + lighter tracks)
  pipeline: (argv) => runPipeline(argv.join(" ")),
  quick: (argv) => dispatchTrack("quick", argv),
  nano: (argv) => dispatchTrack("nano", argv),
  "config-only": (argv) => dispatchTrack("config-only", argv),
  "dep-update": (argv) => dispatchTrack("dep-update", argv),
  hotfix: (argv) => dispatchTrack("hotfix", argv),

  // Pipeline operations
  "pipeline:scaffold": (argv) => scaffoldPipeline(argv.join(" ")),
  "pipeline:new": (argv) => newPipeline(argv.join(" ")),
  "pipeline-brief": (argv) => {
    const feature = argv.join(" ");
    if (feature) newPipeline(feature);
    return scaffoldStage("requirements");
  },
  design: (argv) => runDesign(argv.join(" ")),
  "pipeline-review": () => runPipelineReview(),
  "pipeline-context": () => printContext(),
  retrospective: () => runRetrospective(),
  "ask-pm": (argv) => askPm(argv.join(" ")),
  "principal-ruling": (argv) => principalRuling(argv.join(" ")),
  adr: (argv) => createAdr(argv.join(" ")),
  resume: (argv) => resumePipeline(argv[0], argv.slice(1).join(" ")),
  role: (argv) => printRole(argv[0]),
  prompt: (argv) => promptForStage(argv[0], argv.slice(1).join(" ")),
  stage: (argv) => scaffoldStage(argv[0]),
};

function main() {
  const command = process.argv[2];
  const handler = COMMANDS[command];
  if (!handler) return usage();
  return handler(process.argv.slice(3));
}

if (require.main === module) {
  process.exit(main());
}

module.exports = {
  STAGES,
  TRACKS,
  COMMANDS,
  canonicalStageName,
  draftGateObject,
  orderedStageNamesForTrack,
  orderedStageNames,
  activeTrack,
  stageNameFromInput,
  stageNames,
};
