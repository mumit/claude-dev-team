# Convention Compliance

## Methodology

This project documents conventions in `.claude/skills/code-conventions/SKILL.md`. Since this is a configuration-as-code project (mostly Markdown), many code-level conventions (naming, error handling, SQL) apply to the *target* project, not this repo. This audit checks: (1) whether the framework follows its own documented conventions where applicable, and (2) internal consistency.

---

## Findings

### Category: File Naming

**Finding 1: Inconsistent naming pattern across .claude/ subdirectories**
- Convention: `code-conventions/SKILL.md` says "Files: `kebab-case` for all languages"
- Observed: Agent files use `dev-backend.md`, `dev-frontend.md` (kebab-case ✅) but also `pm.md`, `principal.md` (single word, fine). Skill directories use `code-conventions/`, `api-conventions/` (kebab-case ✅) but the file inside is always `SKILL.md` (SCREAMING_CASE).
- Assessment: `SKILL.md` is a Claude Code convention, not a project choice. **No violation.**
- Confidence: LOW

### Category: Documentation (JSDoc)

**Finding 2: gate-validator.js lacks JSDoc on functions**
- File: `.claude/hooks/gate-validator.js`
- Convention: "Every public function/method has a docstring or JSDoc comment" (`code-conventions/SKILL.md:9`)
- Observed: The file has a top-level block comment (good) but no functions — it's a linear script. No JSDoc needed.
- Assessment: **No violation** — the script is procedural, not modular.
- Confidence: HIGH

**Finding 3: build-presentation.js has no JSDoc on exported/public functions**
- File: `docs/build-presentation.js:31-38`
- Convention: "Every public function/method has a docstring or JSDoc comment"
- Observed: Functions `renderIconSvg`, `icon`, `addCard` and 10+ other helper functions have zero JSDoc. The file has 684 lines of undocumented functions.
- Suggested fix: Add JSDoc to at least `icon()`, `addCard()`, `addBullets()`, `slideBg()`, and `main()`.
- Confidence: **HIGH**

### Category: Error Handling

**Finding 4: gate-validator.js has incomplete error handling**
- File: `.claude/hooks/gate-validator.js:38-44`
- Convention: "Never swallow errors silently" and "All async operations have explicit error handling"
- Observed: The `JSON.parse` try/catch correctly reports the error. However, `fs.readFileSync` and `fs.readdirSync` are not wrapped — if the directory is unreadable or a file is corrupt, the script throws an unhandled exception.
- Suggested fix: Wrap `fs.readdirSync` and `fs.statSync` in try/catch.
- Confidence: **MEDIUM** — these are unlikely failure modes but the convention says "never swallow errors silently", and unhandled exceptions aren't silent but are still ungraceful.

### Category: Security

**Finding 5: No `.gitignore` in the framework repo**
- Convention: Security checklist says "`.env` files are in `.gitignore`". Code conventions say "No secrets, tokens, or credentials in source code."
- Observed: The repo has no `.gitignore` at all. While there are no secrets currently, this means any `.env` file accidentally created would be tracked. The bootstrap script adds `.gitignore` entries to the *target* project but not to this repo.
- Suggested fix: Add a `.gitignore` with at least: `.env`, `node_modules/`, `*.pptx`, `pipeline/gates/`, `docs/audit/`.
- Confidence: **HIGH**

### Category: Architecture Consistency

**Finding 6: CLAUDE.md says "You do not write code" but orchestrator context includes code-adjacent operations**
- File: `CLAUDE.md:3`
- Convention: CLAUDE.md says the orchestrator "does not write code or make technical decisions"
- Observed: The `/audit` command (run by the orchestrator) writes analysis files, runs git commands, and produces technical assessments. This is appropriate — it's analysis, not code authoring — but the statement in CLAUDE.md is slightly misleading.
- Suggested fix: Clarify to "You do not write application code or make technical decisions about the target project's implementation."
- Confidence: **LOW** — cosmetic, not functional

**Finding 7: Duplicate content between CLAUDE.md and AGENTS.md**
- Files: `CLAUDE.md` and `AGENTS.md`
- Convention: Implied DRY principle — AGENTS.md header says it's "a human-readable summary and a compatibility shim for other tools"
- Observed: The team listing in CLAUDE.md and AGENTS.md are largely redundant. AGENTS.md has far more detail but CLAUDE.md has the authoritative role for Claude Code.
- Assessment: **Intentional** — AGENTS.md serves other tools. Not a violation.
- Confidence: LOW

**Finding 8: Stage 3 is numbered but missing from `/status` command output**
- File: `.claude/commands/status.md:21-30`
- Convention: Pipeline has 8 stages (`.claude/rules/pipeline.md`)
- Observed: The example output in `status.md` jumps from Stage 02 to Stage 04, skipping Stage 03 (Pre-Build Clarification). Since Stage 3 doesn't write a gate file, the status dashboard doesn't show it.
- Suggested fix: Add Stage 03 to the status template, even if it shows "N/A" or "auto" when there are no open questions.
- Confidence: **MEDIUM**

**Finding 9: `pipeline-status.md` and `status.md` overlap in purpose**
- Files: `.claude/commands/pipeline-status.md` and `.claude/commands/status.md`
- Convention: Commands should have distinct purposes
- Observed: Both commands read gate files and report pipeline status. `pipeline-status.md` is described as a "compact dump" for pre-compaction context saving. `status.md` is the user-facing dashboard. The distinction is documented but may confuse users.
- Suggested fix: Consider merging into one command with a `--compact` flag, or clarify the difference in README.
- Confidence: **LOW**

### Category: Consistency in Agent Definitions

**Finding 10: PM agent doesn't load the `review-rubric` skill but reviews PRs indirectly**
- File: `.claude/agents/pm.md`
- Observed: PM is asked to review test results (Stage 7) and confirm scope fit (Stage 2). The 3 dev agents all load `review-rubric` and `security-checklist`. The PM loads neither. The Principal loads `security-checklist` and `api-conventions` but not `review-rubric`.
- Assessment: **Intentional** — PM reviews requirements fit, not code quality. Principal reviews architecture, not code style. The skill assignments match the roles.
- Confidence: LOW

**Finding 11: Dev agent PostToolUse lint hooks use `|| true` to suppress failures**
- Files: `.claude/agents/dev-backend.md:21`, `dev-frontend.md:19`, `dev-platform.md:19`
- Convention: "Never swallow errors silently"
- Observed: All 3 dev agents have `command: "cd $(git rev-parse --show-toplevel) && npm run lint --if-present || true"`. The `|| true` means lint failures are silently ignored.
- Assessment: **Intentional trade-off** — `--if-present` means the target project may not have a lint script. `|| true` prevents hook failure from blocking the agent. However, this means lint violations are invisible during builds.
- Suggested fix: Consider logging lint output to a file (`npm run lint --if-present 2>&1 | tee pipeline/lint-output.txt || true`) so lint issues are captured even if not blocking.
- Confidence: **MEDIUM**

---

## Possibly Intentional Deviations

1. **`SKILL.md` naming** — SCREAMING_CASE file inside kebab-case directories. This is Claude Code convention, not a project choice.
2. **`AGENTS.md` duplication** — Intentional compatibility shim for non-Claude-Code tools.
3. **PM without review-rubric** — Role-appropriate skill assignment.
4. **`|| true` in lint hooks** — Pragmatic choice for framework that must work in projects without linting.
5. **`build-presentation.js` style** — This file is a standalone tool, not part of the framework runtime. Convention enforcement may be lower priority here.
