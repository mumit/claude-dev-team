# 10 — Sequenced Roadmap

## Baseline

All 15 items from the prior cycle's Batches 1–4 are **DONE**. The previously-parked item #16 (YAML linting in CI) was unparked and completed in the April 2026 health-check. Two platform-blocked items (E2E pipeline test, agent consolidation) remain parked pending Claude Code feature support. This cycle's roadmap is therefore a maintenance-rhythm plan, not a catch-up plan.

Verification criteria used throughout:
- "Tests pass" means `npm test` green on Node 20 and 22.
- "CI green" means the GitHub Actions workflow completes without failure.
- Items that touch agent/skill files additionally require `npm run lint:frontmatter` (frontmatter validation) to pass.

---

## Batch 1 — Immediate (this week)

Seven XS-effort items. All self-contained, none blocking each other. Can land as one "quality-pass" PR or, if preferred, a small cluster of focused commits.

| # | Item | Effort | Parallel? | Verification |
|---|---|---|---|---|
| 1 | [DONE] Expand `CLAUDE.md` with repo-specific guidance | XS | Yes | File present at ~30 LOC; points to CONTRIBUTING.md |
| 2 | [DONE] Rename `lint:frontmatter` or add explanatory note | XS | Yes | `npm run test:frontmatter` (or documented script) works |
| 3 | [DONE] `bootstrap.sh` → `set -euo pipefail` | XS | Yes | `npm run test:integration` still passes |
| 4 | [DONE] Deny short-form + force-with-lease pushes | XS | Yes | `.claude/settings.json` deny list updated |
| 5 | [DONE] rsync preflight in `tests/bootstrap.test.js` | XS | Yes | Without rsync, test fails fast with clear message |
| 6 | [DONE] Heredoc `.gitignore` append in `bootstrap.sh` | XS | Yes | Integration test passes; fewer lines |
| 7 | [DONE] Seed-file warning header in `pipeline/context.md` | XS | Yes | Header visible at top of file |

**Completed**: 2026-04-17 across commits `22d3c38` (bootstrap hardening), `09b40f5` (docs and naming), `747e496` (deny list). All 98 tests green on Node 20 and 22.

**Estimated effort**: 1–2 hours total (single PR feasible).
**Infra changes**: None.
**Order**: All seven are independent. The sensible bundling is: items 3, 5, 6 in a "bootstrap hardening" commit; items 1, 2, 7 in a "docs and naming" commit; item 4 as its own commit (security-sensitive).
**Risks**: Item 2 (`lint:frontmatter` rename) could break external scripts or muscle memory. Recommend keeping the old name as an alias for a release cycle, or just adding the explanatory comment.

---

## Batch 2 — Weeks 1–2 (targeted improvements)

Seven items delivering specific user-facing value. Each makes sense as its own PR.

| # | Item | Effort | Depends on | Verification |
|---|---|---|---|---|
| 8 | [DONE] "Concepts" section in README or `docs/concepts.md` | S | None | One-paragraph definitions for agent / command / skill / rule / hook |
| 9 | [DONE] Top-level try/catch in `gate-validator.js` | S | None | New unit test: internal throw exits 0 with WARN message |
| 10 | [DONE] `npm audit --audit-level=high` in CI | XS–S | None | CI fails on introduced high/critical CVEs |
| 11 | [DONE] `macos-latest` in CI matrix | XS | Item 3 (bootstrap pipefail) landed | Matrix green on both runners |
| 12 | [DONE] Runtime smoke test for `build-presentation.js` | S | None | `BUILD_PRESENTATION_OUT` env var in builder; test runs end-to-end |
| 13 | [DONE] "Adding a new command / skill / agent" in CONTRIBUTING.md | S | Item 8 useful but not required | Prose present; copy-paste example works |
| 14 | [DONE] Tighten ESLint rules beyond `recommended` | S | None | `npm run lint` still green; small cleanup accepted if needed |

**Completed**: 2026-04-17. `docs/concepts.md` added and linked from README + CONTRIBUTING; `gate-validator.js` wrapped with internal-error catch (14 subtests now); CI matrix expanded to `{ubuntu-latest, macos-latest} × {Node 20, 22}` with `npm audit --audit-level=high` gate; smoke test builds a real .pptx via `BUILD_PRESENTATION_OUT`; CONTRIBUTING.md has full how-to sections; ESLint adds `eqeqeq`, `no-var`, `prefer-const`, `no-unused-vars`. All 100 tests green.

**Estimated effort**: 1–2 working days total if done serially.

**Parallelization**: Items 8, 10, 11, 13, 14 are independent and can be split across contributors / sessions. Item 9 touches gate-validator — coordinate with anyone else editing that file. Item 12 requires a minor change to `build-presentation.js` — isolated from the rest.

**Infra changes**: CI matrix grows to 2×2 (os × node). Expect ~2× runtime but no secrets or new dependencies.

**Risks**:
- Item 14 (ESLint) is the most likely to surface incidental cleanup in existing code. Scope carefully; a single rule that catches a real latent bug is a win, a rule that costs 2 hours of style edits is not.
- Item 12 depends on `sharp` installing cleanly on macOS in CI. It already does on Ubuntu; macOS should work but has been historically finicky.

