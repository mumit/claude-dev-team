# Synthesized Backlog

## Cross-Cutting Themes

### Theme 1: Practice What You Preach
The framework enforces testing, linting, and dependency management on target projects but has none of these for its own code. The gate-validator hook — the single most critical runtime component — is untested. This undermines credibility when the framework is evaluated by engineering teams.

### Theme 2: Developer Experience for Framework Contributors
There's no `package.json`, no test script, no contribution guide, and no way to validate changes to agent definitions or commands. Someone modifying the framework must bootstrap into a real project and run a full pipeline to verify their change works.

### Theme 3: Cross-Platform Robustness
The bootstrap script uses macOS-specific `cp -rn` behavior, there's no `.gitignore`, and the presentation script has unmanaged dependencies. The framework targets developers on macOS, Linux, and potentially CI environments but hasn't been hardened for all of them.

### Theme 4: Presentation Script as Technical Debt
`build-presentation.js` is the largest file (684 lines), least documented, has unmanaged dependencies, and a 620-line monolithic function. It's useful but architecturally disconnected from the framework proper.

### Theme 5: Pipeline Lifecycle Gaps
Worktree cleanup isn't part of `/reset`, Stage 3 is invisible in status dashboards, `context.md` grows unbounded, and there are no stage-level timeouts. These are minor individually but collectively affect the reliability of long pipeline runs.

---

## Prioritized Backlog

### P0 — Fix Now

**1. Add tests for gate-validator.js**
- Theme: Practice What You Preach
- Description: Write a test suite for `gate-validator.js` using Node.js built-in `node:test`. Cover all exit code paths (PASS→0, FAIL→2, ESCALATE→3, malformed→1), missing required fields, empty/missing gates directory, and multiple gate files (latest-wins). This is the most critical runtime component and currently has zero tests.
- Affected components: `.claude/hooks/gate-validator.js`, new `tests/gate-validator.test.js`
- Effort: **S**
- Risk of change: Low
- Risk of NOT changing: High — a bug in gate validation could silently pass a FAIL or falsely block a PASS
- Dependencies: P0-2 (package.json) should land first or together
- Confidence: **HIGH**

**2. Add package.json with test script**
- Theme: Practice What You Preach / Developer Experience
- Description: Create a minimal `package.json` with `name`, `version`, `scripts.test` (pointing to the gate-validator tests), and `devDependencies` for the presentation script (`pptxgenjs`, `react`, `react-dom`, `sharp`, `react-icons`). This enables `npm test`, `npm audit`, and dependency version pinning.
- Affected components: New `package.json`, new `package-lock.json`
- Effort: **XS**
- Risk of change: Low
- Risk of NOT changing: Medium — unmanaged deps, no `npm test`, no `npm audit`
- Dependencies: None
- Confidence: **HIGH**

**3. Add .gitignore**
- Theme: Cross-Platform Robustness
- Description: Add a `.gitignore` covering: `.env`, `node_modules/`, `*.pptx`, `docs/audit/` (generated), `pipeline/gates/`, `pipeline/adr/`, `pipeline/code-review/`, `pipeline/brief.md`, `pipeline/design-spec.md`, `pipeline/deploy-log.md`, `pipeline/test-report.md`, `pipeline/pr-*.md`, `pipeline/hotfix-spec.md`, `pipeline/archive/`. The framework repo should practice the same hygiene it prescribes to target projects.
- Affected components: New `.gitignore`
- Effort: **XS**
- Risk of change: Low
- Risk of NOT changing: Medium — accidental commits of generated files or secrets
- Dependencies: None
- Confidence: **HIGH**

---

### P1 — Quick Wins

