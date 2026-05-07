const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { ADAPTERS } = require("./_framework-contract");

const ROOT = path.resolve(__dirname, "..");

// Each adapter document is the contract dev-platform follows at Stage 8.
// Missing any of these sections risks a runtime ESCALATE rather than a CI
// failure — the audit's T-05 finding. The headings are matched flexibly to
// tolerate small spelling drift; an exact-match contract would force a
// normalisation pass on the existing files (e.g. "Smoke Test Results" vs
// "Smoke test results" vs "Smoke tests"), which is a separate concern.
const REQUIRED_SECTIONS = [
  { name: "Assumptions", re: /^##\s+Assumptions\b/im },
  { name: "Config", re: /^##\s+Config\b/im },
  { name: "Procedure", re: /^##\s+Procedure\b/im },
  { name: "Smoke test", re: /^##\s+smoke[\s_-]*tests?/im },
  { name: "Recovery procedure", re: /^##\s+Recovery procedure\b/im },
  { name: "Runbook hooks", re: /^##\s+Runbook hooks\b/im },
];

describe("adapter contract", () => {
  for (const name of ADAPTERS) {
    describe(`${name} adapter`, () => {
      const filePath = path.join(ROOT, ".claude", "adapters", `${name}.md`);
      const body = fs.existsSync(filePath)
        ? fs.readFileSync(filePath, "utf8")
        : "";

      it(`has an # Adapter: ${name} title`, () => {
        assert.ok(body.length > 0, `missing file: .claude/adapters/${name}.md`);
        assert.match(body, new RegExp(`^#\\s+Adapter:\\s+${name}\\b`, "im"));
      });

      for (const section of REQUIRED_SECTIONS) {
        it(`includes a "${section.name}" section`, () => {
          assert.match(
            body,
            section.re,
            `${name}.md missing required section: ${section.name}`,
          );
        });
      }
    });
  }
});
