# Test Health

## Coverage Map

| Component | Test Count | Test Types | Notes |
|---|---|---|---|
| gate-validator.js | 0 | None | **Critical runtime component — zero tests** |
| bootstrap.sh | 0 | None | Modifies filesystem — no integration tests |
| build-presentation.js | 0 | None | Standalone tool, lower priority |
| Agent definitions (5) | 0 | N/A | Markdown — not testable in the traditional sense |
| Commands (18) | 0 | N/A | Markdown — not testable in the traditional sense |
| Skills (6) | 0 | N/A | Markdown — not testable in the traditional sense |
| Rules (4) | 0 | N/A | Markdown — not testable in the traditional sense |

**Test infrastructure**: None. No test runner, no test framework, no CI pipeline running tests.

## Untested Critical Paths

### 1. gate-validator.js (Critical)
The gate validator is the **single most important runtime component** in the framework. It runs after every subagent stop and controls pipeline flow. Untested scenarios:

- **Valid PASS gate** — does it exit 0?
- **Valid FAIL gate** — does it exit 2?
- **Valid ESCALATE gate** — does it exit 3?
- **Malformed JSON** — does it handle gracefully?
- **Missing required fields** — does it detect all 6 required fields?
- **Unknown status value** — does it exit 1?
- **Empty gates directory** — does it exit 0?
- **No gates directory** — does it exit 0?
- **Multiple gate files** — does it pick the most recent?
- **File permission errors** — does it handle gracefully?

**Impact**: A bug in gate-validator.js could silently pass a FAIL gate (allowing broken code to deploy) or falsely ESCALATE a PASS gate (halting the pipeline unnecessarily).

### 2. bootstrap.sh (High)
The bootstrap script modifies the target project's filesystem. Untested scenarios:

- **Clean target** — does it create all directories?
- **Existing .claude/ in target** — does merge work correctly (`cp -rn`)?
- **Existing CLAUDE.md** — does it back up before overwriting?
- **Missing dependencies** (node, git) — does it exit with clear error?
- **Existing .gitignore** — does it append correctly?
- **Idempotency** — is running it twice safe?
- **Path with spaces** — does it handle `$TARGET` with spaces?

**Impact**: A bug could silently overwrite user's existing configuration or fail to install required files.

### 3. Gate JSON Schema Validation (Medium)
The gate schema is documented in `.claude/rules/gates.md` but not programmatically validated beyond the 6 required fields. Stage-specific fields (like `acceptance_criteria_count` for stage-01, `arch_approved` for stage-02) are not checked by gate-validator.js.

## Test Quality Issues

N/A — no tests exist.

## Test Infrastructure

| Item | Status |
|---|---|
| Test runner configured | ❌ No |
| CI runs tests | ❌ No CI pipeline |
| Tests currently passing | N/A |
| Coverage tool | ❌ No |
| package.json with test script | ❌ No package.json |

## What's Well-Tested

Nothing. However, the framework's **design** for testing target projects is well-thought-out:

1. The `dev-platform` agent has detailed instructions for writing tests covering every acceptance criterion.
2. The `code-conventions` skill requires "New behaviour = new tests" as a convention.
3. The `review-rubric` skill includes "Does new behaviour have corresponding tests?" as a mandatory check.
4. The pipeline Stage 6 gate requires `"all_acceptance_criteria_met": true`.

The irony: a framework that rigorously enforces testing in target projects has no tests for its own critical components.

## Recommendations

1. **P0**: Add a test suite for `gate-validator.js` using Node.js built-in `node:test` (no deps needed). Cover all exit code paths and edge cases.
2. **P1**: Add a `package.json` with a `test` script so `npm test` works.
3. **P2**: Add integration tests for `bootstrap.sh` (can use temp directories).
4. **P3**: Consider adding a CI workflow (`.github/workflows/test.yml`) to run tests on PR.
