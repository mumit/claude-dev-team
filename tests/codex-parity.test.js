const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const CLAUDE_VALIDATOR = path.join(ROOT, "scripts", "gate-validator.js");

// Behavioural parity audit (B-25). Promotes the existing parity check from
// "same files exist" to "same gate JSON produces same validator exit code".
// Catches semantic drift across the two frameworks — e.g. if one repo
// accidentally widens the valid status enum, the other should reject the
// same input.
//
// SKIP if codex-dev-team is not present as a sibling directory: the test is
// only meaningful when both repos are co-located. Production CI runs the
// claude suite in isolation; this test is a developer-side cross-check.
const CODEX_ROOT = path.resolve(ROOT, "..", "codex-dev-team");
const CODEX_VALIDATOR = path.join(CODEX_ROOT, "scripts", "gate-validator.js");
const CODEX_PRESENT = fs.existsSync(CODEX_VALIDATOR);

function runValidator(validatorPath, cwd) {
  try {
    const stdout = execFileSync("node", [validatorPath], {
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

function setUpTmp() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "codex-parity-"));
  fs.mkdirSync(path.join(tmp, "pipeline", "gates"), { recursive: true });
  return tmp;
}

function writeGate(tmp, name, gate) {
  fs.writeFileSync(
    path.join(tmp, "pipeline", "gates", name),
    JSON.stringify(gate, null, 2),
  );
}

// Codex's validator enforces per-stage required fields (e.g. stage-01
// requires acceptance_criteria_count, out_of_scope_items,
// required_sections_complete); claude's validator only checks the base
// gate fields. To test behavioural parity on the SHARED semantics
// (status -> exit code), the fixtures include the stage-01-specific
// fields so both validators accept the same input.
function baseGate(overrides = {}) {
  return {
    stage: "stage-01",
    status: "PASS",
    agent: "pm",
    track: "full",
    timestamp: "2026-04-29T12:00:00Z",
    blockers: [],
    warnings: [],
    acceptance_criteria_count: 1,
    out_of_scope_items: [],
    required_sections_complete: true,
    ...overrides,
  };
}

describe("behavioural parity vs codex-dev-team", () => {
  let tmp;

  beforeEach(() => {
    tmp = setUpTmp();
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  // Each case asserts that both validators agree on the exit code for the
  // same gate JSON. Documented divergences (claude's 1 MB cap from B-16 and
  // EACCES handling from B-3) are intentionally NOT tested here — those are
  // claude-only hardenings that the audit elected to land first; codex may
  // adopt them later via its own audit.
  const cases = [
    {
      name: "valid PASS gate",
      gate: baseGate(),
      expectedStatus: 0,
    },
    {
      name: "valid FAIL gate",
      gate: baseGate({ status: "FAIL", blockers: ["test failure"] }),
      expectedStatus: 2,
    },
    {
      name: "valid ESCALATE gate",
      gate: baseGate({
        status: "ESCALATE",
        escalation_reason: "ambiguous spec",
      }),
      expectedStatus: 3,
    },
    {
      name: "gate missing required fields",
      gate: { status: "PASS", agent: "pm" }, // missing stage/track/timestamp/...
      expectedStatus: 1,
    },
  ];

  for (const c of cases) {
    it(`agrees on ${c.name}`, { skip: !CODEX_PRESENT && "codex-dev-team not present" }, () => {
      writeGate(tmp, "stage-01.json", c.gate);

      const claudeResult = runValidator(CLAUDE_VALIDATOR, tmp);
      const codexResult = runValidator(CODEX_VALIDATOR, tmp);

      assert.equal(
        claudeResult.status,
        c.expectedStatus,
        `claude expected ${c.expectedStatus}, got ${claudeResult.status}`,
      );
      assert.equal(
        codexResult.status,
        claudeResult.status,
        `behavioural parity broken for "${c.name}":\n` +
          `  claude exit=${claudeResult.status}\n` +
          `  codex  exit=${codexResult.status}\n` +
          `If claude has been deliberately hardened past codex, document` +
          ` the divergence in this test file.`,
      );
    });
  }

  it("malformed JSON produces same exit code on both", { skip: !CODEX_PRESENT && "codex-dev-team not present" }, () => {
    fs.writeFileSync(
      path.join(tmp, "pipeline", "gates", "stage-01.json"),
      "{ this is not valid json",
    );
    const claudeResult = runValidator(CLAUDE_VALIDATOR, tmp);
    const codexResult = runValidator(CODEX_VALIDATOR, tmp);
    assert.equal(claudeResult.status, 1);
    assert.equal(codexResult.status, claudeResult.status);
  });
});
