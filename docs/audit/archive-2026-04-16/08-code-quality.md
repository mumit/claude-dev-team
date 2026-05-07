# 08 — Code Quality

## Scope

Four hand-written executable files drive everything in this repo:

| File | LOC | Language | Role |
|---|---|---|---|
| `.claude/hooks/gate-validator.js` | 89 | Node.js (CJS) | Pipeline gate validator hook |
| `bootstrap.sh` | 167 | Bash | Installer for target projects |
| `docs/build-presentation.js` | 686 | Node.js (CJS) | Presentation builder (marketing asset) |
| `eslint.config.js` | 19 | Node.js (CJS) | ESLint flat config stub |
| *(plus 4 test files, 642 LOC)* | | `node:test` | Suite |

Everything else is Markdown/YAML — the framework definition. Quality of the markdown prose is covered in `03-compliance.md` and `05-documentation.md`. This file assesses the JS + shell.

---

## Findings

### Duplication

**Finding Q1 — PostToolUse hook duplicated across three dev agents**
- Files: `.claude/agents/dev-backend.md:19-22`, `dev-frontend.md:17-20`, `dev-platform.md:17-20`
- Observation: The same hook definition appears in all three dev agent files:
  ```yaml
  PostToolUse:
    - matcher: "Write|Edit"
      hooks:
        - type: command
          command: "cd $(git rev-parse --show-toplevel) && npm run lint --if-present 2>&1 | tee -a pipeline/lint-output.txt || true"
  ```
- Impact: A change to the lint invocation must be replicated in three places. The risk showed up during the health-check: the `tee` addition was a three-file edit.
- Assessment: Known; parked as roadmap item #18. Blocked on Claude Code not yet supporting `imports:` / `extends:` in agent frontmatter. No framework-side fix available until the platform catches up.
- Severity: **Low** | Effort: Small (but platform-blocked)

**Finding Q2 — Code-review task instructions repeat structure across three dev agents**
- Files: `.claude/agents/dev-backend.md` (Review section), `dev-frontend.md`, `dev-platform.md`
- Observation: Each dev agent has a "On a Code Review Task" section with the same file-read order and BLOCKER/SUGGESTION/QUESTION taxonomy. Differences are in focus (backend=API correctness, frontend=XSS, platform=testability) — which is by design.
- Severity: **Informational** — duplicated structure, differentiated content.

**Finding Q3 — Build-presentation per-slide functions share boilerplate**
- File: `docs/build-presentation.js` — eighteen `slideXxx(pres, ...)` functions
- Observation: Since the Batch-4 refactor (per-slide functions), each slide function still repeats boilerplate: create slide, set background, set title, set subtitle, position cards, position footer. Helpers `addCard()`, `sectionSlide()`, `slideBg()` capture some of this.
- Impact: Adding a new slide requires copy-edit of a sibling function, not just calling a higher-level primitive.
- Severity: **Low** | Effort: Medium
- Suggested fix: Extract a `pageTemplate(pres, {title, subtitle, body, footer})` that takes a body-builder callback. Each slide function then becomes a data object + body callback, reducing size.

### Complexity

**Finding Q4 — `build()` orchestrator is now a thin composition**
- File: `docs/build-presentation.js:606` (`async function build()`)
- Observation: Since the Batch-4 refactor, `build()` primarily calls the per-slide helpers in order. It is no longer the 620-line monolith the prior audit flagged. Prior finding resolved.
- Severity: Resolved.

**Finding Q5 — `slidePipelineTeam`, `slideWhenToUse`, `slideSafetyTrust` are 60-80 lines each**
- File: `docs/build-presentation.js` — several slide functions
- Observation: Post-refactor, some slide functions carry the complexity of dense tables or multi-column layouts inline. They are readable, but a few exceed ~60 LOC each with non-trivial coordinate math.
- Severity: **Low** | Effort: Small (per-slide)
- Suggested fix: Extract inline tables into data arrays at the top of the function, then iterate. Cleans up the layout math.

**Finding Q6 — `gate-validator.js` is simple, linear, and clean**
- File: `.claude/hooks/gate-validator.js` (89 LOC)
- No nested conditionals, no helper pyramid, no side-effect entanglement. Reads top-to-bottom. Aside from the error-handling gap noted in 03-compliance.md, this is well-structured code.
- Severity: ✅ positive

