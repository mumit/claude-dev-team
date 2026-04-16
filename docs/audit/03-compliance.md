# 03 — Convention Compliance

## Methodology

The project documents conventions in several places:

- `.claude/skills/code-conventions/SKILL.md` — naming, docstrings, error handling, SQL, secrets
- `.claude/skills/api-conventions/SKILL.md`, `security-checklist/SKILL.md`, `review-rubric/SKILL.md` — target-project concerns
- `.claude/rules/pipeline.md`, `gates.md`, `escalation.md`, `orchestrator.md`, `compaction.md` — orchestration rules
- `CONTRIBUTING.md` — branch → `npm test` → PR

Two audiences need to be kept distinct:

1. **Target-project conventions** (the code that generated agents emit). The `code-conventions` and `api-conventions` skills explicitly target this audience. They are *not* binding on this repo's own JS.
2. **Framework-internal conventions** (the code and markdown in this repo). These are mostly implicit, with a few enforced by tests (`tests/frontmatter.test.js`) and ESLint (`eslint.config.js`).

This file audits (2) only. It does not attempt to lint the framework against rules intended for target projects.

Prior findings from earlier audits have been re-verified. The April 2026 health check landed most of the prior fixes; the remaining items are recorded below.

---

## Findings

### Category: Code Style & Linting

**Finding 1 — ESLint config is a stub (persists)**
- File: `eslint.config.js`
- Observed: Uses `@eslint/js` flat config with `js.configs.recommended`. No custom rules beyond the ESLint defaults. No style rules (quotes, semis, spacing), no complexity caps, no import-order rules, no file-level ignores beyond `node_modules/`.
- Assessment: Functional — catches genuine errors like unused vars and unreachable code. But the documented conventions in `.claude/skills/code-conventions/SKILL.md` (no magic numbers, kebab-case files, JSDoc on public functions) are *not* mechanically enforced.
- Suggested fix: Either (a) accept the stub as intentional and remove the `lint` step's claim of "enforcing conventions", or (b) add a handful of opinionated rules: `no-console` (off for scripts), `no-magic-numbers` (warn, with allowed `[0, 1, -1]`), `require-jsdoc` for exported functions in `docs/build-presentation.js`.
- Confidence: **MEDIUM** (design call; the current stub is defensible)

**Finding 2 — `npm run lint:frontmatter` is a misleading script name**
- File: `package.json:10`
- Observed: `"lint:frontmatter": "node --test tests/frontmatter.test.js"`. The script name suggests a linter; it actually runs a single test file.
- Assessment: Works, but the `lint:*` namespace implies a lint tool. A future contributor might look for a `.frontmatterrc` or a real linter.
- Suggested fix: Rename to `"test:frontmatter"` for consistency with `test:integration`, or leave and add a 1-line comment in `package.json` (`"// lint:frontmatter": "alias to the frontmatter validation suite"`).
- Confidence: LOW (cosmetic, no functional impact)

### Category: Error Handling

**Finding 3 — `gate-validator.js` can still throw on unreadable gates dir**
- File: `.claude/hooks/gate-validator.js:22-29`
- Observed: `fs.readdirSync(GATES_DIR)` and `fs.statSync(...)` are unguarded. If the directory exists but is unreadable, or a gate file is removed between `readdirSync` and `statSync`, the hook throws an unhandled exception. The orchestrator then sees a non-zero exit from the hook, which is indistinguishable from a legitimate FAIL.
- Assessment: Unlikely on a single-user dev machine, but the hook is the framework's single source of truth for pipeline control flow. Defensive error handling is cheap here.
- Suggested fix: Wrap the `readdirSync`/`statSync` loop in a try/catch; on filesystem error, print `[gate-validator] WARN: could not read gates dir (<err>); treating as empty` and `process.exit(0)`.
- Confidence: MEDIUM

**Finding 4 — Dev-agent PostToolUse lint hooks capture but still `|| true`**
- Files: `.claude/agents/dev-backend.md:21`, `.claude/agents/dev-frontend.md:19`, `.claude/agents/dev-platform.md:19`
- Observed: Each dev agent now runs `cd $(git rev-parse --show-toplevel) && npm run lint --if-present 2>&1 | tee -a pipeline/lint-output.txt || true`. Output is now persisted (resolution of prior Finding 11), which is an improvement. The `|| true` still suppresses the exit code.
- Assessment: Intentional — target projects may not have a lint script, and the framework must not wedge on their behalf. Output is now captured to `pipeline/lint-output.txt`, which satisfies the "never swallow errors silently" spirit of the convention.
- Suggested fix: None, but consider a Stage-5 checklist item in `review-rubric` asking reviewers to glance at `pipeline/lint-output.txt` if it exists.
- Confidence: LOW (already mitigated)

### Category: Security & Secrets

**Finding 5 — `.gitignore` is comprehensive (resolved)**
- File: `.gitignore`
- Observed: Covers `node_modules/`, `*.pptx`, `pipeline/gates/*.json` (except schema), `*.local.*`, `.env*`. Prior audit's finding of "no .gitignore at all" is resolved.
- Assessment: No action needed.
- Confidence: HIGH

