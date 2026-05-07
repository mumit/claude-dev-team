const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = path.resolve(__dirname, "..");

function sha256(relativePath) {
  const buf = fs.readFileSync(path.join(ROOT, relativePath));
  return crypto.createHash("sha256").update(buf).digest("hex");
}

const PAIRS = [
  [".claude/hooks/gate-validator.js", "scripts/gate-validator.js"],
  [".claude/hooks/approval-derivation.js", "scripts/approval-derivation.js"],
];

describe("hook parity", () => {
  for (const [hookPath, scriptPath] of PAIRS) {
    it(`${hookPath} matches ${scriptPath} byte-for-byte`, () => {
      const hookHash = sha256(hookPath);
      const scriptHash = sha256(scriptPath);
      assert.equal(
        hookHash,
        scriptHash,
        `${hookPath} and ${scriptPath} must stay byte-identical — ` +
          `the harness loads the hook copy, claude-team.js loads the script copy, ` +
          `and the framework relies on identical behaviour from both. ` +
          `Sync the files (typically: copy whichever was edited over the other).`
      );
    });
  }
});