**Finding Q7 — `bootstrap.sh` is well-sectioned and commented**
- File: `bootstrap.sh` (167 LOC)
- Top-of-file block explains what the script does. Each phase (`# ── Preflight checks ──`, `# ── Copy .claude/`, `# ── Create root files`) is demarcated. Branching on file/directory existence is explicit and idempotent.
- Severity: ✅ positive

### Dead Code

**Finding Q8 — No dead code detected**
- All functions in `build-presentation.js` called by `build()`. All files in `.claude/` referenced by at least one command, agent, or skill. No commented-out blocks. No orphaned test files.
- Severity: ✅ clean

### Abstraction Health

**Finding Q9 — `.claude/skills/implement/SKILL.md` and `pre-pr-review/SKILL.md` remain dense**
- Files: skill bodies (~100 lines each)
- Observation: Each mixes trigger rules, phase definitions, and workflow guidance in a single file. Still readable; no pressing split needed.
- Assessment: Matches the prior audit's "acceptable at this size". Revisit if any skill grows past ~150 LOC.
- Severity: **Informational**

**Finding Q10 — `.claude/rules/pipeline.md` carries both orchestration prose and a stage table**
- File: `.claude/rules/pipeline.md`
- Observation: The stage-by-stage prose is the authoritative spec; the "Stage Duration Expectations" table added in Batch 4 is guidance. They coexist well. The file is ~200 lines and growing with each pipeline refinement.
- Severity: **Informational**
- Suggested improvement: If the file reaches ~300 LOC, consider extracting the duration / stall-indicator content into `.claude/references/pipeline-timing.md`.

### Naming & Clarity

**Finding Q11 — `pipeline-status` renamed to `pipeline-context` (resolved)**
- Prior audit flagged the name collision with `status`. `pipeline-context.md` now names the role (pre-compaction state dump) distinctly from the user-facing `/status` dashboard.
- Severity: Resolved.

**Finding Q12 — `lint:frontmatter` is a misnamed test script**
- File: `package.json:10`
- Observation: `"lint:frontmatter": "node --test tests/frontmatter.test.js"` — executes a test, not a linter. Same finding noted in 03-compliance.md (Finding 2).
- Severity: **Low** | Effort: XS — rename to `test:frontmatter` or add an explanatory comment.

**Finding Q13 — Magic numbers in `build-presentation.js`**
- File: `docs/build-presentation.js` throughout
- Observation: `x: 0.7`, `y: 1.55`, `w: 4.3` — slide layout coordinates without named constants. Appropriate for a presentation script since coordinates are inherently positional, but the same values (0.7 margin, 4.1 card width) recur.
- Severity: **Low** | Effort: Medium — worth it only if the file sees more churn.

**Finding Q14 — Gate stage naming is mixed but documented**
- File: `.claude/rules/gates.md`, `.claude/commands/status.md`
- Observation: Most stages have one gate (`stage-01.json`), Stages 4 and 5 have per-area gates (`stage-04-backend.json`). The status dashboard code handles both. Intentional.
- Severity: ✅ by design

### Dependency & Tooling Health

**Finding Q15 — `package.json` + `package-lock.json` present; reproducible installs (resolved)**
- Files: `package.json`, `package-lock.json`
- Prior audit's "no dependency manifest" finding is fully resolved. All seven devDeps pinned; lockfile committed; no runtime deps.
- Severity: Resolved.

**Finding Q16 — ESLint is configured but with only recommended rules**
- File: `eslint.config.js` (19 LOC)
- Observation: Flat config is correct, uses `@eslint/js` recommended preset, ignores `node_modules/`, sets CommonJS + Node globals. No project-specific rules.
- Assessment: Defensible for a ~900-LOC JS surface. The ruleset catches genuine bugs (unused vars, unreachable code). It does not enforce code-conventions skill rules (kebab-case, JSDoc on public functions, no magic numbers).
- Severity: **Low** | Effort: Small — noted in 03-compliance Finding 1.

**Finding Q17 — No formatter (Prettier or equivalent) configured**
- Observation: `node:test` files and hand-written JS use mixed quote styles (`"` in gate-validator.js, `'` in tests). ESLint doesn't fail on this.
- Impact: Low; single-maintainer project with consistent intra-file style.
- Severity: **Informational**