**4. Add worktree cleanup to /reset command**
- Theme: Pipeline Lifecycle Gaps
- Description: The `/reset` command archives pipeline artifacts but doesn't clean up git worktrees from Stage 4. Add `git worktree list` check and `git worktree remove` for any `dev-team-*` worktrees. Also add a preflight worktree check to `/pipeline` startup.
- Affected components: `.claude/commands/reset.md`, `.claude/commands/pipeline.md`
- Effort: **XS**
- Risk of change: Low
- Risk of NOT changing: Medium — orphaned worktrees cause next pipeline run to fail
- Dependencies: None
- Confidence: **HIGH**

**5. Add Stage 3 to /status dashboard**
- Theme: Pipeline Lifecycle Gaps
- Description: The `/status` command example output skips Stage 3 (Pre-Build Clarification). Add it to the template with status "N/A" if no open questions exist, or "PASS" / count of questions answered.
- Affected components: `.claude/commands/status.md`
- Effort: **XS**
- Risk of change: Low
- Risk of NOT changing: Low — cosmetic, but completeness matters for a framework that values observability
- Dependencies: None
- Confidence: **HIGH**

**6. Fix bootstrap.sh cross-platform portability**
- Theme: Cross-Platform Robustness
- Description: Replace `cp -rn` with a more portable approach. Options: (a) use `rsync --ignore-existing -r` which is standard on macOS and most Linux, (b) use a conditional `cp` with existence checks, or (c) document "requires GNU coreutils" as a prerequisite. Also add basic `$TARGET` path validation.
- Affected components: `bootstrap.sh`
- Effort: **S**
- Risk of change: Low
- Risk of NOT changing: Medium — Linux users may hit unexpected behavior
- Dependencies: None
- Confidence: **HIGH**

**7. Capture lint output from dev agent hooks**
- Theme: Practice What You Preach
- Description: The `|| true` in PostToolUse lint hooks silently swallows failures. Change to log output: `npm run lint --if-present 2>&1 | tee -a pipeline/lint-output.txt || true`. Lint issues are captured for review even if not blocking.
- Affected components: `.claude/agents/dev-backend.md`, `dev-frontend.md`, `dev-platform.md`
- Effort: **XS**
- Risk of change: Low
- Risk of NOT changing: Low — lint violations during builds are currently invisible
- Dependencies: None
- Confidence: **MEDIUM**

---

### P2 — Targeted Improvements

**8. Add integration tests for bootstrap.sh**
- Theme: Practice What You Preach
- Description: Write shell-based integration tests that run bootstrap.sh against temp directories. Test cases: clean target, existing `.claude/`, existing `CLAUDE.md` (backup check), missing deps, idempotency (run twice). Use a test framework like `bats` or raw bash assertions.
- Affected components: New `tests/bootstrap.test.sh`
- Effort: **M**
- Risk of change: Low
- Risk of NOT changing: Low — bootstrap is rarely modified and manually tested
- Dependencies: P0-2 (package.json can include a `test:integration` script)
- Confidence: **MEDIUM**

**9. Add a CONTRIBUTING.md**
- Theme: Developer Experience
- Description: Document how to modify and test the framework: directory structure overview, how to test changes (bootstrap into temp project, run a pipeline), how to run tests, how to add a new command/skill/agent, and the YAML frontmatter schema for agents/skills.
- Affected components: New `CONTRIBUTING.md`
- Effort: **S**
- Risk of change: Low
- Risk of NOT changing: Medium — new contributors have no guidance
- Dependencies: P0-1 and P0-2 should land first (so CONTRIBUTING.md can reference `npm test`)
- Confidence: **HIGH**

**10. Add a CI workflow**
- Theme: Practice What You Preach
- Description: Add `.github/workflows/test.yml` that runs `npm test` on push/PR. Once gate-validator tests exist (P0-1), this ensures regressions are caught. Can also run `node --check` on all JS files for syntax validation.
- Affected components: New `.github/workflows/test.yml`
- Effort: **S**
- Risk of change: Low
- Risk of NOT changing: Low — tests exist but aren't enforced
- Dependencies: P0-1 (tests), P0-2 (package.json)
- Confidence: **HIGH**

