# Documentation Gaps

## README Quality: Excellent

`README.md` is comprehensive and well-structured:
- Clear prerequisites and setup instructions ✅
- "When to Use What" decision table ✅
- Pipeline overview with checkpoint table ✅
- Audit workflow explanation ✅
- Project structure diagram ✅
- Agent model rationale ✅
- Gate system explanation ✅
- Customisation guide ✅
- Known limitations ✅
- Links to supporting docs ✅

**One issue**: The README references `github.com/mumit/claude-dev-team` but the actual repo appears to be at `github.com/mumit-khan/...` based on git remote and PR URLs.

## Component Documentation

| Component | Documented? | Quality |
|---|---|---|
| Agents (5) | ✅ Complete | Each has clear role, responsibilities, input/output per task type |
| Commands (18) | ✅ Complete | Each has description frontmatter and usage instructions |
| Skills (6) | ✅ Complete | Each has description, trigger phrases, and detailed guidance |
| Rules (4) | ✅ Complete | Machine-readable process definitions |
| Gate validator | ✅ Partial | Top-level comment explains purpose, but no inline comments on logic |
| Bootstrap script | ✅ Complete | Header comment + inline echo statements explain each step |
| build-presentation.js | ❌ Minimal | Top comment only. 684 lines with no function docs |

## API Documentation: N/A

Not applicable — this is not an API project. The API conventions skill documents patterns for target projects.

## Inline Documentation

### gate-validator.js
- Has a top-level block comment explaining purpose ✅
- No inline comments on the validation logic ⚠️
- The exit code meanings (0, 1, 2, 3) are commented ✅
- Missing: comment explaining why `mtime` sorting is used (to find the latest gate)

### build-presentation.js
- 684 lines, zero function-level documentation ❌
- Color palette constants have no explanation of design intent ⚠️
- Slide-building functions have cryptic parameter names (`x`, `y`, `w`, `h`) — positional layout without comments ⚠️
- The `main()` function is 400+ lines of sequential slide construction with no section markers ❌

### bootstrap.sh
- Well-documented with section headers and echo statements ✅
- Each step has a clear comment ✅
- The `cp -rn` flag choice is not explained (non-obvious: copies without overwriting) ⚠️

## Stale Documentation

**Finding 1: Repository URL**
- `docs/lifecycle.md:195` and `docs/faq.md:147` reference `github.com/mumit/claude-dev-team`
- PRs in this repo's git history show `mumit-khan` as the GitHub user, but `mumit` is a separate account and the canonical URL for this project
- Assessment: **Not stale** — intentional use of the `mumit` account
- Confidence: LOW

**Finding 2: EXAMPLE.md references non-existent directories**
- `EXAMPLE.md` throughout references `src/backend/`, `src/frontend/`, `src/infra/`, `src/tests/`
- These directories don't exist in the framework repo
- Assessment: **Not stale** — the example describes what happens when the framework is *used* in a target project. But this could confuse someone reading the repo who expects those paths to exist.
- Confidence: **LOW** — intentional, but worth a clarifying note

**Finding 3: README says "Agent Teams is experimental (requires v2.1.32+)"**
- This note should be updated as Agent Teams graduates from experimental status
- Confidence: **MEDIUM** — may already be stable depending on Claude Code version

## Onboarding Test: What Would a New Developer Struggle With?

1. **"Where's the code?"** — A developer expecting `src/` will find only Markdown, a shell script, and two JS files. The README explains the framework concept but doesn't explicitly say "this repo has no application source code." Someone cloning and running `npm install` or `npm start` will get nothing.

2. **"How do I test changes to the framework?"** — There's no test suite and no documented way to verify that edits to agent definitions, commands, or skills work correctly. The only way to test is to bootstrap into a real project and run a pipeline, which is slow and manual.

3. **"What's the difference between commands, skills, and rules?"** — The README lists them but a newcomer would benefit from a "Concepts" section explaining: commands are explicit user-triggered workflows, skills are passive knowledge loaded by context, rules are machine-readable process definitions read by the orchestrator.

4. **"How do I run `build-presentation.js`?"** — The README says `npm install pptxgenjs react-icons react react-dom sharp && node docs/build-presentation.js` but there's no `package.json` to pin versions. A future React/sharp version break would be hard to diagnose.

5. **"Can I modify agent definitions safely?"** — There's no validation that agent YAML frontmatter is correct. A typo in `tools:`, `model:`, or `skills:` would silently fail at runtime. No schema, no linter, no test.

## Summary

Documentation quality is **above average** for a framework project. The README, lifecycle guide, FAQ, and example walkthrough form a comprehensive documentation set covering different audiences. The main gaps are:

1. **No "Concepts" primer** — newcomers need to understand commands vs skills vs rules
2. **No development/contribution guide** — how to modify and test the framework itself
3. **build-presentation.js is a documentation black hole** — largest file in the repo, least documented
4. **No package.json** — makes dependency management for build-presentation.js fragile
