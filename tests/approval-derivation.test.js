const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
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

function run(cwd) {
  try {
    const stdout = execFileSync("node", [HOOK], {
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
});