---

## Batch 3 — Weeks 3–6 (strategic investments)

Three S/M items that are worth doing but aren't urgent.

| # | Item | Effort | Depends on | Mini-proposal |
|---|---|---|---|---|
| 15 | Gate-schema consistency test | S–M | None | Export the `required` field list from `gate-validator.js` as a module constant; write a test that parses the fenced JSON blocks in `.claude/rules/gates.md` and asserts every required field is present in each example. Guards against spec drift. |
| 16 | Phase-shape test for the `implement` skill | S | None | Assert `.claude/skills/implement/SKILL.md` contains each phase heading and references `npm test`. Small table-driven test. Extend later to `audit-phases.md` if valuable. |
| 18 | Presentation layout helpers + named constants | M | None | Extract `pageTemplate(pres, {title, subtitle, footer}, bodyBuilder)`. Introduce named constants (`MARGIN`, `CARD_W`, `TITLE_SIZE`). Run the script before and after; diff the PPTX by slide-count and layout checksum. Do only when the file is next touched — don't schedule as standalone. |

**Estimated effort**: 3–5 days if done serially.
**Infra changes**: None.
**Parallelization**: All three are independent. Item 18 is discretionary — skip entirely if nobody edits presentation slides in this window.

**Risks**:
- Item 15's refactor of the `required` list into a module constant is a breaking change for any external code that requires `gate-validator.js` — currently nothing does (it's only invoked as a CLI hook), so this is safe. Verify before landing.
- Item 18 is a layout refactor on a file with no visual regression tests. Mitigation: visual diff against the last generated PPTX.

---

## Batch 4 — Month 2+ (discretionary)

Two items that are worth having on the list but carry enough judgment or scope that they should wait.

| # | Item | Effort | Pre-requisites | Notes |
|---|---|---|---|---|
| 17 | `context.md` amplification guardrails | M | Batch 2 item 9 landed | Changes agent-context semantics. Requires design review (principal agent or human). Current mitigation (archive on `/reset`) already bounds growth; this tightens the prompt-injection surface. |
| 19 | Node coverage tool in CI | XS–S | None | `--experimental-test-coverage` in a separate `test:coverage` script; publish summary to CI log. Informational, not a quality gate. |

**Risks**:
- Item 17 is the most disruptive change on this roadmap. It touches orchestrator behavior and could regress Stage-3 (PM-question) flows. Don't pick it up without a deliberate design pass.
- Item 19 — the `node:test` coverage output format is experimental and may change between Node versions; pin the reported numbers informally, don't gate on them.

---

## Parked (carried forward)

| # | Item | Blocker | Revisit trigger |
|---|---|---|---|
| 20 | End-to-end pipeline test | Claude Code lacks `--dry-run` | CC ships a dry-run / recorded-agent mode |
| 21 | Dev-agent consolidation | Claude Code lacks `imports:` / `extends:` | CC adds shared-fragment support for agent frontmatter |
| 22 | Stage-5 gate write lock | Claude Code agents currently serialize file writes | CC documents or ships parallel write semantics |

---

## Roadmap Risks

1. **Claude Code platform drift**. The framework pins to CC semantics for hooks, agent frontmatter, and Agent Teams. A breaking change to any of these could require coordinated updates across `.claude/agents/*.md`, `.claude/settings.json`, and potentially `gate-validator.js`. Mitigation: CI runs the full test suite on every push; frontmatter validation catches schema drift at PR time.
2. **`sharp` CVE surface**. A critical native-binding CVE would require a devDep bump. With Batch 2 item 10 in place, CI surfaces this. Without it, the signal is a manual `npm audit`.
3. **Over-scoping Batch 2 item 14 (ESLint rules)**. Adding too many rules at once risks surfacing a large cleanup task. Start with 3–4 rules with high true-positive value; hold the magic-numbers rule for a scoped pass on `build-presentation.js` only.
4. **Batch 4 item 17 ambition**. Context-amplification mitigation is genuinely subtle — it sits at the intersection of security, observability, and agent context budget. Prefer to leave it parked until a concrete incident or a platform feature (e.g., CC memory scopes) makes the right design clearer.
5. **Re-sequencing triggers**:
   - A bug reported in `gate-validator.js` → elevate Batch 2 item 9 (try/catch wrapper) to immediate; add a regression test.
   - `sharp` or `pptxgenjs` release that breaks `node --check` but is caught by Batch 2 item 12 → keep the runtime smoke test; do not drop to syntax-only.
   - Claude Code ships `imports:` / `extends:` → unpark item 21 and plan a consolidation PR; do not attempt before the feature lands.

---

## Summary

| Batch | Window | Items | Effort total |
|---|---|---|---|
| 1 | This week | 7 | 1–2 hours |
| 2 | Weeks 1–2 | 7 | 1–2 days |
| 3 | Weeks 3–6 | 3 | 3–5 days |
| 4 | Month 2+ | 2 | Variable |
| Parked | — | 3 | — |

Total: **19 actionable items, 3 parked.** Nothing on this roadmap is urgent; the framework is in a maintain-and-refine phase.
