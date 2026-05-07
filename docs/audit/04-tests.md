# 04 — Test Health

## Coverage map

| Component | Tests | Type | Notes |
|---|---|---|---|
| `gate-validator.js` (hook + script) | 26 | unit + integration | Exit codes 0/1/2/3, escalation bypass, retry-integrity, lessons-learned format scan. Strong. |
| `approval-derivation.js` (hook + script) | 19 | unit + integration | Multi-area review parsing, dedup, stale-lock recovery, REVIEW marker handling, stdin early-exit. |
| `bootstrap.sh` / `bootstrap.js` | 23 | integration | Idempotency, framework overwrite, `.local.*` preservation, `CLAUDE.md` once-only, `.gitignore` dedup, structure. |
| `claude-team.js` CLI dispatcher | 59 | smoke + integration | All 23 slash commands tested for gate-scaffolding and track-field correctness. |
| Frontmatter (agents + skills) | 14 | unit | YAML schema, filename ↔ name match, required fields. |
| Contracts | 14 | unit + smoke | Framework completeness, gate↔stage alignment, track enum, draft-gate template, adapter presence, agent prompt min line count. |
| `security-heuristic.js` | 2 | unit | Path matching against default trigger patterns + docs skip. |
| `runbook-check.js` | 2 | unit | `## Rollback` and `## Health signals` presence. |
| `consistency.js`, `parity-check.js`, `pr-pack.js`, `release.js`, `lessons.js`, `roadmap.js`, `status.js`, `audit.js`, `summary.js` | 11 (combined) | unit + smoke | Each script has at least a happy-path test. |
| `examples/tiny-app/` end-to-end | 2 | integration | Pre/post-bootstrap `npm test`, real gate emission. |
| Simulated full pipeline | 1 | integration | Stage 1–9 lifecycle in a tmpdir. |
| `docs/build-presentation.js` | 1 | smoke | Syntax + (conditional) `.pptx` build. |

**Total:** ~265 assertions across 16 test files. Suite runs in ~9 s on a
fast laptop. CI matrix covers Node 20 and 22 on Linux. All tests pass.

## Untested or under-tested critical paths

### T-01 — `approval-derivation.js` concurrency under true parallelism — MEDIUM
Stale-lock recovery is tested (file lock 10 s old → reclaim). What is
**not** tested is the case both this audit and the v2.5.1 release notes
care about: two reviewer agents firing the hook simultaneously, the
second blocking on the lock, both approvals ultimately appearing in the
gate JSON.

**Suggested test:** Spawn two `child_process.spawn` calls in parallel,
each with a different review file in stdin context, both targeting the
same area gate. Assert (a) no JSON corruption, (b) both approvals present,
(c) lock file removed after second exit. ~30 LOC.

### T-02 — `security-heuristic.js` real-world trigger paths — MEDIUM
Two unit tests is too few for a function whose entire job is regex
matching against a list of patterns. There is no regression test that
e.g. `src/backend/auth/session.ts` triggers, that `Dockerfile` triggers
when adding a new service, that pure environment-only changes do not
trigger.

**Suggested test:** Table-driven test with 15–20 sample paths drawn from
the documented trigger list in `pipeline.md` Stage 4.5b, half expected to
trigger and half not. ~50 LOC, high signal.

### T-03 — `docs/build-presentation.js` has only a smoke test — LOW
934-LOC file, 10-commit churn hotspot, single test that runs `node
--check` and a conditional pptxgenjs build. No assertions on slide count,
brand colours, headings, or output structure. Defensible (it's a build
artefact for a deck), but if the deck regresses silently, no test fires.

**Suggested test:** After a successful build, parse the generated
`.pptx` (zip) and assert at least N slides and that the title slide
contains expected text. Or mock pptxgenjs and assert on the call graph.

