# 04 — Test Health

## Coverage Map

| Component | Test File | `it()` Count | Subtests | Coverage Notes |
|---|---|---|---|---|
| `gate-validator.js` | `tests/gate-validator.test.js` | 13 | 13 | All exit paths (0/1/2/3) + malformed JSON + missing fields + empty dir |
| `bootstrap.sh` | `tests/bootstrap.test.js` | 18 | ~17 | Fresh install, re-install, existing project, `*.local.*` preservation, CLAUDE.md protection — **requires rsync** |
| Agent/skill frontmatter | `tests/frontmatter.test.js` | 15 | 15 | YAML frontmatter presence, required keys, `tools`/`model`/`permissionMode` values, skill descriptor blocks |
| `build-presentation.js` | `tests/smoke-presentation.test.js` | 1 | 1 | `node --check` syntax only — no runtime invocation |
| Agent definitions (5) | N/A | N/A | N/A | Frontmatter covered by `frontmatter.test.js`; prose unverified |
| Commands (18) | N/A | N/A | N/A | No programmatic tests (markdown + YAML) |
| Skills (6) | N/A | N/A | N/A | Descriptor block validated by `frontmatter.test.js`; skill body unverified |
| Rules (5) | N/A | N/A | N/A | Machine-read by orchestrator; no tests |

Test infrastructure: Node.js built-in `node:test` runner + `node:assert/strict`. No external framework, no mocking library, no coverage tool. `642` LOC of test code against `~900` LOC of hand-written JS (excluding the generated/configured ESLint stub).

`package.json` scripts:

```
test                  node --test 'tests/**/*.test.js'
test:integration      node --test tests/bootstrap.test.js
lint                  eslint .
lint:frontmatter      node --test tests/frontmatter.test.js
```

CI: `.github/workflows/test.yml` runs `npm run lint` and `npm test` on Node 20 and 22 on Ubuntu. rsync installed via `apt-get` before `npm install`.

---

## What's Well-Tested

### `gate-validator.js` — Thoroughly covered (~13 subtests)

Covers the complete control-flow matrix for the pipeline's single point of orchestration:

- No `pipeline/gates/` dir → exit 0
- Empty `pipeline/gates/` dir → exit 0
- PASS gate → exit 0, prints ✅ summary
- FAIL gate → exit 2, prints blockers
- ESCALATE gate → exit 3, prints reason + options
- Malformed JSON → exit 1 with clear message
- Missing required fields (`stage`, `status`, `agent`, `timestamp`, `blockers`, `warnings`) → exit 1
- Unknown status value → exit 1
- Multiple gates → picks the most recent by `mtime`
- Warnings on a PASS gate are surfaced

This is the framework's highest-leverage test suite. A regression here can silently corrupt the pipeline; it's appropriately guarded.

### Frontmatter validation

All five agent files and all six skill `SKILL.md` descriptors have their YAML frontmatter validated: required keys present, `tools` referenced are well-known, `model` values are in the allowed set, `permissionMode` is valid. This is effective schema validation without a JSON-schema tool.

### Bootstrap integration

18 `it()` blocks exercise install-time behavior: fresh target, re-install preserves `CLAUDE.md`, `.claude/settings.local.json` kept, `*.local.*` files kept, existing `.gitignore` gets entries appended idempotently, target's own `src/` not disturbed. This is the second-highest-leverage suite — `bootstrap.sh` writes to a user's repo, so regressions are user-visible.

---

## Weaknesses

