const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const {
  main,
  checkStoplistContent,
  checkAgentPromptLines,
} = require(path.join(ROOT, "scripts", "parity-check.js"));
const {
  COMMANDS,
  RULES,
  SKILLS,
  STAGE_SCHEMAS,
  HELPER_SCRIPTS,
} = require("./_framework-contract");

// ---------------------------------------------------------------------------
// Case 1: main() returns 0 on the actual repo
// ---------------------------------------------------------------------------

describe("parity-check — full repo", () => {
  it("main() returns 0 on the current repo", () => {
    const result = main(ROOT);
    assert.equal(result, 0, "parity check should pass on the live repo");
  });
});

// ---------------------------------------------------------------------------
// Helper: scaffold a minimal tmp directory that passes all checks
// ---------------------------------------------------------------------------

function scaffoldRepo(tmpDir) {
  // commands
  const commandsDir = path.join(tmpDir, ".claude", "commands");
  fs.mkdirSync(commandsDir, { recursive: true });
  for (const cmd of COMMANDS) {
    fs.writeFileSync(path.join(commandsDir, `${cmd}.md`), `# ${cmd}\n`);
  }

  // rules
  const rulesDir = path.join(tmpDir, ".claude", "rules");
  fs.mkdirSync(rulesDir, { recursive: true });
  for (const rule of RULES) {
    fs.writeFileSync(path.join(rulesDir, `${rule}.md`), `# ${rule}\n`);
  }

  // pipeline.md with stoplist content
  fs.writeFileSync(path.join(rulesDir, "pipeline.md"), [
    "# Pipeline",
    "**Safety stoplist**",
    "- Authentication, authorization, or session handling",
    "- Cryptography, key management, or secrets rotation",
    "- PII, payments, or regulated-data handling",
    "## Tracks",
    "| full | All features |",
  ].join("\n"));

  // reviewer agent
  const agentsDir = path.join(tmpDir, ".claude", "agents");
  fs.mkdirSync(agentsDir, { recursive: true });
  const longAgent = ["# Reviewer\n\n", ...Array(105).fill("Behavioral content.\n")].join("");
  fs.writeFileSync(path.join(agentsDir, "reviewer.md"), longAgent);

  // skills
  for (const skill of SKILLS) {
    const skillDir = path.join(tmpDir, ".claude", "skills", skill);
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, "SKILL.md"), `---\nname: ${skill}\ndescription: test\n---\n`);
  }

  // config.yml with all required top-level keys
  const claudeDir = path.join(tmpDir, ".claude");
  fs.mkdirSync(claudeDir, { recursive: true });
  fs.writeFileSync(path.join(claudeDir, "config.yml"), [
    "framework:",
    "  version: \"1.0.0\"",
    "security:",
    "  trigger_paths: []",
    "deploy:",
    "  adapter: docker-compose",
    "budget:",
    "  enabled: false",
    "checkpoints:",
    "  a:",
    "    auto_pass_when: null",
  ].join("\n"));

  // audit-phases reference (>= 100 lines)
  const refsDir = path.join(tmpDir, ".claude", "references");
  fs.mkdirSync(refsDir, { recursive: true });
  const phaseContent = ["# Audit Phase Definitions\n", ...Array(105).fill("Phase content.\n")].join("");
  fs.writeFileSync(path.join(refsDir, "audit-phases.md"), phaseContent);

  // schemas: gate.schema.json + every stage schema
  const schemasDir = path.join(tmpDir, "schemas");
  fs.mkdirSync(schemasDir, { recursive: true });
  for (const schema of ["gate.schema.json", ...STAGE_SCHEMAS]) {
    fs.writeFileSync(path.join(schemasDir, schema), JSON.stringify({ type: "object", required: [] }));
  }

  // scripts
  const scriptsDir = path.join(tmpDir, "scripts");
  fs.mkdirSync(scriptsDir, { recursive: true });
  for (const script of HELPER_SCRIPTS) {
    fs.writeFileSync(path.join(scriptsDir, script), "// stub\n");
  }

  // examples/tiny-app
  fs.mkdirSync(path.join(tmpDir, "examples", "tiny-app", "src", "backend"), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, "examples", "tiny-app", "src", "tests"), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, "examples", "tiny-app", "package.json"), "{}");
  fs.writeFileSync(path.join(tmpDir, "examples", "tiny-app", "README.md"), "# Tiny App\n");
  fs.writeFileSync(path.join(tmpDir, "examples", "tiny-app", "src", "backend", "health.js"), "// health\n");
  fs.writeFileSync(path.join(tmpDir, "examples", "tiny-app", "src", "tests", "health.test.js"), "// test\n");
}