**11. Rename pipeline-status to pipeline-context**
- Theme: Developer Experience
- Description: The `pipeline-status` command is described as a "compact dump for pre-compaction context saving" but its name suggests a status dashboard (which is `/status`). Rename to `pipeline-context` or `pipeline-dump` to reduce confusion.
- Affected components: `.claude/commands/pipeline-status.md` (rename), README.md, AGENTS.md
- Effort: **XS**
- Risk of change: Low — but users who learned the old name need to update muscle memory
- Risk of NOT changing: Low
- Dependencies: None
- Confidence: **LOW**

**12. Manage context.md growth in /reset**
- Theme: Pipeline Lifecycle Gaps
- Description: The `/reset` command preserves the full `context.md` with a separator. Over many pipeline runs, this file grows indefinitely. Change `/reset` to archive the current run's context entries to `pipeline/archive/run-{timestamp}/context.md` and reset the main file to the template.
- Affected components: `.claude/commands/reset.md`
- Effort: **XS**
- Risk of change: Low
- Risk of NOT changing: Low — only matters after many pipeline runs
- Dependencies: None
- Confidence: **MEDIUM**

---

### P3 — Strategic Investments

**13. Refactor build-presentation.js into modular slide builders**
- Theme: Presentation Script Technical Debt
- Description: Split the 620-line `build()` function into per-slide functions. Extract common layout helpers (`addTitleSubtitle()`, `addTable()`, `addTwoColumn()`). Add JSDoc to public functions. This makes the script maintainable and extensible.
- Affected components: `docs/build-presentation.js`
- Effort: **M**
- Risk of change: Medium — layout coordinates are fragile, refactoring could break positioning
- Risk of NOT changing: Low — the script works and is rarely modified
- Dependencies: P0-2 (package.json for dev deps)
- Confidence: **MEDIUM**

**14. Add schema validation for agent/skill YAML frontmatter**
- Theme: Developer Experience
- Description: Create a validation script that reads all `.claude/agents/*.md` and `.claude/skills/*/SKILL.md` files, parses the YAML frontmatter, and validates required fields (`name`, `description`, `tools`, `model` for agents; `name`, `description` for skills). Run as part of `npm test`. Catches typos that would silently fail at runtime.
- Affected components: New `tests/frontmatter-validator.test.js`, all agent and skill files (read-only)
- Effort: **S**
- Risk of change: Low
- Risk of NOT changing: Medium — frontmatter errors are currently silent
- Dependencies: P0-2 (package.json, test runner)
- Confidence: **MEDIUM**

**15. Document stage timeout expectations**
- Theme: Pipeline Lifecycle Gaps
- Description: Add expected duration guidance to each stage in `.claude/rules/pipeline.md` (e.g., "Stage 1 typically completes in 2-5 minutes"). Add a soft warning to the orchestrator: if a stage hasn't written its gate file after N minutes, surface a progress check to the user.
- Affected components: `.claude/rules/pipeline.md`, `CLAUDE.md`
- Effort: **S**
- Risk of change: Low
- Risk of NOT changing: Low — pipelines can hang without feedback but this is rare
- Dependencies: None
- Confidence: **LOW**

---

### Parked

**16. Add YAML frontmatter linting to CI**
- Reason: Depends on P3-14 (schema validation script). Revisit after P3-14 ships.

**17. Add end-to-end pipeline test**
- Reason: Running a full pipeline as an automated test would require a Claude Code instance and significant token cost. Not practical for CI. Could revisit if Claude Code adds a dry-run or test mode.

**18. Consolidate duplicate agent review instructions**
- Reason: Claude Code's agent format requires self-contained files. No shared-include mechanism exists. The duplication (Q1, Q2) is a platform limitation, not a framework design flaw. Revisit if Claude Code adds `imports:` or `extends:` to agent definitions.