### T-04 — Slash command ↔ agent linkage — LOW
CLI tests verify gate scaffolding, but they do not verify that
`/pipeline` actually references real agents that exist in
`.claude/agents/` or that slash command files reference skill names that
exist in `.claude/skills/`. A typo in a command file's frontmatter
(`agent: dev-platfrm`) would not be caught until a user ran the command
and Claude Code failed to resolve the agent.

**Suggested test:** Parse all command frontmatter for any `agent:`,
`skill:`, or `tools:` references; cross-check they exist on disk.

### T-05 — Adapter contract — LOW
One test asserts that 4 adapter files exist. No test asserts that each
adapter document contains the required sections that `dev-platform.md`
Stage 8 says it will read (e.g. a `## Smoke check` section).

**Suggested test:** Schema-lite check that each adapter has the standard
H2 sections; one extension or replacement of an adapter would otherwise
cause Stage 8 to fail at runtime, not at CI time.

### T-06 — Bootstrap without `rsync` on PATH — LOW
`bootstrap.sh` requires `rsync`. The test harness checks at the top and
skips if rsync is missing — which means CI on a runner without rsync
just doesn't run those tests. There is no test of the user-facing
behaviour (does the script print a helpful error?). Cross-platform
adoption risk is small but non-zero.

## Test quality issues

### Q-T-1 — `tests/smoke-presentation.test.js:38` conditional skip on missing dep
The test skips if `pptxgenjs` is not installed but does not assert the
syntactic-check still runs. If a future commit accidentally moves the
syntax check inside the skip block, neither path runs.

**Fix:** Split into two tests: an unconditional `node --check` test and
a conditional runtime build test. Confidence MEDIUM.

### Q-T-2 — `tests/approval-derivation.test.js` LOCK_STALE_MS is a magic number
The stale-lock test creates a 10-second-old lock and expects it to be
reclaimed; the hook hardcodes `LOCK_STALE_MS = 5000`. If the constant
ever changes in the hook and not the test (or vice versa), the test
will silently pass with stale assumptions.

**Fix:** Export `LOCK_STALE_MS` from the hook, import in the test,
parameterise the test fixture's mtime offset relative to it. Confidence
MEDIUM.

### Q-T-3 — CLI tests don't validate emitted gates against schemas
The CLI tests assert that gates have the right *fields*, but they do
not run those gates through `validateGateSchema()` from
`gate-validator.js`. A field with the wrong type (e.g. a number instead
of a string) would still pass.

**Fix:** Add one extra assertion per CLI test: `assert.strictEqual(...
validateGateSchema(emitted), null)`. ~5 lines per test in a shared
helper. Confidence LOW (latent bug, not active).

### Q-T-4 — No release-version consistency test
`scripts/release.js` is tested for happy path but no test asserts that
`VERSION`, `package.json`, and (where present) `.claude/config.yml`
ship the same version string after a release script run. A divergence
would currently slip through.

**Fix:** Add to `tests/release.test.js`: read all three files, assert
the same string. Confidence MEDIUM.

## Test infrastructure

| Item | Status |
|---|---|
| Runner | `node:test` (native, zero-dep) ✅ |
| Assertions | `node:assert/strict` ✅ |
| CI | `.github/workflows/test.yml`, Node 20 + 22 ✅ |
| Temp file cleanup | `fs.mkdtempSync` + `afterEach`/`finally` ✅ |
| Coverage tooling | none — acceptable; framework intentionally avoids deps |
| Mocking | minimal — tests prefer real fs/process invocation. Good for drift detection. |
| Test isolation | strong — no order dependency observed |

## What's well-tested (preserve patterns)

- **Gate state-machine coverage** in `gate-validator.test.js` is the
  best-tested file in the repo; treat it as the model for new schema
  features.
- **Stale-lock recovery** test in `approval-derivation.test.js` is a
  rare example of testing failure-recovery paths; replicate that style.
- **Bootstrap idempotency** test exercises the most-feared user
  scenario (re-running on an existing project) without external mocks.
- **Dogfood end-to-end** test (full pipeline 1–9 in tmpdir) is the
  smallest-feasible smoke test for a multi-stage system; preserve and
  extend.
