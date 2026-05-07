# 09 — Synthesized Backlog

## Context for this cycle

The April 2026 health check closed all 18 items from the prior roadmap (15 DONE in Batches 1–4; 3 parked, of which #16 was subsequently unparked and completed). This audit therefore starts from a healthy baseline:

- `gate-validator.js` tested (13 subtests covering every exit path).
- `package.json` with pinned devDeps and a committed lockfile.
- CI matrix on Node 20/22 + rsync preinstalled.
- `CONTRIBUTING.md` present.
- `/reset` cleans orphaned worktrees and archives `context.md`.
- ESLint configured; frontmatter validation wired into `npm test`.
- `build-presentation.js` refactored into per-slide functions with JSDoc.

No critical or high-severity findings this cycle. The remaining work is polish, hardening, and a few targeted gaps — suitable for an ongoing maintenance rhythm rather than a crash project.

---

## Cross-Cutting Themes

### Theme A — Harden the orchestrator's trust boundaries

The pipeline's single point of control (`gate-validator.js`) is well-tested for shape but not fully defensive: it has no top-level try/catch, the gates-directory enumeration can throw on filesystem errors, and gate fields are concatenated into log output without escaping. Additionally, the `deny` list in `.claude/settings.json` has narrow pattern gaps (short-form `-f`, force-with-lease). These are all Low severity individually but collectively define the blast radius when something unexpected happens.

### Theme B — Contributor UX refinement

`CONTRIBUTING.md` exists but `CLAUDE.md` remains near-empty. Newcomers get no "Concepts" primer that distinguishes commands / skills / rules / agents / hooks in one place. Small scripts have misleading names (`lint:frontmatter` runs a test). These are all small writes with real onboarding leverage.

### Theme C — Close the monitoring loop on dependencies

`sharp` and friends are pinned and lockfile-committed, but CVEs aren't watched: `npm audit` isn't run in CI. macOS isn't in the CI matrix, so bootstrap portability to BSD rsync is verified only by contributor goodwill.

### Theme D — Lift tests from shape-only to behavior-only where they are weakest

`smoke-presentation.test.js` is a `node --check` syntax check — near-tautological. Rules-file prose and skill phase definitions have no tests. These are drift vectors: a structural change in `gates.md` or `pipeline.md` won't fail any test until a pipeline run hits the mismatch.

### Theme E — Light polish on the presentation outlier

`build-presentation.js` (686 LOC) is already post-refactor and JSDoc'd. The remaining work — per-slide boilerplate reduction, named constants for magic coordinates, and a heredoc cleanup in `bootstrap.sh` — is low-leverage but cheap when touched.

---

## Prioritized Backlog

### P0 — Fix now

*(None. The codebase has no bleeding-wound issues.)*

---

### P1 — Quick wins (XS/S effort, self-contained)

**1. Expand `CLAUDE.md` with repo-specific guidance**
- Theme: B
- Description: Add ~30 lines to `CLAUDE.md` explaining that this repo is the framework itself (no target-project code lives here), pointing to `CONTRIBUTING.md`, requiring Conventional Commits, and noting that no runtime dependencies should be added. Currently the file is 5 lines of placeholder boilerplate.
- Affected: `CLAUDE.md`
- Effort: **XS** | Risk of change: Low | Risk of not changing: Low-Medium (contributor orientation cost compounds) | Confidence: HIGH

**2. Rename `lint:frontmatter` script or add explanatory comment**
- Theme: B
- Description: `npm run lint:frontmatter` is `node --test tests/frontmatter.test.js`. The `lint:*` namespace is misleading. Either rename to `test:frontmatter` for consistency with `test:integration`, or add a trailing `// lint:frontmatter is a test alias` note in `package.json` and the README.
- Affected: `package.json`, README section if the script is mentioned
- Effort: **XS** | Risk: Low (may break external calls) | Risk of not changing: Low | Confidence: MEDIUM

**3. Harden `bootstrap.sh` with `set -u` and `pipefail`**
- Theme: A
- Description: Change `set -e` to `set -euo pipefail`. Catches unset-variable typos and pipe failures (not relevant today — there are no pipes — but future-proofs modifications). One-line change.
- Affected: `bootstrap.sh:21`
- Effort: **XS** | Risk: Low (verify with `npm run test:integration`) | Risk of not changing: Low | Confidence: HIGH

**4. Plug short-form and `--force-with-lease` gaps in deny list**
- Theme: A
- Description: `.claude/settings.json` denies `git push --force *` and `git push origin main *` but not `git push -f *` or `git push *--force-with-lease*`. Add both patterns. The settings deny-list is the final guard against a prompt-injected or hallucinated destructive push.
- Affected: `.claude/settings.json`
- Effort: **XS** | Risk: Low | Risk of not changing: Low (probability low; blast radius high) | Confidence: HIGH

**5. Add rsync preflight to `tests/bootstrap.test.js`**
- Theme: D
- Description: Detect missing `rsync` at the top of the test file; if absent, fail fast with `assert.fail('rsync not installed; see CONTRIBUTING.md')` instead of letting ~17 subtests produce opaque assertion traces. Same information, much clearer signal.
- Affected: `tests/bootstrap.test.js`
- Effort: **XS** | Risk: Low | Risk of not changing: Low (documented; only poor UX) | Confidence: HIGH

**6. Convert `.gitignore` append block in `bootstrap.sh` to a heredoc**
- Theme: E
- Description: Replace the 18-line `echo "..." >> "$TARGET/.gitignore"` sequence with a single `cat >> ... <<'EOF' ... EOF` heredoc. Atomic write, easier to read.
- Affected: `bootstrap.sh:110-132`
- Effort: **XS** | Risk: Low (existing integration test covers this path) | Risk of not changing: Low | Confidence: HIGH

**7. Add a seed-file warning header to `pipeline/context.md`**
- Theme: A
- Description: Prepend a commented line/section to the repo's tracked `pipeline/context.md` that says "This is the framework seed file; do not commit customer or project-specific data here." Prevents a contributor who runs `/pipeline` against this repo from inadvertently committing business details.
- Affected: `pipeline/context.md`
- Effort: **XS** | Risk: Low | Risk of not changing: Low | Confidence: MEDIUM

---

### P2 — Targeted improvements (S/M effort, specific benefit)

**8. Add a "Concepts" section to README or `docs/concepts.md`**
- Theme: B
- Description: One-sentence definitions for each of: agent, command, skill, rule, hook. Resolves the persistent onboarding question. Link from README's existing structure; no new top-level doc required. If chosen as a separate file, link from README and CONTRIBUTING.md.
- Affected: `README.md` (new section) or new `docs/concepts.md`
- Effort: **S** | Risk: Low | Risk of not changing: Medium (persistent onboarding gap) | Confidence: HIGH

**9. Wrap `gate-validator.js` body in a top-level try/catch**
- Theme: A
- Description: Currently a thrown exception inside the validator causes a non-zero hook exit, which the orchestrator sees as a gate signal. Add a top-level catch that prints `[gate-validator] internal error: <msg>; treating as PASS` and exits 0. Trade-off: masks bugs in the validator itself from the orchestrator; mitigated by CI running the full test suite on every PR.
- Affected: `.claude/hooks/gate-validator.js`, add a test that asserts an internal throw still exits 0 with a WARN message
- Effort: **S** | Risk: Low (tested) | Risk of not changing: Low (probability low, pipeline-wide blast radius if hit) | Confidence: HIGH

**10. Wire `npm audit --audit-level=high` into CI**
- Theme: C
- Description: Add a `npm audit --audit-level=high` step to `.github/workflows/test.yml` between `npm install` and `npm test`. Fails the build on high or critical CVEs in devDeps. `sharp` is the most interesting dep to watch.
- Affected: `.github/workflows/test.yml`, possibly `package.json` (`audit` script)
- Effort: **XS–S** | Risk: Low (CI-only) | Risk of not changing: Low-Medium (unmonitored native dep) | Confidence: HIGH

**11. Add `macos-latest` to CI matrix**
- Theme: C
- Description: Extend `.github/workflows/test.yml` matrix to `os: [ubuntu-latest, macos-latest]`. Verifies `bootstrap.sh` + bootstrap tests against BSD rsync. `ubuntu` already covered; macOS is the other primary contributor environment.
- Affected: `.github/workflows/test.yml`
- Effort: **XS** | Risk: Low (one matrix line) | Risk of not changing: Low (works today; drift possible) | Confidence: HIGH

**12. Upgrade `smoke-presentation.test.js` from syntax-only to runtime**
- Theme: D
- Description: Add a `--dry-run` or `--out <path>` flag to `build-presentation.js` (or honor an env var like `BUILD_PRESENTATION_OUT=/tmp/x.pptx`). Update the test to run the builder end-to-end, assert exit 0 and output-file-size > 0. Catches dep-compatibility regressions the current syntax check misses.
- Affected: `docs/build-presentation.js`, `tests/smoke-presentation.test.js`
- Effort: **S** | Risk: Low-Medium (full runtime; native deps must install on CI runners — already the case) | Risk of not changing: Low | Confidence: MEDIUM

**13. Extend `CONTRIBUTING.md` with "Adding a new command / skill / agent" how-to**
- Theme: B
- Description: Three short sections (~40-60 lines total): required frontmatter, file location, how to test, common pitfalls. Closes the remaining onboarding gap identified in `05-documentation.md`.
- Affected: `CONTRIBUTING.md`
- Effort: **S** | Risk: Low | Risk of not changing: Low-Medium | Confidence: HIGH

**14. Tighten ESLint rules beyond `recommended`**
- Theme: A, D
- Description: Add opinionated-but-minimal rules that surface the documented code-conventions: `eqeqeq: 'error'`, `no-var: 'error'`, `prefer-const: 'warn'`, `no-unused-vars` set to `error` for args/vars, a quote-style rule if the team picks one. Optional: `no-magic-numbers` with `ignore: [0, 1, -1]` scoped to `docs/build-presentation.js` if ready to bite.
- Affected: `eslint.config.js`, possibly a small round of cleanup in `build-presentation.js` or tests
- Effort: **S** | Risk: Low-Medium (existing code may need small edits) | Risk of not changing: Low | Confidence: MEDIUM

---

### P3 — Strategic (M/L effort, architectural)

**15. Add a schema-consistency test that cross-checks `gates.md` against `gate-validator.js`**
- Theme: D
- Description: Write a test that parses gate-schema examples from `.claude/rules/gates.md`, validates them against the same required-field list the validator enforces, and asserts they match. Guards against documentation drift. One-file addition (`tests/gate-schema-consistency.test.js`).
- Affected: new `tests/gate-schema-consistency.test.js`, possibly a small refactor of `gate-validator.js` to export its required-fields list
- Effort: **S–M** | Risk: Low | Risk of not changing: Low | Confidence: MEDIUM

**16. Add a phase-shape test for the `implement` skill**
- Theme: D
- Description: Assert that `.claude/skills/implement/SKILL.md` contains specific section headings (Understand / Plan / Build / Verify / Commit) and references `npm test`. Prevents silent skill drift. Same pattern could apply to `audit-phases.md` (assert each phase has its expected subsections).
- Affected: new `tests/skill-shape.test.js`
- Effort: **S** | Risk: Low | Risk of not changing: Low | Confidence: LOW

**17. Reduce `context.md` amplification risk**
- Theme: A
- Description: Introduce a soft size cap on `pipeline/context.md` (e.g., warn in `/pipeline-context` if >8 KB), or require the orchestrator to summarize rather than concatenate PM Q&A entries. Mitigates the prompt-injection amplification vector (see `06-security.md` S12). Requires design judgment — there's a trade-off against losing full audit trail.
- Affected: `.claude/rules/orchestrator.md`, `/reset`, `/pipeline-context`
- Effort: **M** | Risk: Medium (changes agent-context semantics) | Risk of not changing: Low (probability low) | Confidence: LOW

**18. Extract more layout helpers and named constants in `build-presentation.js`**
- Theme: E
- Description: Introduce `pageTemplate(pres, {title, subtitle, footer}, bodyBuilder)` and named constants for recurring coordinates (margin, card width, title size). Each slide function becomes 20–40 LOC of data + body callback. Cheap when the file is next touched; don't schedule as standalone work.
- Affected: `docs/build-presentation.js`
- Effort: **M** | Risk: Medium (layout regression) | Risk of not changing: Low (rarely edited) | Confidence: MEDIUM

**19. Enable `--experimental-test-coverage` in CI**
- Theme: D
- Description: Turn on Node's built-in coverage in the test step; publish the summary to the CI job log. Establishes a coverage number for the record (current coverage is inferred). Optional — not blocking any quality goal.
- Affected: `package.json` test script (or a separate `test:coverage` script), CI step
- Effort: **XS–S** | Risk: Low | Risk of not changing: Low | Confidence: LOW

---

### Parked

**[PARKED] 20. End-to-end pipeline test**
- Blocked by Claude Code lacking a `--dry-run` or test mode. A full pipeline as an automated test would require a live Claude Code instance and significant token cost. Carried forward from prior cycles.

**[PARKED] 21. Consolidate duplicate content across dev-agent files**
- Blocked by Claude Code not supporting `imports:` / `extends:` in agent frontmatter. The three dev agents must remain self-contained. Carried forward.

**[PARKED] 22. Stage-5 gate write lock**
- Theoretical race if Stage-5 reviewers ever write truly in parallel. Agent Teams is currently sequential per Claude Code's implementation, so there's no observable bug. Revisit if Claude Code parallelizes subagent file writes.

---

## Severity & Effort Distribution

| Priority | Count | Effort mix |
|---|---|---|
| P0 | 0 | — |
| P1 | 7 | 7× XS |
| P2 | 7 | 3× XS/S, 4× S |
| P3 | 5 | 2× S, 2× M, 1× XS/S |
| Parked | 3 | Platform-blocked |

Total active items: **19** (down from 18 in prior cycle — the prior cycle's items are mostly DONE; these are new or refined findings).

Nothing here is a crisis. This reads as a healthy framework's month-two maintenance list: cheap wins, targeted monitoring adds, a couple of discretionary investments, and a small parked queue waiting on Claude Code platform capabilities.
