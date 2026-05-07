#!/usr/bin/env node
/**
 * parity-check.js
 *
 * DEEP parity check for claude-dev-team. Verifies:
 * (a) all 23 slash commands have .claude/commands/<name>.md
 * (b) 7 rules + reviewer agent + 6 skills exist
 * (c) .claude/config.yml has budget, checkpoints, security, deploy keys
 * (d) pipeline.md mentions safety stoplist
 * (e) .claude/references/audit-phases.md >= 100 lines
 * (f) all agent prompts >= 100 lines
 * (g) all 9 schemas exist
 * (h) all helper scripts listed in scripts/ exist
 * (i) claude-team.js exists
 * (j) examples/tiny-app/ exists with expected files
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();

const REQUIRED_COMMANDS = [
  "adr",
  "ask-pm",
  "audit-quick",
  "audit",
  "config-only",
  "dep-update",
  "design",
  "health-check",
  "hotfix",
  "nano",
  "pipeline-brief",
  "pipeline-context",
  "pipeline-review",
  "pipeline",
  "principal-ruling",
  "quick",
  "reset",
  "resume",
  "retrospective",
  "review",
  "roadmap",
  "stage",
  "status",
];

const REQUIRED_RULES = [
  "coding-principles",
  "compaction",
  "escalation",
  "gates",
  "orchestrator",
  "pipeline",
  "pipeline-core",
  "pipeline-build",
  "pipeline-tracks",
  "retrospective",
];

const REQUIRED_SKILLS = [
  "api-conventions",
  "code-conventions",
  "implement",
  "pre-pr-review",
  "review-rubric",
  "security-checklist",
];

const REQUIRED_CONFIG_KEYS = [
  "budget",
  "checkpoints",
  "security",
  "deploy",
];

const REQUIRED_STOPLIST_STRINGS = [
  "Safety stoplist",
  "Authentication",
  "Cryptography",
  "PII",
];

const AGENT_PROMPT_MIN_LINES = 100;
const AUDIT_PHASES_MIN_LINES = 100;

const REQUIRED_SCHEMAS = [
  "gate.schema.json",
  "stage-01.schema.json",
  "stage-02.schema.json",
  "stage-03.schema.json",
  "stage-04.schema.json",
  "stage-05.schema.json",
  "stage-06.schema.json",
  "stage-07.schema.json",
  "stage-08.schema.json",
  "stage-09.schema.json",
];

const REQUIRED_SCRIPTS = [
  "claude-team.js",
  "gate-validator.js",
  "approval-derivation.js",
  "status.js",
  "summary.js",
  "roadmap.js",
  "parity-check.js",
  "release.js",
  "pr-pack.js",
  "lessons.js",
  "runbook-check.js",
  "security-heuristic.js",
  "stoplist.js",
  "budget.js",
  "visualize.js",
  "consistency.js",
  "lint-syntax.js",
  "audit.js",
  "bootstrap.js",
];

const REQUIRED_TINY_APP_FILES = [
  "package.json",
  "README.md",
  "src/backend/health.js",
  "src/tests/health.test.js",
];

// ---------------------------------------------------------------------------
// Individual check functions
// ---------------------------------------------------------------------------

/** Check: all required slash commands have .claude/commands/<name>.md */
function checkCommands(root) {
  const errors = [];
  for (const name of REQUIRED_COMMANDS) {
    const cmdPath = path.join(root, ".claude", "commands", `${name}.md`);
    if (!fs.existsSync(cmdPath)) {
      errors.push(`missing .claude/commands/${name}.md`);
    }
  }
  return errors;
}

/** Check: all required rule files exist. */
function checkRules(root) {
  const missing = REQUIRED_RULES.filter(
    (name) => !fs.existsSync(path.join(root, ".claude", "rules", `${name}.md`))
  );
  return missing.map((r) => `missing .claude rule: ${r}`);
}

/** Check: reviewer agent exists. */
function checkReviewerAgent(root) {
  const reviewerPath = path.join(root, ".claude", "agents", "reviewer.md");
  if (!fs.existsSync(reviewerPath)) {
    return ["missing .claude/agents/reviewer.md"];
  }
  return [];
}

/** Check: all required skill dirs exist. */
function checkSkills(root) {
  const missing = REQUIRED_SKILLS.filter(
    (name) => !fs.existsSync(path.join(root, ".claude", "skills", name, "SKILL.md"))
  );
  return missing.map((s) => `missing .claude skill: ${s}`);
}

/** Check: .claude/config.yml has all required top-level keys. */
function checkConfigKeys(root) {
  const configPath = path.join(root, ".claude", "config.yml");
  if (!fs.existsSync(configPath)) return ["missing .claude/config.yml"];
  const content = fs.readFileSync(configPath, "utf8");
  const errors = [];
  for (const key of REQUIRED_CONFIG_KEYS) {
    const re = new RegExp(`^${key}:`, "m");
    if (!re.test(content)) {
      errors.push(`config.yml missing top-level key: ${key}`);
    }
  }
  return errors;
}