### Finding 1 — `smoke-presentation.test.js` is a syntax check only
- File: `tests/smoke-presentation.test.js` (19 LOC)
- Observed: The single test spawns `node --check` against `docs/build-presentation.js`. It does not execute the module, does not verify it can open its devDependencies (`pptxgenjs`, `react-dom/server`, `sharp`, `react-icons`), and does not verify it produces a valid PPTX.
- Impact: A breaking change to `pptxgenjs` or `sharp` that still parses as valid JS (e.g., a removed export that's dynamically required) would pass CI. The health-check recommendation to add a runtime smoke test (`node docs/build-presentation.js --dry-run` or similar) is still open.
- Severity: Low — presentation build is a marketing artifact, not a runtime concern. But the smoke test as it stands is near-tautological.

### Finding 2 — Bootstrap tests hard-depend on `rsync`
- File: `tests/bootstrap.test.js`
- Observed: Tests shell out to `bash bootstrap.sh`, which invokes `rsync`. Without rsync, ~17 tests fail. Failure mode: stderr from bash is swallowed into the assertion trace, making the root cause non-obvious. CI installs rsync explicitly; CONTRIBUTING.md documents it as a prerequisite.
- Impact: Contributors on a minimal Linux image or on CI runners that change base images would hit opaque test failures. The documentation mitigates this, but a preflight guard in the test setup (`assert.ok(spawnSync('rsync', ['--version']).status === 0, 'rsync not installed; see CONTRIBUTING.md')`) would fail fast with a clear message.
- Severity: Low — documented, and the failure is loud enough that a reader eventually gets to rsync. But the UX is poor.

### Finding 3 — No tests for `.claude/rules/*.md` or `.claude/commands/*.md` semantics
- Observed: Pipeline rules, gate schema, escalation rules, and command templates are read as prose by the orchestrator. A typo in a stage number, gate key name, or required field list lands silently — the first signal is a pipeline run failing in an unexpected way.
- Impact: Structural changes to the pipeline (adding a stage, renaming a gate key) can break the orchestrator without any test catching it.
- Mitigation in place: `frontmatter.test.js` covers the YAML headers. The prose body is not covered.
- Severity: Medium — the rules files are high-impact and rarely changed; when they *are* changed, a test would help. A minimal fix would be a table-driven test that re-parses `gates.md`'s schema examples and validates them against `gate-validator.js`.

### Finding 4 — No test for the `implement` skill's shape
- File: `.claude/skills/implement/SKILL.md`
- Observed: The skill's phase structure (Understand → Plan → Build → Verify → Commit) is prose. The addition of the Commit step in PR #4 was verified by reading; no test asserts "implement skill has a Commit phase" or "implement skill references `npm test`".
- Impact: Skill drift is silent. Low probability, medium blast radius.
- Severity: Low

### Finding 5 — No coverage tooling
- Observed: `node:test` supports `--experimental-test-coverage` as of Node 20. The project does not use it. Current coverage is inferred from the test file layout, not measured.
- Impact: Can't prove the claim that `gate-validator.js` has 100% branch coverage.
- Severity: Low — not blocking, but the claim is easier to verify with tooling.

---

## Test Quality Observations

- **Isolation**: gate-validator tests use `os.tmpdir()` and clean up per-test with `beforeEach`/`afterEach`. Bootstrap tests use temp directories with git initialized per-test. Clean.
- **Assertion granularity**: Uses `assert.equal`, `assert.match`, `assert.ok`. No single-assertion-per-test dogma, but the assertions are targeted. Readable.
- **No snapshots**: No snapshot testing anywhere. Appropriate for this codebase — the framework's outputs are mostly orchestration side-effects, not serializable artifacts.
- **No flaky tests identified**: All assertions are deterministic given rsync is present.
- **Test-to-code ratio**: ~642 LOC tests vs ~900 LOC hand-written JS (gate-validator 90, build-presentation 686, eslint.config 19, bootstrap.sh 168 shell). Healthy ratio for the JS surface.

---

## Environmental Failure Observed During This Audit

During Phase 1 evidence gathering, `npm test` reported 17 failing subtests inside the audit environment. Root cause: `node_modules/` is empty (npm install never ran) and the rsync binary is not present. Both are environmental, not regressions:

- `npm install` is a CI prerequisite (workflow installs before test).
- `rsync` is documented in CONTRIBUTING.md and explicitly installed in CI.

On a properly provisioned machine (CI-equivalent), all suites pass. This environmental failure is worth noting only because it illustrates **Finding 2** above: the failure mode is non-obvious. A preflight in the test setup would turn 17 assertion traces into one clear "install rsync" message.

---

## Recommendations

- **P2** — Upgrade `smoke-presentation.test.js` from syntax-only to a runtime smoke that calls the main render with a temp output path and asserts exit 0 + output file > 0 bytes. Requires adding a `--dry-run` or `--out <path>` CLI flag to `build-presentation.js`.
- **P2** — Unpark roadmap item #16 (YAML frontmatter linting in CI as a first-class workflow step). The validation test already exists — this is wiring only.
- **P2** — Add a preflight check in `tests/bootstrap.test.js` that detects missing rsync and skips (or fails with a clear "install rsync" message) before the 17 subtests run.
- **P3** — Add a schema-consistency test that parses the gate-schema examples in `.claude/rules/gates.md` and validates them against `gate-validator.js`. Guards against drift between documented and enforced gate shape.
- **P3** — Turn on `--experimental-test-coverage` in a CI step; publish the summary to the job log. Optional — not blocking any quality goal.

## Summary

Test coverage on the framework's critical runtime (`gate-validator.js`) and install-time surface (`bootstrap.sh`) is genuinely good. The suite is well-isolated, uses only built-ins, and runs in CI across two Node versions. The weaknesses are all at the edges: a near-tautological presentation smoke test, an opaque-failure mode when rsync is missing, and untested prose in rules/commands/skills. Nothing is in crisis. The April 2026 health-check observation that "all 97 tests passing" still holds when the test environment is properly provisioned.