// ---------------------------------------------------------------------------
// Case 2: missing stoplist string makes main() return non-zero
// ---------------------------------------------------------------------------

describe("parity-check — stoplist validation", () => {
  let tmp;

  before(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "claude-parity-test-"));
    scaffoldRepo(tmp);
  });

  after(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("passes with a complete stoplist", () => {
    const errors = checkStoplistContent(tmp);
    assert.equal(errors.length, 0, `unexpected errors: ${errors.join(", ")}`);
  });

  it("fails when a required stoplist string is missing", () => {
    const pipelinePath = path.join(tmp, ".claude", "rules", "pipeline.md");
    fs.writeFileSync(pipelinePath, "# Pipeline\n\n## Tracks\n| full |\n");
    const errors = checkStoplistContent(tmp);
    assert.ok(errors.length > 0, "should have errors when stoplist content is missing");
    assert.ok(errors.some((e) => e.includes("Safety stoplist")));
    // Restore
    fs.writeFileSync(pipelinePath, [
      "# Pipeline",
      "**Safety stoplist**",
      "- Authentication",
      "- Cryptography",
      "- PII",
      "## Tracks",
    ].join("\n"));
  });

  it("main() returns non-zero when stoplist string is missing", () => {
    const pipelinePath = path.join(tmp, ".claude", "rules", "pipeline.md");
    const original = fs.readFileSync(pipelinePath, "utf8");
    fs.writeFileSync(pipelinePath, original.replace(/Authentication/g, "REMOVED"));
    const result = main(tmp);
    assert.notEqual(result, 0, "main() should fail when stoplist content is missing");
    // Restore
    fs.writeFileSync(pipelinePath, original);
  });
});

// ---------------------------------------------------------------------------
// Case 3: agent prompt min-line check
// ---------------------------------------------------------------------------

describe("parity-check — agent prompt line counts", () => {
  let tmp;

  before(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "claude-parity-agents-"));
    scaffoldRepo(tmp);
  });

  after(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("passes when all agent prompts are >= 100 lines", () => {
    const errors = checkAgentPromptLines(tmp);
    assert.equal(errors.length, 0, `unexpected errors: ${errors.join(", ")}`);
  });

  it("fails when an agent prompt is too short", () => {
    const shortContent = "# Reviewer\nToo short.\n";
    const reviewerPath = path.join(tmp, ".claude", "agents", "reviewer.md");
    const original = fs.readFileSync(reviewerPath, "utf8");
    fs.writeFileSync(reviewerPath, shortContent);
    const errors = checkAgentPromptLines(tmp);
    assert.ok(errors.length > 0, "should have errors for short agent prompt");
    assert.ok(errors.some((e) => e.includes("reviewer.md")));
    // Restore
    fs.writeFileSync(reviewerPath, original);
  });

  it("main() returns non-zero when an agent prompt is too short", () => {
    const reviewerPath = path.join(tmp, ".claude", "agents", "reviewer.md");
    const original = fs.readFileSync(reviewerPath, "utf8");
    fs.writeFileSync(reviewerPath, "# Reviewer\nToo short.\n");
    const result = main(tmp);
    assert.notEqual(result, 0, "main() should fail when an agent prompt is too short");
    // Restore
    fs.writeFileSync(reviewerPath, original);
  });
});
