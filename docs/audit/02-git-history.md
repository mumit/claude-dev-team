# 02 — Git History

## Volume and shape (last 6 months)

- **106 commits** (sustained ~18/month).
- **34 merge commits** — author squashes feature branches and merges via PR.
- **62%** of commits follow Conventional Commits (`feat:`, `fix:`, `docs:`,
  `chore:`, `refactor:`, `test:`); the remaining 38% are merge commits and a
  handful of legacy unprefixed commits.
- **Single author** for the entire 6-month window: `mumit-khan`. No
  co-authors, no second reviewer of record.

## Recent versions (from `CHANGELOG.md`)

| Version | Date | Theme |
|---|---|---|
| v2.6.0 | 2026-05-01 | Automation layer: Node CLI `claude-team.js`, 15 helper scripts, schemas, templates, `examples/tiny-app`, expanded test suite |
| v2.5.1 | 2026-04-23 | `/nano` track + correctness fixes (Stage 9 retro, Stage 5 gate file lock, security heuristic) |
| v2.5.0 | 2026-04-21 | Budget gate (config-level), PATTERN tag, lesson auto age-out, async checkpoints |
| v2.4.0 | 2026-04-21 | Deployment adapters + Stage 8 runbook requirement |
| v2.3.1 | 2026-04-21 | Scoped peer review + approval-derivation hook (closes self-approval loophole) |
| v2.3.0 | (earlier) | dev-platform split → dev-qa + security-engineer |

The v2.x stack landed in a tight burst on 2026-04-21, then v2.5.1 / v2.6 in
the following two weeks. Velocity is high; the framework is past the
"churning the model" phase.

## Churn hotspots

Top-changed files in the last 6 months, grouped:

**Documentation (high churn — expected, healthy)**
- `README.md` — 14 commits
- `CHANGELOG.md` — 11 commits
- `docs/build-presentation.js` — 10 commits
- `CONTRIBUTING.md` — 6 commits

**Rules and orchestration (high churn — pipeline shape evolving)**
- `.claude/rules/pipeline.md` — 9 commits
- `.claude/rules/gates.md` — 9 commits
- `.claude/rules/orchestrator.md` — 6 commits

**Agents (steady churn — interface tightening)**
- `.claude/agents/dev-platform.md` — 9 commits
- `.claude/agents/principal.md` — 6 commits
- `.claude/agents/dev-frontend.md` — 6 commits
- `.claude/agents/dev-backend.md` — 6 commits
- `.claude/agents/dev-qa.md` — 4 commits

**Hooks and validators (matched co-evolution with tests)**
- `.claude/hooks/gate-validator.js` — 6 commits
- `scripts/gate-validator.js` — 6 commits (mirrors the hook)
- `tests/gate-validator.test.js` — 4 commits

**Build / CI**
- `package.json` — 8 commits
- `.github/workflows/test.yml` — 4 commits
- `tests/bootstrap.test.js` — 6 commits

## Co-change patterns (hidden coupling)

- **`docs/audit/10-roadmap.md` ↔ `pipeline/context.md`** — 5 commits change
  both. Indicates audit findings are flowing into the live pipeline state,
  which is good practice but creates a hard coupling between an audit
  artefact and a pipeline runtime artefact. (Worth being aware of.)
- **`.claude/hooks/gate-validator.js` ↔ `tests/gate-validator.test.js`** —
  always co-changed. Healthy.
- **`.claude/hooks/gate-validator.js` ↔ `scripts/gate-validator.js`** — also
  co-changed in most commits, but **not all**. This is the latent drift bug
  flagged in finding C-01: the two files must be byte-similar, but no test
  pins them, and at least one commit in the recent past touched only one of
  the two.
- **`docs/build-presentation.js` ↔ `package-lock.json`** — co-change on
  Reveal.js / pptxgenjs version bumps. Expected.

## Trajectory

**Actively evolving:**
- Pipeline rule details (gate fields, retry semantics, security heuristic).
- Documentation (release notes, migration guide, presentation deck).
- Test infrastructure (the v2.6 commit added many new tests at once).

**Stabilising:**
- Agent persona definitions — text edits only, no role changes since v2.3.
- Bootstrap script — last meaningful change was cross-platform compat.
- Schemas — additive only; `stage-04a.schema.json` is the most recent
  addition.

## Commit quality

- **Median commit size:** 2 files. Interquartile 2–4.
- **Largest commit:** `7371ab4` — "feat: elevate claude with codex
  automation" — 59 files. This was the v2.6 automation layer landing in one
  commit. The size is justified (the automation surface is meaningless
  partial), but it does mean Stage-5-style review on the framework itself
  was not feasible for that commit.
- **Reverts:** essentially zero. No thrashing.
- **WIP / TODO / "fix later":** none observed in commit messages.
- **Merge messages** are uniform "Merge pull request #N from …" — fine for
  a one-author repo; would be sparser than ideal in a multi-author repo.

## Surprises

1. **All work by one author.** This is the framework that mandates two
   approvals per stage-05 gate on its target projects. The framework's own
   PRs do not have a second reviewer of record. This is not a defect, but
   it weakens the framework's ability to dogfood its own peer-review rule.
2. **`docs/build-presentation.js` is in the top-10 churn list and has no
   test file.** All other top-churn JS files have a paired test. (Finding
   T-03.)
3. **Two CHANGELOG entries dated `2026-04-21`** for v2.3.1, v2.4.0, v2.5.0
   suggest a same-day cut of three feature releases. Cross-check with the
   release-notes documents; they're labelled as separate work, just shipped
   together. Acceptable, but a future audit reviewer reading commit dates
   could be confused.
4. **No CI run on the merge commits themselves** — the CI matrix runs on PR
   pushes, not on merge-to-main. Combined with single-author, this means
   main has effectively the same CI guarantee as feature branches. Minor.
