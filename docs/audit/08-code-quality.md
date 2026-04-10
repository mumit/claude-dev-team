# Code Quality

## Context

This repo has 46 files. Only 3 contain executable code: `gate-validator.js` (90 lines), `bootstrap.sh` (157 lines), and `build-presentation.js` (684 lines). The rest is Markdown. Code quality analysis focuses on these 3 files plus cross-cutting quality of the Markdown configuration files.

---

## 1. Duplication

**Finding Q1: Agent PostToolUse hook duplicated across 3 dev agents**
- Files: `.claude/agents/dev-backend.md:19-22`, `dev-frontend.md:17-20`, `dev-platform.md:17-20`
- Effort: **Small** | Impact: **Low** | Confidence: **HIGH**
- All three dev agents have identical PostToolUse hooks:
  ```yaml
  hooks:
    PostToolUse:
      - matcher: "Write|Edit"
        hooks:
          - type: command
            command: "cd $(git rev-parse --show-toplevel) && npm run lint --if-present || true"
  ```
- This is a maintenance risk: if the lint command needs to change, it must be updated in 3 files.
- Assessment: Likely unavoidable given Claude Code's agent definition format — there's no "shared hooks" mechanism. **Intentional duplication.**

**Finding Q2: Review task instructions duplicated across 3 dev agents**
- Files: `.claude/agents/dev-backend.md:44-63`, `dev-frontend.md:38-52`, `dev-platform.md:72-88`
- Effort: **Small** | Impact: **Low** | Confidence: **HIGH**
- All three agents have similar "On a Code Review Task" sections with the same file-reading order and classification scheme (BLOCKER/SUGGESTION/QUESTION). The specifics differ (each agent focuses on different aspects), but the structure is copy-pasted.
- Assessment: The structural duplication is intentional — each agent needs self-contained instructions. The differences (backend focuses on API correctness, frontend on XSS, platform on testability) are well-tailored.

**Finding Q3: build-presentation.js has repetitive slide construction patterns**
- File: `docs/build-presentation.js` throughout
- Effort: **Medium** | Impact: **Medium** | Confidence: **HIGH**
- The `build()` function is ~620 lines of sequential slide construction. Each slide repeats patterns like:
  - Create slide, set background
  - Add title text with the same font/size
  - Add subtitle text with the same font/size
  - Add cards/rows in a loop
- The `addCard()` and `sectionSlide()` helpers reduce *some* duplication, but the majority of slide code is still manual coordinate-based layout.
- Suggested fix: Extract more reusable layout helpers (e.g., `addTitleSubtitle()`, `addTable()`, `addTwoColumn()`). This would cut the file by ~30%.
- Assessment: Since this is a standalone tool run once, the ROI on refactoring is low.

## 2. Complexity Hotspots

**Finding Q4: build-presentation.js `build()` function is 620+ lines**
- File: `docs/build-presentation.js:61-682`
- Effort: **Medium** | Impact: **Medium** | Confidence: **HIGH**
- This is by far the highest-complexity function in the repo. It constructs 18 slides sequentially with inline data, layout coordinates, and styling.
- The function uses block scoping (`{ const s = ... }`) for each slide, which provides some isolation but doesn't reduce line count.
- Suggested fix: Split into `buildTitleSlide()`, `buildProblemSlide()`, etc. Each becomes ~30-40 lines. The `build()` function becomes an 18-line orchestrator.
- Assessment: Low priority — the file works, is rarely modified (1 commit), and is not part of the framework runtime.

**Finding Q5: gate-validator.js is simple and well-structured** ✅
- File: `.claude/hooks/gate-validator.js` (90 lines)
- Linear flow: check dir → find latest file → parse → validate → report. No nesting beyond if/else. Easy to follow.

## 3. Dead Code

**No dead code found.** ✅

- All functions in `build-presentation.js` are called
- All files in `.claude/` are referenced by at least one command, agent, or skill
- No commented-out code blocks
- No orphaned files

## 4. Abstraction Health

**Finding Q6: Skill definitions mix "what" (rules) with "how" (instructions)**
- Files: `.claude/skills/implement/SKILL.md`, `.claude/skills/pre-pr-review/SKILL.md`
- Effort: **Small** | Impact: **Low** | Confidence: **MEDIUM**
- The `implement` skill is 94 lines combining: triggering rules, context-loading steps, planning template, execution rules, and verification checklist. The `pre-pr-review` skill is 103 lines.
- These are well-written but dense. A developer modifying the implement workflow must read and understand the entire file.
- Assessment: Acceptable for the current size. If skills grow beyond ~150 lines, consider splitting into a "rules" section and a "workflow" section.