/**
 * Check: the pipeline-tracks rule file contains required stoplist strings.
 * (Pre-B-21 the stoplist lived in pipeline.md; the audit-driven split
 * moved it into pipeline-tracks.md, which is now the authoritative source.
 * pipeline.md is a thin index after the split — it does not contain the
 * stoplist text and shouldn't be required to.)
 */
function checkStoplistContent(root) {
  const tracksPath = path.join(root, ".claude", "rules", "pipeline-tracks.md");
  if (!fs.existsSync(tracksPath)) return ["missing .claude/rules/pipeline-tracks.md"];
  const content = fs.readFileSync(tracksPath, "utf8");
  const errors = [];
  for (const str of REQUIRED_STOPLIST_STRINGS) {
    if (!content.includes(str)) {
      errors.push(`pipeline-tracks.md missing required stoplist string: "${str}"`);
    }
  }
  return errors;
}

/** Check: .claude/references/audit-phases.md exists and meets min line count. */
function checkAuditPhases(root) {
  const phaseDoc = path.join(root, ".claude", "references", "audit-phases.md");
  if (!fs.existsSync(phaseDoc)) {
    return ["missing .claude/references/audit-phases.md"];
  }
  const lines = fs.readFileSync(phaseDoc, "utf8").split(/\r?\n/).length;
  if (lines < AUDIT_PHASES_MIN_LINES) {
    return [`audit-phases.md too short: ${lines} lines (min ${AUDIT_PHASES_MIN_LINES})`];
  }
  return [];
}

/** Check: all .claude/agents/*.md files meet minimum line count. */
function checkAgentPromptLines(root) {
  const agentsDir = path.join(root, ".claude", "agents");
  if (!fs.existsSync(agentsDir)) return ["missing .claude/agents/ directory"];
  const errors = [];
  const files = fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md"));
  for (const file of files) {
    const fullPath = path.join(agentsDir, file);
    const lines = fs.readFileSync(fullPath, "utf8").split(/\r?\n/).length;
    if (lines < AGENT_PROMPT_MIN_LINES) {
      errors.push(`agent ${file} too short: ${lines} lines (min ${AGENT_PROMPT_MIN_LINES})`);
    }
  }
  return errors;
}

/** Check: all 9 schemas + gate schema exist. */
function checkSchemas(root) {
  const errors = [];
  for (const schema of REQUIRED_SCHEMAS) {
    if (!fs.existsSync(path.join(root, "schemas", schema))) {
      errors.push(`missing schemas/${schema}`);
    }
  }
  return errors;
}

/** Check: all required helper scripts exist. */
function checkScripts(root) {
  const errors = [];
  for (const script of REQUIRED_SCRIPTS) {
    if (!fs.existsSync(path.join(root, "scripts", script))) {
      errors.push(`missing scripts/${script}`);
    }
  }
  return errors;
}

/** Check: examples/tiny-app/ exists with expected files. */
function checkTinyApp(root) {
  const errors = [];
  const tinyApp = path.join(root, "examples", "tiny-app");
  if (!fs.existsSync(tinyApp)) {
    return ["missing examples/tiny-app/ directory"];
  }
  for (const file of REQUIRED_TINY_APP_FILES) {
    if (!fs.existsSync(path.join(tinyApp, file))) {
      errors.push(`missing examples/tiny-app/${file}`);
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(root) {
  root = root || ROOT;
  const allErrors = [
    ...checkCommands(root),
    ...checkRules(root),
    ...checkReviewerAgent(root),
    ...checkSkills(root),
    ...checkConfigKeys(root),
    ...checkStoplistContent(root),
    ...checkAuditPhases(root),
    ...checkAgentPromptLines(root),
    ...checkSchemas(root),
    ...checkScripts(root),
    ...checkTinyApp(root),
  ];

  if (allErrors.length > 0) {
    for (const err of allErrors) console.error(err);
    return 1;
  }

  console.log("PARITY OK (deep)");
  console.log(`Commands covered: ${REQUIRED_COMMANDS.length}/${REQUIRED_COMMANDS.length}`);
  console.log(`Rules covered: ${REQUIRED_RULES.length}/${REQUIRED_RULES.length}`);
  console.log(`Skills covered: ${REQUIRED_SKILLS.length}/${REQUIRED_SKILLS.length}`);
  console.log("Reviewer agent: present");
  console.log("Config keys: OK");
  console.log("Stoplist content: OK");
  console.log("Audit phases reference: OK");
  console.log("Agent prompts: line counts OK");
  console.log(`Schemas: ${REQUIRED_SCHEMAS.length}/${REQUIRED_SCHEMAS.length}`);
  console.log(`Helper scripts: ${REQUIRED_SCRIPTS.length}/${REQUIRED_SCRIPTS.length}`);
  console.log("examples/tiny-app: OK");
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = {
  main,
  checkCommands,
  checkRules,
  checkReviewerAgent,
  checkSkills,
  checkConfigKeys,
  checkStoplistContent,
  checkAuditPhases,
  checkAgentPromptLines,
  checkSchemas,
  checkScripts,
  checkTinyApp,
  REQUIRED_COMMANDS,
  REQUIRED_RULES,
  REQUIRED_SKILLS,
  REQUIRED_SCHEMAS,
  REQUIRED_SCRIPTS,
};
