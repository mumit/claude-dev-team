const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { needsSecurityReview } = require("../scripts/security-heuristic");

// Table-driven coverage of DEFAULT_PATTERNS in scripts/security-heuristic.js.
// Adding or changing a pattern there should require a paired test row here so
// silent expansion or contraction of Stage 4.5b's trigger surface is caught.
//
// The documented Stage 4.5b list in .claude/rules/pipeline.md is broader than
// the current regex set (e.g. iam/firewall/certs/CI-secrets are mentioned but
// not yet matched). This test pins current behaviour; widening the regex is a
// separate concern.

describe("security-heuristic — needsSecurityReview", () => {
  // ── Positive cases — must trigger SECURITY_REVIEW ───────────────────
  const positives = [
    ["src/backend/auth/session.ts", "auth"],
    ["src/backend/crypto/cipher.js", "crypto"],
    ["src/backend/payment/processor.go", "payment"],
    ["src/backend/pii/anonymize.py", "pii"],
    ["lib/secrets/vault.rb", "secret"],
    ["src/api/oauth-token.ts", "token"],
    ["src/auth/credentials.ts", "credential"],
    ["Dockerfile", "dockerfile"],
    ["Dockerfile.dev", "dockerfile"],
    ["docker-compose.yml", "docker-compose"],
    ["docker-compose.prod.yml", "docker-compose"],
    ["src/infra/iam/policies.tf", "infra/"],
    ["package.json", "package.json"],
    ["package-lock.json", "package-lock.json"],
  ];

  for (const [filePath, label] of positives) {
    it(`triggers on ${label}: "${filePath}"`, () => {
      const matches = needsSecurityReview([filePath]);
      assert.equal(
        matches.length,
        1,
        `expected ${filePath} to trigger one match, got ${JSON.stringify(matches)}`,
      );
      assert.equal(matches[0], filePath);
    });
  }

  // ── Negative cases — must NOT trigger ─────────────────────────────
  const negatives = [
    "docs/README.md",
    "CHANGELOG.md",
    "src/frontend/components/Header.tsx",
    "src/backend/api/users.ts",
    "tests/unit/util.test.js",
    "eslint.config.js",
    ".github/workflows/test.yml", // mentioned in pipeline.md but not in current regex
    "examples/tiny-app/README.md",
    "infrastructure/notes.md", // /infra/ is path-anchored — top-level "infrastructure/" doesn't match
  ];

  for (const filePath of negatives) {
    it(`does not trigger on: "${filePath}"`, () => {
      const matches = needsSecurityReview([filePath]);
      assert.equal(
        matches.length,
        0,
        `expected ${filePath} not to match; got ${JSON.stringify(matches)}`,
      );
    });
  }

  // ── Edge cases ────────────────────────────────────────────────────
  it("returns an empty array for an empty input", () => {
    assert.deepEqual(needsSecurityReview([]), []);
  });

  it("returns each matching path exactly once even when multiple patterns hit", () => {
    // 'auth/secret-token-rotation/file.ts' matches /auth/, /secret/, /token/
    // The function returns paths (not pattern hits), so dedup is implicit.
    const filePath = "src/auth/secret-token-rotation/handler.ts";
    const matches = needsSecurityReview([filePath]);
    assert.deepEqual(matches, [filePath]);
  });

  it("returns only the matching subset when some paths trigger and others don't", () => {
    const input = [
      "docs/README.md", // no
      "src/backend/auth/login.ts", // yes
      "src/frontend/Home.tsx", // no
      "Dockerfile", // yes
      "tests/util.test.js", // no
    ];
    const matches = needsSecurityReview(input);
    assert.deepEqual(matches, ["src/backend/auth/login.ts", "Dockerfile"]);
  });
});
