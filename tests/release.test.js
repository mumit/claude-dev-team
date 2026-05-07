const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  COMMANDS,
  RULES,
  SKILLS,
  STAGE_SCHEMAS,
  HELPER_SCRIPTS,
} = require("./_framework-contract");

const ROOT = path.resolve(__dirname, "..");
const SCRIPT = path.join(ROOT, "scripts", "release.js");

describe("release helper", () => {
  let target;

  beforeEach(() => {
    target = fs.mkdtempSync(path.join(os.tmpdir(), "claude-release-"));

    // Required directories
    fs.mkdirSync(path.join(target, ".claude", "commands"), { recursive: true });
    fs.mkdirSync(path.join(target, ".claude", "rules"), { recursive: true });
    fs.mkdirSync(path.join(target, ".claude", "agents"), { recursive: true });
    fs.mkdirSync(path.join(target, ".claude", "references"), { recursive: true });
    fs.mkdirSync(path.join(target, ".github", "workflows"), { recursive: true });
    fs.mkdirSync(path.join(target, "examples", "tiny-app", "src", "backend"), { recursive: true });
    fs.mkdirSync(path.join(target, "examples", "tiny-app", "src", "tests"), { recursive: true });
    fs.mkdirSync(path.join(target, "schemas"), { recursive: true });
    fs.mkdirSync(path.join(target, "scripts"), { recursive: true });

    // Stoplist content lives in pipeline-tracks.md after the B-21 split;
    // pipeline.md is now a thin index. parity-check scans pipeline-tracks
    // for the required strings, so the fixture writes them there.
    const tracksContent = [
      "# pipeline-tracks",
      "**Safety stoplist**",
      "- Authentication, authorization, or session handling",
      "- Cryptography, key management, or secrets rotation",
      "- PII, payments, or regulated-data handling",
      "## Tracks",
      "| full |",
    ].join("\n") + "\n";
    for (const rule of RULES.filter((r) => r !== "pipeline-tracks")) {
      fs.writeFileSync(path.join(target, ".claude", "rules", `${rule}.md`), `# ${rule}\n`);
    }
    fs.writeFileSync(path.join(target, ".claude", "rules", "pipeline-tracks.md"), tracksContent);

    // Slash commands
    for (const cmd of COMMANDS) {
      fs.writeFileSync(path.join(target, ".claude", "commands", `${cmd}.md`), `# ${cmd}\n`);
    }

    // Skills
    for (const skill of SKILLS) {
      fs.mkdirSync(path.join(target, ".claude", "skills", skill), { recursive: true });
      fs.writeFileSync(
        path.join(target, ".claude", "skills", skill, "SKILL.md"),
        `---\nname: ${skill}\ndescription: test\n---\n`,
      );
    }

    // Reviewer agent (>= 100 lines)
    const longAgentContent = ["# Reviewer\n\n", ...Array(105).fill("Behavioral content.\n")].join("");
    fs.writeFileSync(path.join(target, ".claude", "agents", "reviewer.md"), longAgentContent);

    // Audit phases reference (>= 100 lines)
    const auditPhasesContent = ["# Audit Phase Definitions\n"]
      .concat(Array(105).fill("Phase content line.\n")).join("");
    fs.writeFileSync(path.join(target, ".claude", "references", "audit-phases.md"), auditPhasesContent);

    // Schemas: gate.schema.json + every stage schema
    for (const schema of ["gate.schema.json", ...STAGE_SCHEMAS]) {
      fs.writeFileSync(
        path.join(target, "schemas", schema),
        JSON.stringify({ type: "object", required: [] }),
      );
    }

    // Examples
    fs.writeFileSync(path.join(target, "examples", "tiny-app", "package.json"), "{}");
    fs.writeFileSync(path.join(target, "examples", "tiny-app", "README.md"), "# Tiny App\n");
    fs.writeFileSync(path.join(target, "examples", "tiny-app", "src", "backend", "health.js"), "// health\n");
    fs.writeFileSync(path.join(target, "examples", "tiny-app", "src", "tests", "health.test.js"), "// test\n");

    // Config
    fs.writeFileSync(path.join(target, ".claude", "config.yml"), [
      "framework:",
      "  version: \"1.2.3\"",
      "security:",
      "  trigger_paths: []",
      "deploy:",
      "  adapter: docker-compose",
      "budget:",
      "  enabled: false",
      "checkpoints:",
      "  a:",
      "    auto_pass_when: null",
    ].join("\n") + "\n");

    fs.writeFileSync(path.join(target, ".github", "workflows", "test.yml"), "name: test\n");
    fs.writeFileSync(path.join(target, "VERSION"), "1.2.3\n");
    fs.writeFileSync(path.join(target, "README.md"), "# Test\n");
    fs.writeFileSync(path.join(target, "CLAUDE.md"), "# Claude\n");

    // Stub all helper scripts, then overwrite parity-check.js with the real
    // one so the release check can actually invoke it.
    for (const script of HELPER_SCRIPTS) {
      fs.writeFileSync(path.join(target, "scripts", script), "// stub\n");
    }
    fs.copyFileSync(
      path.join(ROOT, "scripts", "parity-check.js"),
      path.join(target, "scripts", "parity-check.js"),
    );

    fs.writeFileSync(path.join(target, "package.json"), JSON.stringify({
      version: "1.2.3",
      scripts: {
        test: "node --test",
        help: "node scripts/claude-team.js help",
        lint: "node scripts/lint-syntax.js",
        validate: "node scripts/claude-team.js validate",
        doctor: "node scripts/claude-team.js doctor",
        status: "node scripts/claude-team.js status",
        next: "node scripts/claude-team.js next",
        roadmap: "node scripts/claude-team.js roadmap",
        quick: "node scripts/claude-team.js quick",
        nano: "node scripts/claude-team.js nano",
        "config-only": "node scripts/claude-team.js config-only",
        "dep-update": "node scripts/claude-team.js dep-update",
        hotfix: "node scripts/claude-team.js hotfix",
        "pipeline:scaffold": "node scripts/claude-team.js pipeline:scaffold",
        "ask-pm": "node scripts/claude-team.js ask-pm",
        "principal-ruling": "node scripts/claude-team.js principal-ruling",
        adr: "node scripts/claude-team.js adr",
        resume: "node scripts/claude-team.js resume",
        "gate:check:all": "node scripts/gate-validator.js --all",
        summary: "node scripts/claude-team.js summary",
        "pr:pack": "node scripts/pr-pack.js",
        autofold: "node scripts/claude-team.js autofold",
        "parity:check": "node scripts/parity-check.js",
      },
    }, null, 2));

    fs.writeFileSync(path.join(target, "package-lock.json"), JSON.stringify({
      version: "1.2.3",
      packages: {
        "": {
          version: "1.2.3",
        },
      },
    }, null, 2));
  });

  afterEach(() => {
    fs.rmSync(target, { recursive: true, force: true });
  });

  function run(args) {
    return spawnSync(process.execPath, [SCRIPT, ...args], {
      cwd: target,
      encoding: "utf8",
    });
  }

  it("passes when release metadata is consistent", () => {
    const result = run(["check"]);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Release check OK for v1\.2\.3/);
  });

  it("fails when versions drift", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(target, "package.json"), "utf8"));
    pkg.version = "9.9.9";
    fs.writeFileSync(path.join(target, "package.json"), JSON.stringify(pkg, null, 2));

    const result = run(["check"]);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /package\.json version 9\.9\.9/);
  });

  it("fails when .claude/config.yml framework.version drifts", () => {
    const configPath = path.join(target, ".claude", "config.yml");
    const yml = fs.readFileSync(configPath, "utf8");
    fs.writeFileSync(configPath, yml.replace(/version: "1\.2\.3"/, 'version: "9.9.9"'));

    const result = run(["check"]);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /\.claude\/config\.yml framework\.version 9\.9\.9/);
  });

  it("fails when .claude/config.yml is missing framework.version", () => {
    const configPath = path.join(target, ".claude", "config.yml");
    fs.writeFileSync(configPath, "deploy:\n  adapter: docker-compose\n");

    const result = run(["check"]);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /\.claude\/config\.yml is missing framework\.version/);
  });

  it("fails when required CLI scripts are missing", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(target, "package.json"), "utf8"));
    delete pkg.scripts.next;
    fs.writeFileSync(path.join(target, "package.json"), JSON.stringify(pkg, null, 2));

    const result = run(["check"]);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /missing npm script: next/);
  });

  it("writes release notes for the current version", () => {
    const result = run(["notes"]);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /wrote docs\/release-notes\/v1\.2\.3\.md/);
    assert.match(
      fs.readFileSync(path.join(target, "docs", "release-notes", "v1.2.3.md"), "utf8"),
      /# Release v1\.2\.3/,
    );
  });
});
