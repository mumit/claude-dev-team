const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync, spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const HOOK = path.resolve(
  __dirname,
  "..",
  ".claude",
  "hooks",
  "approval-derivation.js",
);

/**
 * Run the hook in `cwd`. When `stdinData` is provided it is piped to the
 * hook's stdin, simulating the PostToolUse context Claude Code sends.
 */
function run(cwd, stdinData = null) {
  try {
    const stdout = execFileSync("node", [HOOK], {
      cwd,
      encoding: "utf8",
      input: stdinData !== null ? stdinData : undefined,
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

/** Build a PostToolUse stdin payload for a given file path. */
function hookContext(filePath) {
  return JSON.stringify({
    hook_event_name: "PostToolUse",
    tool_name: "Write",
    tool_input: { file_path: filePath },
  });
}

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function readGate(gatesDir, name) {
  const fullPath = path.join(gatesDir, name);
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

describe("approval-derivation.js", () => {
  let tmpDir;
  let reviewDir;
  let gatesDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "approval-test-"));
    reviewDir = path.join(tmpDir, "pipeline", "code-review");
    gatesDir = path.join(tmpDir, "pipeline", "gates");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("exits 0 when pipeline/code-review/ does not exist", () => {
    const result = run(tmpDir);
    assert.equal(result.status, 0);
  });

  it("exits 0 when review directory is empty", () => {
    fs.mkdirSync(reviewDir, { recursive: true });
    const result = run(tmpDir);
    assert.equal(result.status, 0);
  });

  it("creates a stage-05-backend gate from an APPROVED section", () => {
    write(
      path.join(reviewDir, "by-frontend.md"),
      [
        "# Review by dev-frontend",
        "",
        "## Review of backend",
        "Looks good.",
        "",
        "REVIEW: APPROVED",
        "",
      ].join("\n"),
    );

    run(tmpDir);

    const gate = readGate(gatesDir, "stage-05-backend.json");
    assert.ok(gate, "gate file was not created");
    assert.deepEqual(gate.approvals, ["dev-frontend"]);
    assert.deepEqual(gate.changes_requested, []);
    // Default required is 2 (matrix); one approval is not enough yet
    assert.equal(gate.status, "FAIL");
  });

  it("updates gate to PASS when approvals reach required_approvals", () => {
    // Seed a scoped gate with required_approvals=1
    fs.mkdirSync(gatesDir, { recursive: true });
    fs.writeFileSync(
      path.join(gatesDir, "stage-05-backend.json"),
      JSON.stringify(
        {
          stage: "stage-05-backend",
          status: "FAIL",
          agent: "orchestrator",
          timestamp: "2026-04-21T00:00:00Z",
          blockers: [],
          warnings: [],
          area: "backend",
          approvals: [],
          changes_requested: [],
          escalated_to_principal: false,
          required_approvals: 1,
          review_shape: "scoped",
        },
        null,
        2,
      ),
    );

    write(
      path.join(reviewDir, "by-platform.md"),
      [
        "# Review by dev-platform",
        "",
        "## Review of backend",
        "Ship it.",
        "REVIEW: APPROVED",
        "",
      ].join("\n"),
    );

    run(tmpDir);

    const gate = readGate(gatesDir, "stage-05-backend.json");
    assert.deepEqual(gate.approvals, ["dev-platform"]);
    assert.equal(gate.status, "PASS");
    assert.equal(gate.required_approvals, 1);
  });

  it("records CHANGES REQUESTED and keeps status FAIL", () => {
    write(
      path.join(reviewDir, "by-backend.md"),
      [
        "# Review by dev-backend",
        "",
        "## Review of frontend",
        "Token handling is off.",
        "BLOCKER: tokens stored in localStorage",
        "REVIEW: CHANGES REQUESTED",
        "",
      ].join("\n"),
    );

    run(tmpDir);

    const gate = readGate(gatesDir, "stage-05-frontend.json");
    assert.ok(gate, "gate file was not created");
    assert.deepEqual(gate.approvals, []);
    assert.equal(gate.changes_requested.length, 1);
    assert.equal(gate.changes_requested[0].reviewer, "dev-backend");
    assert.equal(gate.status, "FAIL");
  });

  it("handles multiple area sections in one review file", () => {
    write(
      path.join(reviewDir, "by-backend.md"),
      [
        "# Review by dev-backend",
        "",
        "## Review of frontend",
        "Looks fine.",
        "REVIEW: APPROVED",
        "",
        "## Review of platform",
        "Missing healthcheck on worker.",
        "BLOCKER: no healthcheck",
        "REVIEW: CHANGES REQUESTED",
        "",
      ].join("\n"),
    );

    run(tmpDir);

    const frontendGate = readGate(gatesDir, "stage-05-frontend.json");
    const platformGate = readGate(gatesDir, "stage-05-platform.json");

    assert.deepEqual(frontendGate.approvals, ["dev-backend"]);
    assert.equal(platformGate.changes_requested[0].reviewer, "dev-backend");
  });

  it("dedupes approvals from the same reviewer across re-runs", () => {
    const file = path.join(reviewDir, "by-frontend.md");
    write(
      file,
      [
        "## Review of backend",
        "REVIEW: APPROVED",
        "",
      ].join("\n"),
    );
    run(tmpDir);
    run(tmpDir); // run again — should not append dev-frontend twice

    const gate = readGate(gatesDir, "stage-05-backend.json");
    assert.deepEqual(gate.approvals, ["dev-frontend"]);
  });

  it("clears a prior CHANGES REQUESTED when the reviewer re-approves", () => {
    const file = path.join(reviewDir, "by-frontend.md");

    write(
      file,
      [
        "## Review of backend",
        "BLOCKER: wrong",
        "REVIEW: CHANGES REQUESTED",
        "",
      ].join("\n"),
    );
    run(tmpDir);
    let gate = readGate(gatesDir, "stage-05-backend.json");
    assert.equal(gate.changes_requested.length, 1);

    // Reviewer updates their verdict to APPROVED
    write(
      file,
      [
        "## Review of backend",
        "Fixed now.",
        "REVIEW: APPROVED",
        "",
      ].join("\n"),
    );
    run(tmpDir);

    gate = readGate(gatesDir, "stage-05-backend.json");
    assert.deepEqual(gate.approvals, ["dev-frontend"]);
    assert.deepEqual(gate.changes_requested, []);
  });

  it("ignores unknown area names", () => {
    write(
      path.join(reviewDir, "by-frontend.md"),
      [
        "## Review of something-made-up",
        "REVIEW: APPROVED",
        "",
      ].join("\n"),
    );

    run(tmpDir);

    const entries = fs.existsSync(gatesDir) ? fs.readdirSync(gatesDir) : [];
    assert.equal(entries.length, 0, "no gate should be written for unknown area");
  });

  it("ignores a REVIEW marker outside any '## Review of X' section", () => {
    write(
      path.join(reviewDir, "by-frontend.md"),
      [
        "# Review by dev-frontend",
        "REVIEW: APPROVED",
        "",
      ].join("\n"),
    );

    run(tmpDir);

    const entries = fs.existsSync(gatesDir) ? fs.readdirSync(gatesDir) : [];
    assert.equal(entries.length, 0, "no section header means no verdict");
  });

  it("parses security-engineer's review file correctly", () => {
    write(
      path.join(reviewDir, "by-security.md"),
      [
        "# Security review",
        "",
        "## Review of backend",
        "Auth is clean.",
        "REVIEW: APPROVED",
        "",
      ].join("\n"),
    );

    run(tmpDir);

    const gate = readGate(gatesDir, "stage-05-backend.json");
    assert.deepEqual(gate.approvals, ["security-engineer"]);
  });

  it("exits 0 with a WARN when a gate file is malformed JSON", () => {
    fs.mkdirSync(gatesDir, { recursive: true });
    fs.writeFileSync(
      path.join(gatesDir, "stage-05-backend.json"),
      "{ not valid json",
    );

    write(
      path.join(reviewDir, "by-frontend.md"),
      [
        "## Review of backend",
        "REVIEW: APPROVED",
        "",
      ].join("\n"),
    );

    const result = run(tmpDir);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /malformed/);
  });

  // ── Concurrency safeguards (v2.5.1+) ────────────────────────────────────

  it("leaves no .lock files after a successful run", () => {
    write(
      path.join(reviewDir, "by-frontend.md"),
      ["## Review of backend", "REVIEW: APPROVED", ""].join("\n"),
    );

    run(tmpDir);

    const lockFiles = fs.existsSync(gatesDir)
      ? fs.readdirSync(gatesDir).filter((f) => f.endsWith(".lock"))
      : [];
    assert.deepEqual(lockFiles, [], "lock files must be cleaned up");
  });

  it("leaves no .tmp.* files after a successful run", () => {
    write(
      path.join(reviewDir, "by-frontend.md"),
      ["## Review of backend", "REVIEW: APPROVED", ""].join("\n"),
    );

    run(tmpDir);

    const tmpFiles = fs.existsSync(gatesDir)
      ? fs.readdirSync(gatesDir).filter((f) => f.includes(".tmp."))
      : [];
    assert.deepEqual(tmpFiles, [], "temp files must be cleaned up");
  });

  it("recovers from a stale lock file left by a crashed process", () => {
    // Pre-create a stale lock — mtime in the past beyond LOCK_STALE_MS (5 s)
    fs.mkdirSync(gatesDir, { recursive: true });
    const lockPath = path.join(gatesDir, ".stage-05-backend.lock");
    fs.writeFileSync(lockPath, "99999"); // fake stale PID
    const pastTime = new Date(Date.now() - 10000); // 10 s ago
    fs.utimesSync(lockPath, pastTime, pastTime);

    write(
      path.join(reviewDir, "by-frontend.md"),
      ["## Review of backend", "REVIEW: APPROVED", ""].join("\n"),
    );

    run(tmpDir);

    const gate = readGate(gatesDir, "stage-05-backend.json");
    assert.ok(gate, "gate should be written despite the stale lock");
    assert.deepEqual(gate.approvals, ["dev-frontend"]);
    assert.equal(
      fs.existsSync(lockPath),
      false,
      "stale lock must be removed after run",
    );
  });

  // ── Stdin-based early exit (v2.5.1+) ────────────────────────────────────

  it("skips gate update when stdin says the written file is not a review file", () => {
    write(
      path.join(reviewDir, "by-frontend.md"),
      ["## Review of backend", "REVIEW: APPROVED", ""].join("\n"),
    );

    // Simulate a Write to src/backend/api.js — not a review file
    const stdin = hookContext(path.join(tmpDir, "src", "backend", "api.js"));
    const result = run(tmpDir, stdin);
    assert.equal(result.status, 0);

    // No gate should be written — the hook exited early
    const entries = fs.existsSync(gatesDir) ? fs.readdirSync(gatesDir) : [];
    assert.equal(entries.length, 0, "gate must not be written for a non-review file write");
  });

  it("processes gates when stdin says the written file is a review file", () => {
    const reviewFilePath = path.join(reviewDir, "by-frontend.md");
    write(
      reviewFilePath,
      ["## Review of backend", "REVIEW: APPROVED", ""].join("\n"),
    );

    const stdin = hookContext(reviewFilePath);
    const result = run(tmpDir, stdin);
    assert.equal(result.status, 0);

    const gate = readGate(gatesDir, "stage-05-backend.json");
    assert.ok(gate, "gate should be written when the review file is named in stdin");
    assert.deepEqual(gate.approvals, ["dev-frontend"]);
  });

  it("falls back to full scan when stdin is empty (manual invocation)", () => {
    write(
      path.join(reviewDir, "by-frontend.md"),
      ["## Review of backend", "REVIEW: APPROVED", ""].join("\n"),
    );

    // No stdinData — simulates running the hook directly from the shell
    const result = run(tmpDir);
    assert.equal(result.status, 0);

    const gate = readGate(gatesDir, "stage-05-backend.json");
    assert.ok(gate, "full scan fallback must still derive approvals");
    assert.deepEqual(gate.approvals, ["dev-frontend"]);
  });

  // ── Size caps (audit B-16) ──────────────────────────────────────────

  it("skips an oversized review file with a WARN", () => {
    const filePath = path.join(reviewDir, "by-frontend.md");
    fs.mkdirSync(reviewDir, { recursive: true });
    // Build a > 1 MB review file containing a real APPROVED marker; the
    // size check must reject before parseReviewFile sees the marker.
    fs.writeFileSync(
      filePath,
      "## Review of backend\nREVIEW: APPROVED\n" + "x".repeat(1_100_000),
    );

    const result = run(tmpDir, hookContext(filePath));
    assert.equal(result.status, 0);
    assert.match(result.stdout, /exceeds 1000000 bytes/);
    // Because the review wasn't parsed, no gate should have been written.
    assert.equal(
      fs.existsSync(path.join(gatesDir, "stage-05-backend.json")),
      false,
      "oversized review file must not result in a gate write",
    );
  });

  it("refuses to clobber an oversized existing gate file", () => {
    fs.mkdirSync(gatesDir, { recursive: true });
    const gatePath = path.join(gatesDir, "stage-05-backend.json");
    // A valid JSON gate, but oversized — the hook must not parse and
    // overwrite it.
    const oversize = {
      stage: "stage-05-backend",
      status: "FAIL",
      agent: "orchestrator",
      track: "full",
      timestamp: "2026-04-29T12:00:00Z",
      area: "backend",
      review_shape: "matrix",
      required_approvals: 2,
      approvals: [],
      changes_requested: [],
      escalated_to_principal: false,
      blockers: [],
      warnings: ["x".repeat(1_100_000)],
    };
    fs.writeFileSync(gatePath, JSON.stringify(oversize));
    const beforeBytes = fs.statSync(gatePath).size;

    write(
      path.join(reviewDir, "by-frontend.md"),
      ["## Review of backend", "REVIEW: APPROVED", ""].join("\n"),
    );

    const result = run(tmpDir, hookContext(path.join(reviewDir, "by-frontend.md")));
    assert.equal(result.status, 0);
    assert.match(result.stdout, /refusing to clobber/);
    // Gate left untouched.
    assert.equal(fs.statSync(gatePath).size, beforeBytes);
  });

  // ── B-23: structured-log mode ────────────────────────────────────────

  it("emits one JSON event line per gate update when LOG_FORMAT=json", () => {
    write(
      path.join(reviewDir, "by-frontend.md"),
      ["## Review of backend", "REVIEW: APPROVED", ""].join("\n"),
    );

    let result;
    try {
      const stdout = execFileSync("node", [HOOK], {
        cwd: tmpDir,
        encoding: "utf8",
        env: { ...process.env, LOG_FORMAT: "json" },
        stdio: ["pipe", "pipe", "pipe"],
      });
      result = { status: 0, stdout };
    } catch (err) {
      result = { status: err.status, stdout: err.stdout || "" };
    }

    assert.equal(result.status, 0);
    const jsonLine = result.stdout.split("\n").find((l) => l.startsWith("{"));
    assert.ok(jsonLine, `expected a JSON event line in stdout:\n${result.stdout}`);
    const event = JSON.parse(jsonLine);
    assert.equal(event.hook, "approval-derivation");
    assert.equal(event.event, "gate_updated");
    assert.equal(event.area, "backend");
    assert.equal(event.reviewer, "dev-frontend");
    assert.equal(event.verdict, "APPROVED");
    assert.match(event.ts, /^\d{4}-\d{2}-\d{2}T/);
  });

  it("emits no JSON when LOG_FORMAT is unset", () => {
    write(
      path.join(reviewDir, "by-frontend.md"),
      ["## Review of backend", "REVIEW: APPROVED", ""].join("\n"),
    );
    const result = run(tmpDir);
    assert.equal(result.status, 0);
    const jsonLines = result.stdout.split("\n").filter((l) => l.trim().startsWith("{"));
    assert.equal(jsonLines.length, 0, "no JSON lines should appear without LOG_FORMAT=json");
  });

  // ── Concurrency: two reviewers writing the same gate at once ────────

  it("two concurrent reviewer hooks both land in the same gate without corruption", async () => {
    // Pre-create both review files on disk so neither hook is racing the
    // file write itself; what we're stress-testing is the gate update.
    const frontendFile = path.join(reviewDir, "by-frontend.md");
    const platformFile = path.join(reviewDir, "by-platform.md");
    write(
      frontendFile,
      ["## Review of backend", "Looks good.", "", "REVIEW: APPROVED", ""].join("\n"),
    );
    write(
      platformFile,
      ["## Review of backend", "Smoke check passes.", "", "REVIEW: APPROVED", ""].join("\n"),
    );

    // Pre-create a matrix-shape gate (required_approvals: 2). The hook
    // increments approvals; we want to see both names land.
    fs.mkdirSync(gatesDir, { recursive: true });
    fs.writeFileSync(
      path.join(gatesDir, "stage-05-backend.json"),
      JSON.stringify({
        stage: "stage-05-backend",
        status: "FAIL",
        agent: "orchestrator",
        track: "full",
        timestamp: "2026-04-29T12:00:00Z",
        area: "backend",
        review_shape: "matrix",
        required_approvals: 2,
        approvals: [],
        changes_requested: [],
        escalated_to_principal: false,
        blockers: [],
        warnings: [],
      }, null, 2),
    );

    function spawnHook(stdinPayload) {
      return new Promise((resolve) => {
        const child = spawn("node", [HOOK], {
          cwd: tmpDir,
          stdio: ["pipe", "pipe", "pipe"],
        });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (chunk) => { stdout += chunk; });
        child.stderr.on("data", (chunk) => { stderr += chunk; });
        child.on("close", (code) => resolve({ status: code, stdout, stderr }));
        child.stdin.write(stdinPayload);
        child.stdin.end();
      });
    }

    const [first, second] = await Promise.all([
      spawnHook(hookContext(frontendFile)),
      spawnHook(hookContext(platformFile)),
    ]);

    assert.equal(first.status, 0, `first hook should exit clean: ${first.stderr}`);
    assert.equal(second.status, 0, `second hook should exit clean: ${second.stderr}`);

    // Gate JSON must be valid (no partial-write corruption).
    const gate = readGate(gatesDir, "stage-05-backend.json");
    assert.ok(gate, "gate file should still exist");

    // Both reviewers must appear in approvals — neither write should have
    // clobbered the other thanks to the lock + atomic temp-file rename.
    assert.equal(gate.approvals.length, 2, `expected 2 approvals, got ${JSON.stringify(gate.approvals)}`);
    assert.ok(gate.approvals.includes("dev-frontend"));
    assert.ok(gate.approvals.includes("dev-platform"));
    assert.equal(gate.changes_requested.length, 0);
    assert.equal(gate.status, "PASS", "gate should reach PASS once both approvals land");

    // Lock file must be cleaned up (whichever process held it last
    // released it in its finally block).
    const lockFile = path.join(gatesDir, "stage-05-backend.json.lock");
    assert.equal(
      fs.existsSync(lockFile),
      false,
      "lock file must be removed after the second hook exits",
    );
  });
});