**Finding Q18 — Test-to-source ratio is healthy**
- Test files: 642 LOC across 4 files
- Source JS: ~900 LOC (gate-validator + build-presentation + eslint.config)
- Shell: 167 LOC (bootstrap)
- Ratio ~0.7:1 by LOC. For a codebase where most files are config/markdown, this is above average.
- Severity: ✅ positive

### Shell Script Quality

**Finding Q19 — `bootstrap.sh` sets `-e` and uses `command -v` preflight (clean)**
- File: `bootstrap.sh:21, 35-40`
- `set -e` aborts on first error. `command -v` preflight checks for required binaries. Variables are consistently quoted.
- Severity: ✅ positive

**Finding Q20 — `bootstrap.sh` lacks `set -u` and `set -o pipefail`**
- File: `bootstrap.sh:21`
- Observation: `set -e` alone doesn't catch unset variables (`set -u`) or pipe failures (`set -o pipefail`). Neither is critical for this script — it uses only defined variables and has no pipes — but `set -euo pipefail` is the idiomatic bash-strict mode.
- Severity: **Low** | Effort: XS — one-line change.

**Finding Q21 — `.gitignore` append block in `bootstrap.sh` is 18 echo lines**
- File: `bootstrap.sh:110-132`
- Observation: Long sequence of `echo "pipeline/..." >> "$TARGET/.gitignore"`. Works, but a heredoc (`cat >> "$TARGET/.gitignore" <<'EOF' ... EOF`) would be more readable and atomic.
- Severity: **Low** | Effort: XS

### Test Code Quality

**Finding Q22 — Test helpers are compact and reused**
- Files: `tests/gate-validator.test.js:14-29` (`run(cwd)` helper), `tests/bootstrap.test.js` (temp-dir helpers)
- Observation: Each test file defines small helpers at the top and reuses them. No global fixture file, which is fine at this scale.
- Severity: ✅ positive

**Finding Q23 — Mixed quote style across test files**
- Files: `tests/*.test.js`
- Observation: `gate-validator.test.js` uses double quotes; `frontmatter.test.js`, `bootstrap.test.js`, `smoke-presentation.test.js` use single quotes.
- Severity: **Informational** — would be caught by Prettier if configured.

---

## Summary

| # | Finding | Effort | Impact | Status |
|---|---|---|---|---|
| Q1 | Dev-agent hook duplication (3×) | Small | Low | Parked (platform-blocked) |
| Q2 | Review instructions structural repeat | — | Info | By design |
| Q3 | Per-slide boilerplate in build-presentation | Medium | Low | Open |
| Q4 | build() no longer monolithic | ✅ | — | Resolved |
| Q5 | A few slides still 60-80 LOC | Small | Low | Open |
| Q6 | gate-validator.js clean | ✅ | — | Clean |
| Q7 | bootstrap.sh well-sectioned | ✅ | — | Clean |
| Q8 | No dead code | ✅ | — | Clean |
| Q9 | Dense skill files | — | Info | Acceptable |
| Q10 | pipeline.md size trend | — | Info | Monitor |
| Q11 | pipeline-status → pipeline-context | ✅ | — | Resolved |
| Q12 | lint:frontmatter script misname | XS | Low | Open |
| Q13 | Magic numbers in presentation | Medium | Low | Acceptable |
| Q14 | Mixed gate naming (stage-04 vs stage-04-{area}) | — | — | By design |
| Q15 | package.json + lockfile | ✅ | — | Resolved |
| Q16 | ESLint rules minimal | Small | Low | Open |
| Q17 | No formatter | — | Info | Acceptable |
| Q18 | Test/source ratio healthy | ✅ | — | Clean |
| Q19 | bootstrap set -e + preflight | ✅ | — | Clean |
| Q20 | No `set -u`, no `pipefail` | XS | Low | Open |
| Q21 | .gitignore append via echo loop | XS | Low | Open |
| Q22 | Test helpers compact | ✅ | — | Clean |
| Q23 | Mixed quote style | — | Info | Cosmetic |

**Overall quality**: Good for the framework's executable code. Seven prior findings are resolved by the April 2026 health-check refactors (per-slide extraction, command rename, dependency manifest, lint hook output capture, and infrastructure adds). The remaining open items are mostly **XS/Small effort** polish — bash strictness, one script rename, a presentation-layout cleanup — none blocking any quality goal. Two items (Q1 hook duplication and Q9 skill density) are known and accepted. The executable surface is small and healthy; the investment should go to Phase 3 items with user-facing leverage, not further refactoring this tier.
