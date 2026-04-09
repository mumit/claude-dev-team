# Project Context

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

---

## Key Decisions (running log)
<!-- Principal appends when making significant technical decisions -->
