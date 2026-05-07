# 03 — Convention Compliance

_Verified by: `npx eslint`, `npm test`, `npm run lint:frontmatter`,
`npm run validate`, `npm run parity:check`, `diff` on hook pairs._

## Summary

Almost everything passes. The headline is **two genuine compliance findings**
and a handful of "possibly intentional" deviations that warrant a one-line
documentation fix rather than a code change.

| Check | Result |
|---|---|
| ESLint (`scripts/`, `.claude/hooks/`, `tests/`) | clean — zero violations |
| Frontmatter schema (agents + skills) | clean — 90/90 assertions pass |
| Gate JSON schemas (`npm run validate`) | clean |
| Parity vs codex-dev-team (`npm run parity:check`) | clean (file presence + config keys) |
| `diff .claude/hooks/gate-validator.js scripts/gate-validator.js` | byte-identical now |
| `diff .claude/hooks/approval-derivation.js scripts/approval-derivation.js` | byte-identical now |
| `dependencies` in `package.json` | empty (zero runtime deps, as documented) |
| TODO/FIXME/HACK in source | none (only one in `coding-principles.md` that is itself the rule banning them) |

## Findings

### C-01 — Hook scripts duplicated across two paths with no test pinning them — MEDIUM

**Files:**
- `.claude/hooks/gate-validator.js` ↔ `scripts/gate-validator.js`
- `.claude/hooks/approval-derivation.js` ↔ `scripts/approval-derivation.js`

**Convention:** Source of truth should exist exactly once. The repo's own
coding principles (`.claude/rules/coding-principles.md` §3) say "match
existing style; don't refactor things that aren't broken" — but they don't
address whether two copies of the same file is OK.

**Deviation:** Both pairs are byte-identical at HEAD, but git log shows at
least one commit in the recent past that touched only one of the two. The
two-copy pattern is intentional (the hook copies are loaded by the Claude
Code harness via `settings.json`, the script copies are entry points for
`scripts/claude-team.js` / npm scripts) — but **no test asserts they remain
byte-identical**. Drift is undetected until production behaviour diverges.

**Suggested fix:** Add `tests/hook-parity.test.js` that reads both files
with `fs.readFileSync` and asserts `crypto.createHash('sha256')` equality.
~10 lines. Alternative: replace one with a `require('../scripts/...')` re-
export, but that complicates Claude Code hook loading semantics; the test
is safer.

**Confidence: HIGH** — diff currently empty, but no enforcement.

### C-02 — `parity-check.js` references `budget` config but no `scripts/budget.js` exists — MEDIUM

**File:** `scripts/parity-check.js:8` and `:68`

**Convention:** `pipeline.md` Stage 0 documents budget tracking writing
`pipeline/budget.md` with running totals at every stage boundary.
`config.example.yml` exposes `budget.enabled` / `budget.tokens_max` /
`budget.wall_clock_max_min`.

**Deviation:** No script in `scripts/` actually implements the tracker.
`parity-check.js` validates that the config key exists (which it does) but
nothing writes `pipeline/budget.md`. The sibling repo
`../codex-dev-team/scripts/budget.js` is a 100-LOC implementation. The
orchestrator agent is therefore being told to do something the framework
provides no tooling for; in practice the budget gate never fires.

**Suggested fix:** Port `codex-dev-team/scripts/budget.js` (it has no Codex-
specific dependencies). Wire `claude-team.js` so `claude-team budget init`,
`claude-team budget update <stage> <tokens> <minutes>`, `claude-team budget
check` all work. Add tests modelled on the existing pattern. Estimated
effort: S (~1 day, 1 PR).

This is also tracked as `S-04` (security/process) and `Q-01` (code quality)
because the documented behaviour does not match shipped behaviour.

**Confidence: HIGH** — verified by `ls scripts/` against doc claims.

### C-03 — `approval-derivation` PostToolUse hook matcher is `Write|Edit` (unfiltered) — LOW

**File:** `.claude/settings.json` lines 38–46.

**Convention:** Claude Code matchers can scope to a path, so a hook that
only cares about one directory should not fire on every save.

**Deviation:** The matcher fires on every `Write` and `Edit` anywhere in
the project. The hook itself short-circuits in <10 ms when the path isn't
under `pipeline/code-review/` (verified in `approval-derivation.js`
`isReviewFile()` at lines ~130–143). The current settings cannot express
"match a path glob inside Write|Edit", so this is a Claude-Code-side
limitation rather than a framework defect — but the framework does not
document it.

**Suggested fix:** Document the rationale in a comment in
`settings.json` (it's plain JSON; comments are not allowed) or, better, a
note in `.claude/hooks/README.md` (which doesn't exist yet — see D-02).
Track as P-02 in the perf section since it's a real-but-tiny cost on every
save during normal dev work.

**Confidence: MEDIUM** — micro-cost, not a defect.

## Possibly intentional deviations

### Two hook script copies (C-01 above)
Genuinely intentional; the issue is lack of test enforcement, not the
duplication itself.

### `docs/build-presentation.js` lives in `docs/` rather than `scripts/`
This 934-LOC build-time script is in `docs/` because its outputs (the
Reveal.js deck) are docs artefacts, not pipeline tools. Defensible. The
test surface around it is thin (one smoke test, no unit coverage) — see
T-03.

### Reviewer agent has `Write` permission
The reviewer (`.claude/agents/reviewer.md`) lists `Write` in `tools`. At
first glance this contradicts the READ-ONLY rule. The policy is enforced
by *path*, not by tool scope: reviewers can `Write` to
`pipeline/code-review/by-<name>.md`, but the rules forbid them writing to
`src/`, and the approval-derivation hook ignores any review file content
that doesn't land in `pipeline/code-review/`. Tightening this to a
strictly-scoped tool would require Claude Code to support per-path tool
scopes. Acceptable.

### v2.3 `dev-platform` split mentioned across many files
Every reference checked is correct. `dev-qa` owns Stage 6 + tests;
`dev-platform` owns 4.5a (lint/SCA), CI, and Stage 8 deploy;
`security-engineer` owns 4.5b (conditional veto). No stale "dev-platform
runs the test suite" sentences remain.

### Missing `dependencies` field in `package.json`
The deliberate zero-runtime-dep stance. `pptxgenjs`, `react`, `sharp` etc.
are devDependencies because they are only used by `docs/build-presentation.js`
when an author rebuilds the deck. Defensible; perhaps note this stance in
README or CONTRIBUTING so a future contributor doesn't "fix" it.

## What's well-enforced (preserve)

- **Frontmatter schema test** catches missing `name`, `description`,
  `tools`, `model`, `permissionMode` on every agent and skill at CI time.
- **Parity check** catches missing helper scripts, schemas, templates,
  or config sections vs the codex sibling.
- **Gate validator** is itself unit-tested with 26 assertions including
  bypassed-escalation detection (which solves a v2.0 silent-violation
  bug).
- **Conventional Commits** is observed at 62%; the remaining 38% are
  merge commits, which is acceptable.
