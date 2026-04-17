const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const VALIDATOR = path.resolve(__dirname, "..", ".claude", "hooks", "gate-validator.js");

/**
 * Run gate-validator.js in a temporary working directory.
 * Returns { status, stdout, stderr }.
 */
function run(cwd) {
  try {
    const stdout = execFileSync("node", [VALIDATOR], {
      cwd,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { status: 0, stdout, stderr: "" };
  } catch (err) {
    return {
      status: err.status,
      stdout: err.stdout || "",
      stderr: err.stderr || "",
    };
  }
}

/** Write a JSON gate file and return its path. */
function writeGate(gatesDir, filename, content) {
  const filePath = path.join(gatesDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
  return filePath;
}

/** Create a minimal valid gate object with the given overrides. */
function gate(overrides = {}) {
  return {
    stage: "stage-01",
    status: "PASS",
    agent: "pm",
    timestamp: "2026-04-09T12:00:00Z",
    blockers: [],
    warnings: [],
    ...overrides,
  };
}

describe("gate-validator.js", () => {
  let tmpDir;
  let gatesDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gate-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ── No gates directory ──────────────────────────────────

  it("exits 0 when pipeline/gates/ does not exist", () => {
    const result = run(tmpDir);
    assert.equal(result.status, 0);
  });

  // ── Empty gates directory ───────────────────────────────

  it("exits 0 when pipeline/gates/ is empty", () => {
    gatesDir = path.join(tmpDir, "pipeline", "gates");
    fs.mkdirSync(gatesDir, { recursive: true });

    const result = run(tmpDir);
    assert.equal(result.status, 0);
  });

  // ── PASS gates ──────────────────────────────────────────

  it("exits 0 on a valid PASS gate", () => {
    gatesDir = path.join(tmpDir, "pipeline", "gates");
    fs.mkdirSync(gatesDir, { recursive: true });
    writeGate(gatesDir, "stage-01.json", gate());

    const result = run(tmpDir);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /GATE PASS/);
    assert.match(result.stdout, /stage-01/);
  });

  it("includes warnings in PASS output", () => {
    gatesDir = path.join(tmpDir, "pipeline", "gates");
    fs.mkdirSync(gatesDir, { recursive: true });
    writeGate(gatesDir, "stage-02.json", gate({
      stage: "stage-02",
      warnings: ["Redis not confirmed"],
    }));

    const result = run(tmpDir);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Redis not confirmed/);
  });

  // ── FAIL gates ──────────────────────────────────────────

  it("exits 2 on a valid FAIL gate", () => {
    gatesDir = path.join(tmpDir, "pipeline", "gates");
    fs.mkdirSync(gatesDir, { recursive: true });
    writeGate(gatesDir, "stage-06.json", gate({
      stage: "stage-06",
      status: "FAIL",
      agent: "dev-platform",
    }));

    const result = run(tmpDir);
    assert.equal(result.status, 2);
    assert.match(result.stdout, /GATE FAIL/);
  });

  it("lists blockers on a FAIL gate", () => {
    gatesDir = path.join(tmpDir, "pipeline", "gates");
    fs.mkdirSync(gatesDir, { recursive: true });
    writeGate(gatesDir, "stage-06.json", gate({
      stage: "stage-06",
      status: "FAIL",
      agent: "dev-platform",
      blockers: ["test auth.test.js failed", "missing migration"],
    }));

    const result = run(tmpDir);
    assert.equal(result.status, 2);
    assert.match(result.stdout, /test auth\.test\.js failed/);
    assert.match(result.stdout, /missing migration/);
  });

  // ── ESCALATE gates ──────────────────────────────────────

  it("exits 3 on a valid ESCALATE gate", () => {
    gatesDir = path.join(tmpDir, "pipeline", "gates");
    fs.mkdirSync(gatesDir, { recursive: true });
    writeGate(gatesDir, "stage-05-backend.json", gate({
      stage: "stage-05-backend",
      status: "ESCALATE",
      agent: "dev-frontend",
      escalation_reason: "Token handling contradicts spec",
      decision_needed: "Server-side or client-side token?",
    }));

    const result = run(tmpDir);
    assert.equal(result.status, 3);
    assert.match(result.stdout, /ESCALATION REQUIRED/);
    assert.match(result.stdout, /Token handling contradicts spec/);
    assert.match(result.stdout, /Server-side or client-side token/);
  });

  it("lists options on an ESCALATE gate", () => {
    gatesDir = path.join(tmpDir, "pipeline", "gates");
    fs.mkdirSync(gatesDir, { recursive: true });
    writeGate(gatesDir, "stage-05-backend.json", gate({
      status: "ESCALATE",
      escalation_reason: "Conflict",
      decision_needed: "Pick one",
      options: ["Option A", "Option B"],
    }));

    const result = run(tmpDir);
    assert.equal(result.status, 3);
    assert.match(result.stdout, /Option A/);
    assert.match(result.stdout, /Option B/);
  });

  // ── Error cases ─────────────────────────────────────────

  it("exits 1 on malformed JSON", () => {
    gatesDir = path.join(tmpDir, "pipeline", "gates");
    fs.mkdirSync(gatesDir, { recursive: true });
    fs.writeFileSync(path.join(gatesDir, "stage-01.json"), "{ not valid json");

    const result = run(tmpDir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Could not parse/);
  });

  it("exits 1 when required fields are missing", () => {
    gatesDir = path.join(tmpDir, "pipeline", "gates");
    fs.mkdirSync(gatesDir, { recursive: true });
    // Missing: agent, timestamp, blockers, warnings
    writeGate(gatesDir, "stage-01.json", {
      stage: "stage-01",
      status: "PASS",
    });

    const result = run(tmpDir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /missing fields/);
    assert.match(result.stderr, /agent/);
    assert.match(result.stderr, /timestamp/);
    assert.match(result.stderr, /blockers/);
    assert.match(result.stderr, /warnings/);
  });

  it("exits 1 on unknown status value", () => {
    gatesDir = path.join(tmpDir, "pipeline", "gates");
    fs.mkdirSync(gatesDir, { recursive: true });
    writeGate(gatesDir, "stage-01.json", gate({ status: "YOLO" }));

    const result = run(tmpDir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /UNKNOWN status/);
  });

  // ── Multiple gate files ─────────────────────────────────

  it("picks the most recently modified gate file", async () => {
    gatesDir = path.join(tmpDir, "pipeline", "gates");
    fs.mkdirSync(gatesDir, { recursive: true });

    // Write an older PASS gate
    const older = writeGate(gatesDir, "stage-01.json", gate({
      stage: "stage-01",
      status: "PASS",
    }));

    // Ensure filesystem timestamp difference
    const pastTime = new Date(Date.now() - 5000);
    fs.utimesSync(older, pastTime, pastTime);

    // Write a newer FAIL gate
    writeGate(gatesDir, "stage-06.json", gate({
      stage: "stage-06",
      status: "FAIL",
      agent: "dev-platform",
    }));

    const result = run(tmpDir);
    // Should pick the newer FAIL gate, not the older PASS gate
    assert.equal(result.status, 2);
    assert.match(result.stdout, /stage-06/);
  });

  // ── Non-JSON files ignored ──────────────────────────────

  it("ignores non-JSON files in gates directory", () => {
    gatesDir = path.join(tmpDir, "pipeline", "gates");
    fs.mkdirSync(gatesDir, { recursive: true });
    fs.writeFileSync(path.join(gatesDir, "notes.txt"), "not a gate");
    writeGate(gatesDir, "stage-01.json", gate());

    const result = run(tmpDir);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /GATE PASS/);
  });

  // ── Internal error handling ─────────────────────────────

  it("exits 0 with a WARN message on unexpected internal error", () => {
    // Simulate an unexpected filesystem error by making pipeline/gates a
    // regular file instead of a directory. fs.existsSync returns true, but
    // fs.readdirSync then throws ENOTDIR — which must NOT halt the pipeline.
    const pipelineDir = path.join(tmpDir, "pipeline");
    fs.mkdirSync(pipelineDir, { recursive: true });
    fs.writeFileSync(path.join(pipelineDir, "gates"), "not a directory");

    const result = run(tmpDir);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /internal error/);
    assert.match(result.stdout, /treating as PASS/);
  });
});