**Finding 6 — No TODO/FIXME/HACK markers in production code**
- Verified by grep across the repo excluding `docs/audit/`. The single match in `docs/build-presentation.js:539` is the string literal `"TODOs older than 30 days"` inside a health-check slide — content, not a debt marker.
- Assessment: Clean.
- Confidence: HIGH

### Category: Architecture Consistency

**Finding 7 — CLAUDE.md is near-empty**
- File: `CLAUDE.md` (5 lines, mostly comments)
- Observed: The file contains framework-pattern boilerplate ("customize here") but no project-specific guidance for Claude when working on *this* repo. The orchestrator rules live under `.claude/rules/`, which is the framework's own territory — meant to be propagated into target projects by bootstrap. For this repo's own maintenance, Claude gets no project-level instructions.
- Assessment: Mild gap. The audit workflow and the health-check workflow each re-derive their own context from `.claude/references/`. But a contributor using Claude to edit this repo has no single pinned "how we work here" doc.
- Suggested fix: Add a short section to `CLAUDE.md` covering: (a) this repo contains the framework only; generated target-project code does not live here, (b) run `npm test` before committing, (c) follow Conventional Commits, (d) do not add runtime dependencies, (e) point to `CONTRIBUTING.md` for process.
- Confidence: MEDIUM

**Finding 8 — Status command now includes Stage 3 (resolved)**
- File: `.claude/commands/status.md`
- Observed: Stage 03 (Pre-Build Clarification) now appears in the dashboard template. Prior finding resolved.
- Confidence: HIGH

**Finding 9 — `pipeline-status` command renamed to `pipeline-context` (resolved)**
- File: `.claude/commands/pipeline-context.md`
- Observed: The naming overlap with `/status` is gone; `pipeline-context` now clearly names its purpose (pre-compaction state dump).
- Confidence: HIGH

**Finding 10 — `build-presentation.js` now has JSDoc (resolved)**
- File: `docs/build-presentation.js`
- Observed: 19 JSDoc blocks covering the 17 public helpers and the 2 entry points. Prior finding (684 undocumented lines) resolved.
- Confidence: HIGH

### Category: Agent & Skill Consistency

**Finding 11 — PM agent skill load-out matches role (still clean)**
- Files: `.claude/agents/pm.md`, `.claude/agents/principal.md`, `.claude/agents/dev-*.md`
- Observed: PM loads no engineering-review skills — correct, PM reviews requirements. Principal loads `security-checklist` and `api-conventions` — correct. The three devs load `code-conventions`, `review-rubric`, `security-checklist`.
- Assessment: Role-aligned. No drift detected since the prior audit.
- Confidence: HIGH

**Finding 12 — Three dev agents share near-identical frontmatter & hooks**
- Files: `.claude/agents/dev-backend.md`, `dev-frontend.md`, `dev-platform.md`
- Observed: Each agent's YAML frontmatter differs only by `name`, `description`, and the file-tree scope it owns. PostToolUse hooks are byte-identical across all three.
- Assessment: Known duplication; parked item #18 on the roadmap tracks this. Blocked on Claude Code not yet supporting `imports:` / `extends:` in agent frontmatter.
- Confidence: HIGH (known, parked)

### Category: Repository Hygiene

**Finding 13 — Two prior audit cycles' outputs checked into the repo**
- Files: `docs/audit/*.md`, `docs/audit/health-check-2026-04.md`
- Observed: The repo tracks audit outputs. The `status.json` is also tracked. Running `/audit` mutates these files, which affects the working tree during audit runs.
- Assessment: Intentional (audit trail is useful). But it means that if a contributor runs `/audit` locally without meaning to commit, they'll produce a dirty working tree. The stop-hook `~/.claude/stop-hook-git-check.sh` then asks them to commit.
- Suggested fix: Consider moving transient audit state (`status.json`) under `.gitignore` and keeping only the finished phase markdown files tracked. Or leave as-is and document the expectation in `.claude/commands/audit.md`.
- Confidence: LOW

---

## Resolved Since Prior Audit

Verified cleared against prior `03-compliance.md` findings:

- Missing `.gitignore` → added, comprehensive.
- No JSDoc in `build-presentation.js` → 19 JSDoc blocks present.
- Stage 3 missing from `/status` → added.
- `pipeline-status` / `status` overlap → renamed to `pipeline-context`.
- Dev lint hooks silently discard output → now `tee` into `pipeline/lint-output.txt`.

## Possibly Intentional Deviations

1. **`SKILL.md` SCREAMING_CASE inside kebab-case dirs** — Claude Code convention, not a project choice.
2. **`AGENTS.md` duplicating CLAUDE.md** — Intentional compatibility shim for non-Claude-Code tools.
3. **`|| true` in lint hooks** — Pragmatic; output is now captured so visibility is retained.
4. **ESLint stub** — Defensible on a tiny JS surface area (~900 LOC excluding tests).
5. **Two near-identical dev agents** — Parked; platform-blocked on `imports:` support.

## Summary

Compliance posture is **solid and improving**. Of the original audit's 11 compliance findings, **7 are fully resolved** by April 2026 health-check work (gitignore, JSDoc, Stage 3 visibility, command rename, lint hook output capture, plus architecture-consistency items). The remaining open items (ESLint stub, lint-script naming, gate-validator defensive error handling, near-empty CLAUDE.md) are all low-to-medium severity and have clear, small fixes. Nothing here is blocking or architectural.