**Finding Q7: Command definitions are appropriately thin**  ✅
- Most commands (e.g., `pipeline.md`, `status.md`, `reset.md`) are under 60 lines and delegate real work to agents or rules files.
- The `/audit` command is the longest at ~100 lines but is clearly structured with phases.

## 5. Naming and Clarity

**Finding Q8: Inconsistent command naming — `pipeline-status` vs `status`**
- Files: `.claude/commands/pipeline-status.md` and `.claude/commands/status.md`
- Effort: **XS** | Impact: **Low** | Confidence: **MEDIUM**
- Both show pipeline status. `pipeline-status` is for compaction context dumps, `status` is for user-facing dashboards. The names don't clearly communicate this distinction.
- Suggested fix: Rename `pipeline-status` to `pipeline-context` or `pipeline-dump` to better reflect its purpose (context preservation, not status display).

**Finding Q9: Magic numbers in build-presentation.js**
- File: `docs/build-presentation.js` throughout
- Effort: **Medium** | Impact: **Low** | Confidence: **HIGH**
- Slide coordinates use raw numbers: `x: 0.7`, `y: 1.55`, `w: 4.3`, `h: 3.6`. These are layout coordinates for pptxgenjs and are inherently positional, but recurring values like margins (0.7), card widths (4.1, 4.3), and font sizes (11, 12, 13) could be named constants.
- Assessment: Acceptable for a presentation script. Named constants would help maintainability but the script is rarely modified.

**Finding Q10: Gate stage naming inconsistency**
- File: `.claude/rules/gates.md` and `.claude/commands/status.md`
- Effort: **XS** | Impact: **Low** | Confidence: **HIGH**
- Gate files use `stage-01`, `stage-02`, etc. But Stage 4 uses `stage-04-backend`, `stage-04-frontend`, `stage-04-platform`. Stage 5 uses `stage-05-backend`, etc.
- This is well-documented in the rules but creates a mixed naming pattern: some stages have one gate, some have three. The status command needs to handle both formats.
- Assessment: **Intentional** — reflects the actual pipeline structure where stages 4-5 have per-area gates. Not a bug.

## 6. Dependency Health

**Finding Q11: No dependency manifest**
- Effort: **Small** | Impact: **Medium** | Confidence: **HIGH**
- The repo has no `package.json`. Dependencies are:
  - `gate-validator.js`: Node.js builtins only (✅ excellent)
  - `build-presentation.js`: `pptxgenjs`, `react`, `react-dom`, `sharp`, `react-icons` (❌ unmanaged)
- Adding a `package.json` would enable: version pinning, `npm audit`, dependency updates via Dependabot/Renovate.
- Suggested fix: Add `package.json` with the presentation deps as `devDependencies`.

---

## Summary

| # | Finding | Effort | Impact | Confidence |
|---|---|---|---|---|
| Q1 | PostToolUse hooks duplicated across agents | Small | Low | HIGH |
| Q2 | Review instructions duplicated across agents | Small | Low | HIGH |
| Q3 | Repetitive slide construction patterns | Medium | Medium | HIGH |
| Q4 | `build()` function is 620+ lines | Medium | Medium | HIGH |
| Q5 | gate-validator.js is simple and clean | ✅ | ✅ | HIGH |
| Q6 | Skills mix rules with workflow | Small | Low | MEDIUM |
| Q7 | Commands are appropriately thin | ✅ | ✅ | HIGH |
| Q8 | Confusing `pipeline-status` vs `status` names | XS | Low | MEDIUM |
| Q9 | Magic numbers in presentation script | Medium | Low | HIGH |
| Q10 | Mixed gate naming pattern (intentional) | N/A | N/A | HIGH |
| Q11 | No dependency manifest | Small | Medium | HIGH |

**Overall quality**: Good for the framework's executable code. `gate-validator.js` is clean and well-structured. `bootstrap.sh` is well-commented. `build-presentation.js` is the only file with significant quality debt, but it's a standalone tool with low modification frequency.
