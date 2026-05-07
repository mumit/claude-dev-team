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

  it("exits 1 when pipeline/gates is a regular file (ENOTDIR)", () => {
    // A real filesystem misconfiguration must halt the pipeline. Earlier
    // versions of the validator swallowed this as PASS — see audit B-3.
    const pipelineDir = path.join(tmpDir, "pipeline");
    fs.mkdirSync(pipelineDir, { recursive: true });
    fs.writeFileSync(path.join(pipelineDir, "gates"), "not a directory");

    const result = run(tmpDir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /filesystem error \(ENOTDIR\)/);
  });

  it("exits 1 when a gate file exceeds the 1 MB size cap", () => {
    gatesDir = path.join(tmpDir, "pipeline", "gates");
    fs.mkdirSync(gatesDir, { recursive: true });
    // Build a > 1 MB JSON object: a single warnings entry padded with text.
    // The result is still valid JSON, so the parse never runs — the size
    // check should reject before that.
    const oversize = {
      stage: "stage-01",
      status: "PASS",
      agent: "pm",
      track: "full",
      timestamp: "2026-04-09T12:00:00Z",
      blockers: [],
      warnings: ["x".repeat(1_100_000)],
    };
    fs.writeFileSync(
      path.join(gatesDir, "stage-01.json"),
      JSON.stringify(oversize),
    );

    const result = run(tmpDir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /exceeds 1000000 bytes/);
  });

  it("exits 1 when pipeline/gates is unreadable (EACCES)", (t) => {
    const isRoot =
      typeof process.getuid === "function" && process.getuid() === 0;
    if (process.platform === "win32" || isRoot) {
      t.skip("chmod cannot deny read on this platform/user");
      return;
    }

    gatesDir = path.join(tmpDir, "pipeline", "gates");
    fs.mkdirSync(gatesDir, { recursive: true });
    fs.chmodSync(gatesDir, 0o000);

    let result;
    try {
      result = run(tmpDir);
    } finally {
      // Restore mode so afterEach() can recursively remove tmpDir.
      fs.chmodSync(gatesDir, 0o755);
    }

    assert.equal(result.status, 1);
    assert.match(result.stderr, /filesystem error \(EACCES\)/);
  });

  // ── B-23: structured-log mode ────────────────────────────────────────

  it("emits one JSON event line on PASS when LOG_FORMAT=json", () => {
    gatesDir = path.join(tmpDir, "pipeline", "gates");
    fs.mkdirSync(gatesDir, { recursive: true });
    writeGate(gatesDir, "stage-01.json", gate());

    let result;
    try {
      const stdout = execFileSync("node", [VALIDATOR], {
        cwd: tmpDir,
        encoding: "utf8",
        env: { ...process.env, LOG_FORMAT: "json" },
        stdio: ["pipe", "pipe", "pipe"],
      });
      result = { status: 0, stdout, stderr: "" };
    } catch (err) {
      result = { status: err.status, stdout: err.stdout || "", stderr: err.stderr || "" };
    }

    assert.equal(result.status, 0);
    const jsonLine = result.stdout.split("\n").find((l) => l.startsWith("{"));
    assert.ok(jsonLine, `expected a JSON event line in stdout:\n${result.stdout}`);
    const event = JSON.parse(jsonLine);
    assert.equal(event.hook, "gate-validator");
    assert.equal(event.event, "gate_pass");
    assert.equal(event.stage, "stage-01");
    assert.equal(event.agent, "pm");
    assert.match(event.ts, /^\d{4}-\d{2}-\d{2}T/);
  });

  it("emits no JSON when LOG_FORMAT is unset (default)", () => {
    gatesDir = path.join(tmpDir, "pipeline", "gates");
    fs.mkdirSync(gatesDir, { recursive: true });
    writeGate(gatesDir, "stage-01.json", gate());

    const result = run(tmpDir);
    assert.equal(result.status, 0);
    const jsonLines = result.stdout.split("\n").filter((l) => l.trim().startsWith("{"));
    assert.equal(jsonLines.length, 0, "no JSON lines should appear without LOG_FORMAT=json");
  });

  // ── v2.1: bypassed escalation detection ─────────────────

  it("exits 3 when an older gate is ESCALATE and a newer gate exists", () => {
    gatesDir = path.join(tmpDir, "pipeline", "gates");
    fs.mkdirSync(gatesDir, { recursive: true });

    // Older ESCALATE gate
    const older = writeGate(gatesDir, "stage-02.json", gate({
      stage: "stage-02",
      status: "ESCALATE",
      agent: "principal",
      escalation_reason: "Ambiguous auth boundary",
      decision_needed: "Server or client-side session?",
    }));
    const pastTime = new Date(Date.now() - 5000);
    fs.utimesSync(older, pastTime, pastTime);

    // Newer PASS gate — this is the bypass signal
    writeGate(gatesDir, "stage-04-backend.json", gate({
      stage: "stage-04-backend",
      status: "PASS",
      agent: "dev-backend",
    }));

    const result = run(tmpDir);
    assert.equal(result.status, 3);
    assert.match(result.stdout, /BYPASSED ESCALATION/);
    assert.match(result.stdout, /stage-02/);
    assert.match(result.stdout, /Ambiguous auth boundary/);
  });

  it("does NOT flag a bypass when the ESCALATE gate is the most recent", () => {
    gatesDir = path.join(tmpDir, "pipeline", "gates");
    fs.mkdirSync(gatesDir, { recursive: true });

    // Older PASS gate
    const older = writeGate(gatesDir, "stage-01.json", gate({ stage: "stage-01" }));
    const pastTime = new Date(Date.now() - 5000);
    fs.utimesSync(older, pastTime, pastTime);

    // Newer ESCALATE gate — the normal "halt now" case, not a bypass
    writeGate(gatesDir, "stage-02.json", gate({
      stage: "stage-02",
      status: "ESCALATE",
      agent: "principal",
      escalation_reason: "Waiting on user",
      decision_needed: "Pick an option",
    }));

    const result = run(tmpDir);
    assert.equal(result.status, 3);
    // Must NOT use the bypass phrasing — this is a live escalation
    assert.doesNotMatch(result.stdout, /BYPASSED/);
    assert.match(result.stdout, /ESCALATION REQUIRED/);
  });

  // ── v2.1: retry integrity ───────────────────────────────

  it("exits 1 on a retry gate with empty this_attempt_differs_by", () => {
    gatesDir = path.join(tmpDir, "pipeline", "gates");
    fs.mkdirSync(gatesDir, { recursive: true });
    writeGate(gatesDir, "stage-06.json", gate({
      stage: "stage-06",
      status: "FAIL",
      agent: "dev-platform",
      retry_number: 1,
      this_attempt_differs_by: "",
    }));

    const result = run(tmpDir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /retry_number=1 requires non-empty this_attempt_differs_by/);
  });

  it("exits 1 on a retry gate missing this_attempt_differs_by", () => {
    gatesDir = path.join(tmpDir, "pipeline", "gates");
    fs.mkdirSync(gatesDir, { recursive: true });
    writeGate(gatesDir, "stage-06.json", gate({
      stage: "stage-06",
      status: "FAIL",
      agent: "dev-platform",
      retry_number: 2,
    }));

    const result = run(tmpDir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /this_attempt_differs_by/);
  });

  it("accepts a retry gate with a populated this_attempt_differs_by", () => {
    gatesDir = path.join(tmpDir, "pipeline", "gates");
    fs.mkdirSync(gatesDir, { recursive: true });
    writeGate(gatesDir, "stage-06.json", gate({
      stage: "stage-06",
      status: "FAIL",
      agent: "dev-platform",
      retry_number: 1,
      this_attempt_differs_by: "Added explicit timeout to the flaky test",
    }));

    const result = run(tmpDir);
    assert.equal(result.status, 2); // FAIL is the expected primary exit
  });

  // ── v2.1: track field advisory ──────────────────────────

  it("emits an advisory when track field is missing", () => {
    gatesDir = path.join(tmpDir, "pipeline", "gates");
    fs.mkdirSync(gatesDir, { recursive: true });
    writeGate(gatesDir, "stage-01.json", gate()); // no "track"

    const result = run(tmpDir);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /missing "track" field/);
  });

  it("emits an advisory when track field is unrecognised", () => {
    gatesDir = path.join(tmpDir, "pipeline", "gates");
    fs.mkdirSync(gatesDir, { recursive: true });
    writeGate(gatesDir, "stage-01.json", gate({ track: "make-believe" }));

    const result = run(tmpDir);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /unrecognised track/);
  });

  it("accepts all known track values silently", () => {
    gatesDir = path.join(tmpDir, "pipeline", "gates");
    fs.mkdirSync(gatesDir, { recursive: true });
    writeGate(gatesDir, "stage-01.json", gate({ track: "quick" }));

    const result = run(tmpDir);
    assert.equal(result.status, 0);
    assert.doesNotMatch(result.stdout, /missing "track"|unrecognised track/);
  });

  // ── v2.1: lessons-learned.md Reinforced: line validation ──

  it("warns on a malformed Reinforced: line in lessons-learned.md", () => {
    gatesDir = path.join(tmpDir, "pipeline", "gates");
    fs.mkdirSync(gatesDir, { recursive: true });
    writeGate(gatesDir, "stage-01.json", gate({ track: "full" }));

    const lessonsPath = path.join(tmpDir, "pipeline", "lessons-learned.md");
    // N/A is a classic placeholder that the retrospective parser contract forbids
    fs.writeFileSync(
      lessonsPath,
      [
        "### L001 — Example",
        "**Added:** 2026-04-01",
        "**Reinforced:** N/A",
        "**Rule:** ...",
        "",
      ].join("\n"),
    );

    const result = run(tmpDir);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /lessons-learned\.md:3 malformed/);
  });

  it("accepts `**Reinforced:** 0` (no suffix) as valid", () => {
    gatesDir = path.join(tmpDir, "pipeline", "gates");
    fs.mkdirSync(gatesDir, { recursive: true });
    writeGate(gatesDir, "stage-01.json", gate({ track: "full" }));

    const lessonsPath = path.join(tmpDir, "pipeline", "lessons-learned.md");
    fs.writeFileSync(
      lessonsPath,
      [
        "### L001 — Example",
        "**Added:** 2026-04-01",
        "**Reinforced:** 0",
        "**Rule:** ...",
        "",
      ].join("\n"),
    );

    const result = run(tmpDir);
    assert.equal(result.status, 0);
    assert.doesNotMatch(result.stdout, /malformed/);
  });

  it("accepts `**Reinforced:** N (last: YYYY-MM-DD)` as valid", () => {
    gatesDir = path.join(tmpDir, "pipeline", "gates");
    fs.mkdirSync(gatesDir, { recursive: true });
    writeGate(gatesDir, "stage-01.json", gate({ track: "full" }));

    const lessonsPath = path.join(tmpDir, "pipeline", "lessons-learned.md");
    fs.writeFileSync(
      lessonsPath,
      [
        "### L002 — Another",
        "**Added:** 2026-04-01",
        "**Reinforced:** 3 (last: 2026-05-14)",
        "**Rule:** ...",
        "",
      ].join("\n"),
    );

    const result = run(tmpDir);
    assert.equal(result.status, 0);
    assert.doesNotMatch(result.stdout, /malformed/);
  });

  it("does not scan lessons-learned.md when the file does not exist", () => {
    gatesDir = path.join(tmpDir, "pipeline", "gates");
    fs.mkdirSync(gatesDir, { recursive: true });
    writeGate(gatesDir, "stage-01.json", gate({ track: "full" }));

    const result = run(tmpDir);
    assert.equal(result.status, 0);
    assert.doesNotMatch(result.stdout, /malformed/);
  });
});
