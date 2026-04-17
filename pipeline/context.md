# Project Context

<!--
  SEED FILE — this copy lives in the framework repo and is copied into target
  projects by bootstrap.sh on first install. Editing here changes the template
  for new installs; it is NOT the live pipeline context. The live file lives
  at pipeline/context.md in each target project.
-->

This file is append-only. All agents read it at spawn.
Never delete or overwrite existing entries.

---

## Brief Changes
<!-- PM appends here if brief is updated mid-pipeline -->

---

## Open Questions
<!-- Any agent can add: QUESTION: [text] @PM -->
<!-- PM responds: PM-ANSWER: [text] -->

---

## User Decisions
<!-- Orchestrator records user responses to escalations here -->

---

## Fix Log
<!-- Devs document root causes when fixing failing tests -->

2026-04-09 — Batch 1 (P0): Added package.json with npm test, .gitignore,
and 13-test suite for gate-validator.js. Addresses audit findings S1, S6,
Q11 (no .gitignore, unmanaged deps, no tests for critical hook).

2026-04-09 — Batch 2 (P1): Worktree cleanup in /reset and /pipeline,
Stage 3 in /status dashboard, bootstrap.sh portability (rsync + target
validation), lint output capture to pipeline/lint-output.txt.

2026-04-09 — Batch 3 (P2): Renamed /pipeline-status → /pipeline-context,
/reset now archives and regenerates context.md from template, added CI
workflow (.github/workflows/test.yml for Node 20+22), added CONTRIBUTING.md,
added 16 integration tests for bootstrap.sh (test:integration script).

2026-04-09 — Batch 4 (P3): Added stage duration expectations to pipeline
rules, added 66-assertion frontmatter schema validation tests for agents
and skills, refactored build-presentation.js from monolithic build() into
13 per-slide functions (slide XML verified byte-identical before/after).

2026-04-17 — Batch 1 (roadmap post-audit): 7 XS items. bootstrap.sh now
uses `set -euo pipefail` and a heredoc for .gitignore append; tests fail
fast with a clear message if rsync is missing. CLAUDE.md expanded from
a 5-line stub to ~30 LOC of repo guidance. `test:frontmatter` added as
a clearer alias for `lint:frontmatter`. pipeline/context.md got a SEED
FILE header. Deny list tightened against `git push -f` and
`--force-with-lease`. All 98 tests green on Node 20 and 22.

2026-04-17 — Batch 2 (roadmap P1): 7 S items. Added `docs/concepts.md`
primer and linked from README + CONTRIBUTING. Wrapped `gate-validator.js`
in a top-level try/catch (unexpected throws now log WARN and exit 0
instead of halting the pipeline; new 14th subtest covers this). CI
matrix expanded to `{ubuntu-latest, macos-latest} × {Node 20, 22}` with
`npm audit --audit-level=high` gate between install and test.
`build-presentation.js` honors `BUILD_PRESENTATION_OUT` env var; smoke
test now builds a real .pptx end-to-end. CONTRIBUTING.md gained
"Adding a new command / skill / agent" how-to with frontmatter
examples. ESLint tightened with `eqeqeq`, `no-var`, `prefer-const`,
`no-unused-vars`. All 100 tests green.

---

## Key Decisions (running log)
<!-- Principal appends when making significant technical decisions -->
