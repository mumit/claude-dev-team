const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const CLI = path.join(ROOT, "scripts", "claude-team.js");

function runCheckpoint(cwd, stageName) {
  return spawnSync(process.execPath, [CLI, "checkpoint", stageName], {
    cwd,
    encoding: "utf8",
  });
}

function writeConfig(dir, perCheckpoint = {}) {
  const labels = ["a", "b", "c"];
  const lines = ["framework:", "  version: \"1.2.3\"", "checkpoints:"];
  for (const label of labels) {
    lines.push(`  ${label}:`);
    lines.push(`    auto_pass_when: ${perCheckpoint[label] || "null"}`);
  }
  fs.mkdirSync(path.join(dir, ".claude"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".claude", "config.yml"), lines.join("\n") + "\n");
}

function writeGate(dir, fileName, gate) {
  fs.mkdirSync(path.join(dir, "pipeline", "gates"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "pipeline", "gates", fileName),
    JSON.stringify(gate, null, 2),
  );
}

function readContext(dir) {
  const p = path.join(dir, "pipeline", "context.md");
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

describe("checkpoint auto-pass (B-24)", () => {
  let tmp;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "checkpoint-"));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("returns 'not-a-checkpoint' for a stage that doesn't gate a checkpoint", () => {
    writeConfig(tmp);
    const result = runCheckpoint(tmp, "build");
    assert.equal(result.status, 0);
    assert.match(result.stdout, /not-a-checkpoint/);
  });

  it("returns 'waiting' when auto_pass_when is null (default)", () => {
    writeConfig(tmp);
    writeGate(tmp, "stage-01.json", {
      stage: "stage-01", status: "PASS", agent: "pm", track: "full",
      timestamp: "2026-04-29T12:00:00Z", blockers: [], warnings: [],
    });
    const result = runCheckpoint(tmp, "requirements");
    assert.equal(result.status, 0);
    assert.match(result.stdout, /waiting/);
    assert.equal(readContext(tmp), "");
  });

  it("auto-passes Checkpoint A when no_warnings is configured and gate has none", () => {
    writeConfig(tmp, { a: "no_warnings" });
    writeGate(tmp, "stage-01.json", {
      stage: "stage-01", status: "PASS", agent: "pm", track: "full",
      timestamp: "2026-04-29T12:00:00Z", blockers: [], warnings: [],
    });
    const result = runCheckpoint(tmp, "requirements");
    assert.equal(result.status, 0);
    assert.match(result.stdout, /auto-passed/);
    assert.match(readContext(tmp), /CHECKPOINT-AUTO-PASS: a \(no_warnings\)/);
  });

  it("does not auto-pass Checkpoint A when no_warnings is configured but warnings exist", () => {
    writeConfig(tmp, { a: "no_warnings" });
    writeGate(tmp, "stage-01.json", {
      stage: "stage-01", status: "PASS", agent: "pm", track: "full",
      timestamp: "2026-04-29T12:00:00Z", blockers: [], warnings: ["mild concern"],
    });
    const result = runCheckpoint(tmp, "requirements");
    assert.equal(result.status, 0);
    assert.match(result.stdout, /waiting/);
    assert.equal(readContext(tmp), "");
  });

  it("auto-passes Checkpoint C when all_criteria_passed and stage-06 maps 1:1", () => {
    writeConfig(tmp, { c: "all_criteria_passed" });
    writeGate(tmp, "stage-06.json", {
      stage: "stage-06", status: "PASS", agent: "dev-qa", track: "full",
      timestamp: "2026-04-29T12:00:00Z", blockers: [], warnings: [],
      all_acceptance_criteria_met: true,
      criterion_to_test_mapping_is_one_to_one: true,
      tests_total: 1, tests_passed: 1, tests_failed: 0,
      failing_tests: [],
    });
    const result = runCheckpoint(tmp, "qa");
    assert.equal(result.status, 0);
    assert.match(result.stdout, /auto-passed/);
    assert.match(readContext(tmp), /CHECKPOINT-AUTO-PASS: c \(all_criteria_passed\)/);
  });

  it("does not auto-pass Checkpoint C when criteria not met", () => {
    writeConfig(tmp, { c: "all_criteria_passed" });
    writeGate(tmp, "stage-06.json", {
      stage: "stage-06", status: "PASS", agent: "dev-qa", track: "full",
      timestamp: "2026-04-29T12:00:00Z", blockers: [], warnings: [],
      all_acceptance_criteria_met: false,
      criterion_to_test_mapping_is_one_to_one: false,
      tests_total: 1, tests_passed: 0, tests_failed: 1,
      failing_tests: ["foo"],
    });
    const result = runCheckpoint(tmp, "qa");
    assert.equal(result.status, 0);
    assert.match(result.stdout, /waiting/);
  });

  it("suppresses auto-pass when context.md mentions stoplist topics", () => {
    writeConfig(tmp, { a: "no_warnings" });
    writeGate(tmp, "stage-01.json", {
      stage: "stage-01", status: "PASS", agent: "pm", track: "full",
      timestamp: "2026-04-29T12:00:00Z", blockers: [], warnings: [],
    });
    fs.mkdirSync(path.join(tmp, "pipeline"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "pipeline", "context.md"),
      "# Context\n\nThis run touches authorization for the new payments flow.\n",
    );
    const result = runCheckpoint(tmp, "requirements");
    assert.equal(result.status, 0);
    assert.match(result.stdout, /suppressed/);
    // No auto-pass record should be appended.
    assert.doesNotMatch(readContext(tmp), /CHECKPOINT-AUTO-PASS/);
  });

  it("rejects unknown stage names with usage message", () => {
    writeConfig(tmp);
    const result = spawnSync(process.execPath, [CLI, "checkpoint"], {
      cwd: tmp,
      encoding: "utf8",
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Usage: claude-team checkpoint/);
  });
});
