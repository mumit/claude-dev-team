# Sequenced Roadmap

## Batch 1 — Immediate (P0 fixes)

These three items are foundational. They unblock everything else and should land in a single PR or two adjacent PRs.

| # | Item | Effort | Parallel? | Verification |
|---|---|---|---|---|
| 1 | [DONE] Add `package.json` with test script and dev deps | XS | Yes (with #3) | `npm install` succeeds, `npm test` runs (even if no tests yet) |
| 2 | [DONE] Add `.gitignore` | XS | Yes (with #1) | `git status` shows no untracked generated files |
| 3 | [DONE] Add tests for `gate-validator.js` | S | After #1 | `npm test` passes, all exit code paths covered |

**Estimated effort**: 1-2 hours total.

**Infra changes**: None. Just new files at repo root.

**Order**: Items 1 and 2 can be done in parallel. Item 3 depends on item 1 (needs `package.json` for `npm test`).

---

## Batch 2 — Weeks 1-2 (P1 quick wins)

Small, independent fixes that improve reliability and polish. Each can be its own commit or small PR.

| # | Item | Effort | Parallel? | Verification |
|---|---|---|---|---|
| 4 | [DONE] Add worktree cleanup to `/reset` | XS | Yes | `/reset` lists and removes dev-team-* worktrees |
| 5 | [DONE] Add Stage 3 to `/status` dashboard | XS | Yes | `/status` output includes Stage 03 row |
| 6 | [DONE] Fix `bootstrap.sh` cross-platform portability | S | Yes | `bootstrap.sh` runs on Ubuntu without errors |
| 7 | [DONE] Capture lint output from dev agent hooks | XS | Yes | After a build, `pipeline/lint-output.txt` exists |

**Estimated effort**: 2-3 hours total.

**Infra changes**: None.

**Order**: All four items are independent — can be parallelized or done in any order.

---

## Batch 3 — Weeks 3-6 (P2 targeted improvements)

These build on Batch 1 foundations and improve the contributor experience.

| # | Item | Effort | Depends On | Verification |
|---|---|---|---|---|
| 8 | [DONE] Integration tests for `bootstrap.sh` | M | #1 (package.json) | `npm run test:integration` passes |
| 9 | [DONE] Add `CONTRIBUTING.md` | S | #1, #3 (so it can reference `npm test`) | New contributors can follow the guide |
| 10 | [DONE] Add CI workflow (`.github/workflows/test.yml`) | S | #1, #3 (tests exist) | GitHub Actions runs `npm test` on PR |
| 11 | [DONE] Rename `pipeline-status` → `pipeline-context` | XS | None | Command works under new name |
| 12 | [DONE] Manage `context.md` growth in `/reset` | XS | None | After `/reset`, context.md is reset to template |

**Estimated effort**: 1-2 days total.

**Infra changes**: GitHub Actions workflow.

**Order**:
- Items 11 and 12 are independent — can start immediately.
- Item 9 (CONTRIBUTING.md) should wait until items 1 and 3 are done so it can document `npm test`.
- Item 10 (CI) requires items 1 and 3 (tests exist to run).
- Item 8 (bootstrap tests) requires item 1 (package.json).

---

## Batch 4 — Month 2+ (P3 strategic investments)

Larger improvements that require more thought and carry some risk.

| # | Item | Effort | Depends On | Mini-Proposal |
|---|---|---|---|---|
| 13 | Refactor `build-presentation.js` | M | #1 | Split `build()` into per-slide functions. Extract layout helpers. Add JSDoc. Run the script before and after to diff output — slides must be identical. |
| 14 | Schema validation for agent/skill YAML frontmatter | S | #1, #3 | Write a test that parses all `.claude/agents/*.md` and `.claude/skills/*/SKILL.md`, extracts YAML frontmatter, and validates required fields. Add to `npm test`. |
| 15 | Document stage timeout expectations | S | None | Add duration guidance to `pipeline.md`. Research whether Claude Code has any timeout hooks that could surface warnings. |

**Estimated effort**: 1-2 days total.

**Infra changes**: None.

**Order**: Items 14 and 15 are independent. Item 13 is standalone but has medium risk (layout changes could break the deck).

---

## Roadmap Risks

1. **Claude Code API changes** — Agent frontmatter schema, hook format, or permission model changes could require updates across all 5 agents and settings.json. The framework is tightly coupled to Claude Code's (currently experimental) Agent Teams feature.

2. **Presentation script fragility** — `build-presentation.js` depends on exact pptxgenjs coordinate behavior. A major version bump of pptxgenjs could break layout. Version pinning (Batch 1, item 1) mitigates this.

3. **Low test ROI perception** — Testing markdown-based configuration is unusual. The gate-validator tests (Batch 1) have clear ROI, but bootstrap and frontmatter tests (Batches 3-4) may feel like over-engineering for a 46-file project. Counter-argument: these tests protect the most fragile parts of the framework.

4. **Re-sequencing triggers**:
   - If Claude Code graduates Agent Teams from experimental → review all "experimental" references
   - If Claude Code adds `extends:` or `imports:` for agents → revisit Parked item #18
   - If a bug is found in gate-validator.js in production → elevate Batch 1 to emergency
