const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PACKAGE_SCRIPTS } = require("../scripts/bootstrap");
const { STAGES, TRACKS, draftGateObject, orderedStageNames } = require("../scripts/claude-team");
const { RULES, SKILLS, STAGE_NUMBERS } = require("./_framework-contract");

const ROOT = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

describe("framework contracts", () => {
  it("package, lockfile, and VERSION are well-formed", () => {
    const version = read("VERSION").trim();
    const pkg = JSON.parse(read("package.json"));
    const lock = JSON.parse(read("package-lock.json"));

    // VERSION is the framework version; package.json tracks the npm package version.
    // They are intentionally independent for the claude-dev-team repo itself.
    assert.ok(version.length > 0, "VERSION should not be empty");
    assert.ok(pkg.version.length > 0, "package.json version should not be empty");
    assert.equal(lock.version, pkg.version, "package-lock.json should match package.json version");
    assert.equal(lock.packages[""].version, pkg.version, "package-lock root package should match package.json");
  });

  it("documented gate required fields match schema required fields", () => {
    const schema = JSON.parse(read("schemas/gate.schema.json"));
    const gatesDoc = read(".claude/rules/gates.md");
    const match = gatesDoc.match(/## Required Fields[\s\S]*?```json\n([\s\S]*?)\n```/);
    assert.ok(match, "gates.md should include a required-fields JSON example");
    const example = JSON.parse(match[1]);

    for (const field of schema.required) {
      assert.ok(field in example, `missing ${field} from gates.md example`);
    }
  });

  it("stage schemas are present for high-value stages", () => {
    for (const stage of STAGE_NUMBERS) {
      const fullPath = path.join(ROOT, "schemas", `${stage}.schema.json`);
      assert.ok(fs.existsSync(fullPath), `${stage} schema should exist`);
      const schema = JSON.parse(fs.readFileSync(fullPath, "utf8"));
      assert.equal(schema.type, "object");
      assert.ok(Array.isArray(schema.required));
    }
  });

  it("stage configuration has matching templates and schemas", () => {
    assert.deepEqual(orderedStageNames(), [
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
    ]);

    for (const name of orderedStageNames()) {
      const config = STAGES[name];
      assert.ok(config, `${name} should have a stage config`);
      assert.match(config.artifact, /^pipeline\//, `${name} artifact should live under pipeline/`);
      assert.match(config.template, /-template\.md$/, `${name} should use a template`);
      assert.ok(fs.existsSync(path.join(ROOT, "templates", config.template)), `${name} template should exist`);

      // Map stage to schema file — peer-review uses stage-05-backend → stage-05
      let stageId = config.stage;
      if (stageId.startsWith("stage-05-")) stageId = "stage-05";
      assert.ok(fs.existsSync(path.join(ROOT, "schemas", `${stageId}.schema.json`)), `${name} schema should exist (expected ${stageId}.schema.json)`);
    }
  });

  it("configured tracks match gate schema enum", () => {
    const schema = JSON.parse(read("schemas/gate.schema.json"));
    assert.deepEqual(TRACKS, schema.properties.track.enum);
  });

  it("stage draft gates include required base and stage fields", () => {
    const baseSchema = JSON.parse(read("schemas/gate.schema.json"));

    for (const name of orderedStageNames()) {
      const config = STAGES[name];
      const gate = draftGateObject(config, "2026-01-01T00:00:00.000Z");
      let stageId = config.stage;
      if (stageId.startsWith("stage-05-")) stageId = "stage-05";
      const stageSchema = JSON.parse(read(`schemas/${stageId}.schema.json`));

      for (const field of baseSchema.required) {
        assert.ok(field in gate, `${name} draft gate should include base field ${field}`);
      }

      for (const field of stageSchema.required) {
        assert.ok(field in gate, `${name} draft gate should include stage field ${field}`);
      }
    }
  });

  it("core skills exist and have content", () => {
    for (const name of SKILLS) {
      const skillPath = path.join(ROOT, ".claude", "skills", name, "SKILL.md");
      assert.ok(fs.existsSync(skillPath), `${name} SKILL.md should exist`);
      const skill = fs.readFileSync(skillPath, "utf8");
      assert.ok(skill.length > 0, `${name} SKILL.md should not be empty`);
      assert.match(skill, /^#/m, `${name} SKILL.md should have at least one heading`);
    }
  });

  it("Claude rule files exist", () => {
    for (const rule of RULES) {
      const body = read(`.claude/rules/${rule}.md`);
      assert.match(body, /^# /, `${rule} should have a title`);
    }
  });

  it("agent prompts exist for all framework roles", () => {
    for (const role of ["backend", "frontend", "platform", "qa"]) {
      const body = read(`.claude/agents/dev-${role}.md`);
      assert.ok(body.startsWith("---\n"), `dev-${role} should start with frontmatter`);
    }
    for (const role of ["pm", "principal", "security-engineer"]) {
      const agentFile = path.join(ROOT, ".claude", "agents", `${role}.md`);
      assert.ok(fs.existsSync(agentFile), `${role} agent should exist`);
    }
  });

  it("deployment adapters are documented and configured", () => {
    const config = read(".claude/config.yml");
    const adaptersReadme = read(".claude/adapters/README.md");
    const adapterNames = ["docker-compose", "kubernetes", "terraform", "custom"];

    assert.match(config, /adapter: docker-compose/);
    for (const name of adapterNames) {
      const body = read(`.claude/adapters/${name}.md`);
      assert.match(adaptersReadme, new RegExp(`\`${name}\``));
      assert.match(body, new RegExp(`# Adapter: ${name}`));
    }
  });

  it("CI runs framework release checks", () => {
    const workflow = read(".github/workflows/test.yml");
    for (const command of ["npm run lint", "npm test"]) {
      assert.match(workflow, new RegExp(command.replaceAll(" ", "\\s+")));
    }
  });

  it("AGENTS.md documents the team overview", () => {
    const agents = read("AGENTS.md");
    assert.match(agents, /## Team Overview|## pm|## principal/);
    assert.match(agents, /pipeline/i);
  });

  it("bootstrap package shims stay aligned with root npm scripts", () => {
    const pkg = JSON.parse(read("package.json"));
    for (const script of Object.keys(PACKAGE_SCRIPTS)) {
      assert.ok(pkg.scripts[script], `root package should include ${script}`);
    }
  });
});
