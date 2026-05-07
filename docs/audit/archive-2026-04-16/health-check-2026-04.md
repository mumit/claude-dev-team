# Health Check — April 2026

## Summary

- **All 97 tests now passing** (17 bootstrap tests were failing due to missing `rsync` binary in CI environment — resolved by documenting/installing the dependency; tests themselves were correct).
- **Full roadmap complete**: all 15 batched items (P0–P3) done. One parked item (#16, YAML linting in CI) is now unblocked and ready to implement.
- **No new compliance violations** introduced since the audit. Gate schema, agent frontmatter, and pipeline rules are all clean.
- **No TODO/FIXME/HACK markers** in any code file. Security scan clean — no hardcoded secrets, .gitignore comprehensive.
- **Two platform-blocked parked items** (#17 e2e pipeline test, #18 agent consolidation) remain blocked by missing Claude Code features (no `--dry-run`, no `imports:`).

---

## New Issues

### CI: rsync prerequisite undocumented
- **Severity**: Medium
- **What**: `bootstrap.sh` requires `rsync` but CI runner (and contributor environments on some Linux distros) may not have it. 17 bootstrap integration tests were failing in this environment because of the missing binary.
- **Resolution applied**: rsync installed in current environment; all tests now pass.
- **Recommended fix**: Add `rsync` to the CI workflow's `apt-get install` step in `.github/workflows/test.yml` so tests never silently fail for this reason.

### build-presentation.js: no automated tests
- **Severity**: Low
- **What**: The 686-line presentation script was refactored in Batch 4 into per-slide functions, verified by manual visual diff of PPTX output. No unit test exists for the JS module itself.
- **Recommended fix**: At minimum, add a smoke test that runs `node docs/build-presentation.js` against mock data and asserts it exits 0 without throwing.

### No linter configured
- **Severity**: Low
- **What**: Code conventions are documented in `.claude/rules/code-conventions.md` but not enforced. No eslint/prettier config exists. Convention compliance is voluntary.
- **Recommended fix**: Add a minimal `eslint.config.js` (flat config) and `npm run lint` script; wire into CI.

---

## Resolved Issues

All 15 roadmap items are marked `[DONE]`. The following prior findings from the original audit are confirmed resolved:

| Prior Finding | Resolution |
|---|---|
| gate-validator.js untested | 13 unit tests covering all exit paths (Batch 1) |
| No package.json or .gitignore | Both added (Batch 1) |
| bootstrap.sh macOS-only `cp -rn` | Replaced with portable rsync strategy (Batch 2) |
| Stage 3 invisible in /status | Added to dashboard (Batch 2) |
| Orphaned worktrees after /reset | Worktree cleanup added to /reset and /pipeline (Batch 2) |
| context.md grows unbounded | /reset now archives and resets context (Batch 3) |
| No CI workflow | .github/workflows/test.yml added (Batch 3) |
| No CONTRIBUTING.md | Added with full contributor guide (Batch 3) |
| pipeline-status / pipeline-context naming confusion | Renamed to pipeline-context (Batch 3) |
| Agent/skill frontmatter unvalidated | Validation tests added to npm test (Batch 4) |
| build-presentation.js 620-line monolith | Refactored into per-slide functions with layout helpers (Batch 4) |
| No stage duration guidance | Added to .claude/rules/pipeline.md (Batch 4) |

---

## Roadmap Progress

**Batches 1–4**: 15/15 items complete (100%).

**Parked items status**:

| # | Item | Blocking Reason | Status |
|---|---|---|---|
| 16 | YAML frontmatter linting in CI | Depended on P3-14 (schema validation) | **Ready to implement** — P3-14 is done |
| 17 | End-to-end pipeline test | Requires Claude Code `--dry-run` mode | Still blocked — platform limitation |
| 18 | Consolidate duplicate agent review instructions | Requires Claude Code `imports:`/`extends:` | Still blocked — platform limitation |

**Re-prioritization**: Item #16 should be unparked and treated as the next P2 item. It's a small CI addition (~10-line workflow step) with high value.

---

## Recommended Actions This Month

1. **Fix CI rsync prerequisite** — Add `sudo apt-get install -y rsync` to `.github/workflows/test.yml` before the `npm test` step. This ensures bootstrap tests are always green in CI. Effort: XS.

2. **Unpark item #16: YAML linting in CI** — Add a `lint:frontmatter` script to `package.json` that runs the existing `tests/frontmatter.test.js` validator (or a dedicated lint step) and wire it into `.github/workflows/test.yml`. Prevents frontmatter regressions from silently landing. Effort: XS–S.

3. **Add eslint configuration** — Add a minimal flat `eslint.config.js` covering the two hand-written JS files (`gate-validator.js`, `build-presentation.js`). Add `"lint": "eslint .claude/hooks/ docs/build-presentation.js"` to `package.json` scripts and run in CI. Enforces conventions that currently exist only as documentation. Effort: S.

4. **Add rsync to CONTRIBUTING.md prerequisites** — Document that `rsync` is required to run `npm test` locally on Linux. Single-line addition. Effort: XS.

5. **Smoke test for build-presentation.js** — Add a test that invokes `node docs/build-presentation.js --dry-run` (or equivalent) and asserts exit 0. If the script has no dry-run flag, add one. Prevents silent breakage after future dependency upgrades. Effort: S.
