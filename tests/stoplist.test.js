const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  STOPLIST_PATTERNS,
  findStoplistMatches,
  checkStoplist,
} = require("../scripts/stoplist");

const ROOT = path.resolve(__dirname, "..");
const SCRIPT = path.join(ROOT, "scripts", "claude-team.js");

describe("stoplist patterns", () => {
  // Each row: [input, shouldMatch, optional expected category name]
  const cases = [
    // Authentication
    ["add user authentication", true, "authentication"],
    ["fix login redirect", true, "authentication"],
    ["jwt expiry tweak", true, "authentication"],
    ["fix session timeout", true, "authentication"],

    // Credentials / secrets
    ["rotate api key for stripe", true, "credentials"],
    ["password reset email copy", true, "credentials"],

    // Crypto
    ["switch encryption from AES-128 to AES-256", true, "cryptography"],
    ["add hmac signing to webhooks", true, "cryptography"],

    // PII / payments
    ["scrub PII from logs", true, "pii-and-regulated-data"],
    ["add billing address to checkout", true, "payments"],

    // Migrations
    ["add a database migration for new column", true, "migrations"],
    ["alter table users add deleted_at", true, "migrations"],

    // Feature flags
    ["introduce feature flag for new dashboard", true, "feature-flags"],

    // Negative cases — must NOT match
    ["fix typo in README", false],
    ["update copy on the empty state", false],
    ["upgrade lodash to 4.17.21", false],
    ["fix production checkout timeout", false], // "checkout" must not match payments
    ["restart the dev server on file change", false],
    ["adjust default page size", false],
    ["rename a util function", false],
  ];

  for (const [input, shouldMatch, category] of cases) {
    it(`${shouldMatch ? "matches" : "ignores"}: "${input}"`, () => {
      const matches = findStoplistMatches([input]);
      if (shouldMatch) {
        assert.ok(matches.length > 0, `expected ${input} to match`);
        if (category) {
          assert.ok(
            matches.some((m) => m.name === category),
            `expected category ${category}, got ${matches.map((m) => m.name).join(", ")}`,
          );
        }
      } else {
        assert.equal(
          matches.length,
          0,
          `expected ${input} not to match; got: ${matches
            .map((m) => `${m.name}=${m.matched}`)
            .join(", ")}`,
        );
      }
    });
  }

  it("dedupes repeated matches across multiple candidates", () => {
    const matches = findStoplistMatches(["add login", "fix login bug"]);
    // Both inputs match the same authentication pattern on "login"; should
    // surface as one entry, not two.
    const authMatches = matches.filter((m) => m.name === "authentication");
    assert.equal(authMatches.length, 1);
  });

  it("STOPLIST_PATTERNS each have a name and a regex", () => {
    for (const p of STOPLIST_PATTERNS) {
      assert.equal(typeof p.name, "string");
      assert.ok(p.name.length > 0);
      assert.ok(p.re instanceof RegExp);
    }
  });
});

describe("stoplist gather", () => {
  it("returns empty matches when description is benign and cwd has no git", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "stoplist-"));
    try {
      const matches = checkStoplist({
        description: "fix typo in README",
        cwd: tmp,
      });
      assert.equal(matches.length, 0);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("matches the description even when cwd has no git history", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "stoplist-"));
    try {
      const matches = checkStoplist({
        description: "add password reset flow",
        cwd: tmp,
      });
      assert.ok(matches.length > 0);
      assert.ok(matches.some((m) => m.name === "credentials"));
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe("claude-team CLI: stoplist enforcement", () => {
  function runCLI(args, cwd) {
    return spawnSync(process.execPath, [SCRIPT, ...args], {
      cwd,
      encoding: "utf8",
    });
  }

  it("/quick rejects a stoplist-matching description", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "stoplist-cli-"));
    try {
      // Provide minimal scaffolding so claude-team doesn't fail before the
      // stoplist check; it runs at the top of runTrack.
      fs.writeFileSync(
        path.join(tmp, "package.json"),
        JSON.stringify({ scripts: {} }),
      );
      const result = runCLI(["quick", "add user authentication"], tmp);
      assert.equal(result.status, 2);
      assert.match(result.stderr, /safety stoplist/i);
      assert.match(result.stderr, /authentication/);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("/quick proceeds past the stoplist when --force is passed", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "stoplist-cli-"));
    try {
      fs.writeFileSync(
        path.join(tmp, "package.json"),
        JSON.stringify({ scripts: {} }),
      );
      const result = runCLI(["quick", "add user authentication", "--force"], tmp);
      // Past the stoplist guard, runTrack proceeds to scaffold; success
      // depends on the rest of the dispatcher running cleanly in the tmpdir.
      // We only assert that the stoplist did not block (no exit-2 message).
      assert.notEqual(result.status, 2);
      assert.doesNotMatch(result.stderr, /safety stoplist/i);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("/hotfix is exempt from the stoplist", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "stoplist-cli-"));
    try {
      fs.writeFileSync(
        path.join(tmp, "package.json"),
        JSON.stringify({ scripts: {} }),
      );
      const result = runCLI(
        ["hotfix", "Login endpoint returning 500 on valid creds"],
        tmp,
      );
      // Hotfix must not be blocked by stoplist — it's the exact scenario
      // hotfix exists for. Verify no exit-2 with stoplist message.
      assert.notEqual(result.status, 2);
      assert.doesNotMatch(result.stderr, /safety stoplist/i);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
