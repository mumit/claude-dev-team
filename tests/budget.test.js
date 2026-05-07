const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const SCRIPT = path.resolve(__dirname, "..", "scripts", "budget.js");

function run(cwd, args = []) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd,
    encoding: "utf8",
  });
}

function writeConfig(dir, opts = {}) {
  const enabled = opts.enabled !== undefined ? opts.enabled : true;
  const tokensMax = opts.tokensMax || 500000;
  const wallMax = opts.wallMax || 90;
  const onExceed = opts.onExceed || "escalate";

  const claudeDir = path.join(dir, ".claude");
  fs.mkdirSync(claudeDir, { recursive: true });
  fs.writeFileSync(path.join(claudeDir, "config.yml"), [
    "budget:",
    `  enabled: ${enabled}`,
    `  tokens_max: ${tokensMax}`,
    `  wall_clock_max_minutes: ${wallMax}`,
    `  on_exceed: ${onExceed}`,
  ].join("\n") + "\n");
}

describe("budget script", () => {
  let tmp;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "claude-budget-"));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  describe("disabled mode (no-op)", () => {
    it("init is a no-op when budget.enabled is false", () => {
      writeConfig(tmp, { enabled: false });
      const result = run(tmp, ["init"]);
      assert.equal(result.status, 0);
      assert.match(result.stdout, /disabled/i);
      assert.equal(fs.existsSync(path.join(tmp, "pipeline", "budget.md")), false);
    });

    it("update is a no-op when budget.enabled is false", () => {
      writeConfig(tmp, { enabled: false });
      const result = run(tmp, ["update", "requirements", "1000", "2.5"]);
      assert.equal(result.status, 0);
      assert.match(result.stdout, /disabled/i);
    });

    it("check is a no-op when budget.enabled is false", () => {
      writeConfig(tmp, { enabled: false });
      const result = run(tmp, ["check"]);
      assert.equal(result.status, 0);
      assert.match(result.stdout, /disabled/i);
    });

    it("no-op when config is missing", () => {
      const result = run(tmp, ["init"]);
      assert.equal(result.status, 0);
      assert.match(result.stdout, /disabled/i);
      assert.equal(fs.existsSync(path.join(tmp, "pipeline", "budget.md")), false);
    });
  });

  describe("init", () => {
    it("creates pipeline/budget.md with config headers", () => {
      writeConfig(tmp, { enabled: true, tokensMax: 300000, wallMax: 60 });
      const result = run(tmp, ["init"]);
      assert.equal(result.status, 0);
      assert.match(result.stdout, /created pipeline\/budget\.md/);

      const content = fs.readFileSync(path.join(tmp, "pipeline", "budget.md"), "utf8");
      assert.match(content, /# Budget/);
      assert.match(content, /Tokens max: 300000/);
      assert.match(content, /Wall-clock max: 60 min/);
      assert.match(content, /Started:/);
    });

    it("does not overwrite existing budget.md", () => {
      writeConfig(tmp, { enabled: true });
      run(tmp, ["init"]);
      const first = fs.readFileSync(path.join(tmp, "pipeline", "budget.md"), "utf8");
      run(tmp, ["init"]);
      const second = fs.readFileSync(path.join(tmp, "pipeline", "budget.md"), "utf8");
      assert.equal(first, second);
    });
  });

  describe("update", () => {
    it("appends a stage row to budget.md", () => {
      writeConfig(tmp, { enabled: true });
      run(tmp, ["init"]);
      const result = run(tmp, ["update", "requirements", "12000", "3.5"]);
      assert.equal(result.status, 0);
      assert.match(result.stdout, /requirements/);

      const content = fs.readFileSync(path.join(tmp, "pipeline", "budget.md"), "utf8");
      assert.match(content, /requirements/);
      assert.match(content, /12000/);
    });

    it("auto-inits if budget.md is missing", () => {
      writeConfig(tmp, { enabled: true });
      const result = run(tmp, ["update", "design", "25000", "8.0"]);
      assert.equal(result.status, 0);
      assert.equal(fs.existsSync(path.join(tmp, "pipeline", "budget.md")), true);
    });

    it("replaces existing row for same stage", () => {
      writeConfig(tmp, { enabled: true });
      run(tmp, ["init"]);
      run(tmp, ["update", "requirements", "5000", "2.0"]);
      run(tmp, ["update", "requirements", "7000", "3.0"]);

      const content = fs.readFileSync(path.join(tmp, "pipeline", "budget.md"), "utf8");
      // Should not have duplicate requirements rows
      const matches = (content.match(/requirements/g) || []).length;
      assert.equal(matches, 1);
      assert.match(content, /7000/);
    });
  });

  describe("check — escalate path", () => {
    it("exits 3 and writes stage-budget.json when tokens exceeded", () => {
      writeConfig(tmp, { enabled: true, tokensMax: 1000, onExceed: "escalate" });
      run(tmp, ["init"]);
      run(tmp, ["update", "requirements", "1500", "5.0"]);
      const result = run(tmp, ["check"]);
      assert.equal(result.status, 3);
      assert.match(result.stderr, /BUDGET ESCALATE/);

      const gatePath = path.join(tmp, "pipeline", "gates", "stage-budget.json");
      assert.equal(fs.existsSync(gatePath), true);
      const gate = JSON.parse(fs.readFileSync(gatePath, "utf8"));
      assert.equal(gate.status, "ESCALATE");
      assert.match(gate.escalation_reason, /tokens/);
    });

    it("exits 3 and writes stage-budget.json when wall-clock exceeded", () => {
      writeConfig(tmp, { enabled: true, wallMax: 5, onExceed: "escalate" });
      run(tmp, ["init"]);
      run(tmp, ["update", "requirements", "100", "10.0"]);
      const result = run(tmp, ["check"]);
      assert.equal(result.status, 3);
      assert.match(result.stderr, /BUDGET ESCALATE/);
    });
  });

  describe("check — warn path", () => {
    it("exits 0 and logs a warning when on_exceed: warn and tokens exceeded", () => {
      writeConfig(tmp, { enabled: true, tokensMax: 1000, onExceed: "warn" });
      run(tmp, ["init"]);
      run(tmp, ["update", "requirements", "1500", "5.0"]);
      const result = run(tmp, ["check"]);
      assert.equal(result.status, 0);
      assert.match(result.stderr, /BUDGET WARNING/);
      assert.equal(fs.existsSync(path.join(tmp, "pipeline", "gates", "stage-budget.json")), false);
    });
  });

  describe("check — within budget", () => {
    it("exits 0 when under both limits", () => {
      writeConfig(tmp, { enabled: true, tokensMax: 500000, wallMax: 90 });
      run(tmp, ["init"]);
      run(tmp, ["update", "requirements", "10000", "3.0"]);
      run(tmp, ["update", "design", "30000", "10.0"]);
      const result = run(tmp, ["check"]);
      assert.equal(result.status, 0);
      assert.match(result.stdout, /Budget OK/);
    });

    it("exits 0 with empty budget.md (no stages yet)", () => {
      writeConfig(tmp, { enabled: true });
      run(tmp, ["init"]);
      const result = run(tmp, ["check"]);
      assert.equal(result.status, 0);
    });
  });
});
