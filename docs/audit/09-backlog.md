# 09 — Synthesis & Backlog

## Themes (3–5)

After consolidating findings across compliance, tests, docs, security,
performance, and code quality:

### Theme 1 — Drift between two surfaces (claude vs codex, hooks vs scripts, slash vs CLI)

The repo has three places where the same logic exists in two
locations and must stay in sync:
- `.claude/hooks/*.js` ↔ `scripts/*.js` (byte-identical)
- claude-dev-team ↔ codex-dev-team (parity check exists, partial)
- `.claude/commands/*.md` ↔ `claude-team.js` subcommands (no test)

Drift is the most likely future bug source. None of these pairs is
fully test-pinned.

### Theme 2 — Documented behaviour that the framework does not actually implement

- Budget gate (`pipeline.md` Stage 0) — no `scripts/budget.js`.
- Visualization (codex has `scripts/visualize.js`; claude has nothing).
- Stoplist enforcement — documented as mandatory, not programmatically
  enforced.

These aren't bugs in the strict sense (the documented mechanisms are
"someone might run this"); they are *honour-system gaps* where the rule
exists but the tooling doesn't.

### Theme 3 — Honour-system safety boundaries

The framework has elegant programmatic guards (approval-derivation
single-writer, bypassed-escalation sweep, security veto) but several of
the touted safety claims are honour-system: stoplist routing,
READ-ONLY reviewer, two-round review limit. These are correct *as
agent instructions* but not enforced by the harness. The audit's
honest position is that this is acceptable for v2.6 but should be
named in the docs so users don't over-trust.

### Theme 4 — Onboarding cliff between "install" and "first pipeline"

A new user can install the framework in five minutes (excellent) but
runs into three small frictions on their first pipeline run: no link
to EXAMPLE.md from README, no surface mention of `config.example.yml`
adapter selection, no documented review-marker grammar in user-facing
docs. None is severe; all three are 30-minute fixes.

### Theme 5 — Test-coverage shape is breadth-good, depth-uneven

265 assertions broadly cover gates, hooks, bootstrap, frontmatter,
contracts. The depth-thin areas are: concurrent reviewer writes,
real-world security-heuristic trigger paths, adapter contracts,
cross-surface (slash↔CLI↔hook) parity, and `docs/build-presentation.js`
beyond syntax check.

## Prioritised backlog

### P0 — Fix now (security or correctness blocker)

None. The audit found no critical issues.

### P1 — Quick wins (small effort, real impact)

| ID | Title | Theme | Effort | Risk of NOT changing | Confidence |
|---|---|---|---|---|---|
| **B-1 [DONE]** | Add `tests/hook-parity.test.js` to pin the two hook copies byte-equal | Theme 1 | XS | Medium — silent drift would break the harness or the CLI | HIGH |
| **B-2 [DONE]** | Tighten `Bash(curl *)` allow in `settings.json` to a hostname allow-list | Theme 3 | XS | Medium — broad allow lets compromised agent exfiltrate | HIGH |
| **B-3 [DONE]** | Distinguish error classes in `gate-validator.js` so `EACCES` exits 1 (FAIL) instead of 0 (PASS) | Theme 3 | XS | Medium — silent PASS on permission error could hide real failures | HIGH |
| **B-4 [DONE]** | Add `description` fields to `schemas/*.schema.json` (one line each) | Theme 4 | XS | Low — improves contributor UX | HIGH |
| **B-5 [DONE]** | Write `templates/README.md` listing the 11 templates with one-line purpose each | Theme 4 | XS | Low — improves contributor UX | HIGH |
| **B-6 [DONE]** | Write `.claude/hooks/README.md` documenting hook events + exit codes | Theme 4 | XS | Low — improves contributor UX | HIGH |
| **B-7 [DONE]** | README "First 30 minutes" addition: link EXAMPLE.md, show adapter one-liner | Theme 4 | XS | Low — improves first-run UX | HIGH |
| **B-8 [DONE]** | Add `LOCK_RETRIES` / `LOCK_DELAY_MS` rationale comments | Theme 3 | XS | Low — improves maintainability | HIGH |
| **B-9 [DONE]** | Add 1:1 cross-check test between `.claude/commands/` and `claude-team.js` subcommands | Theme 1 | S | Medium — surfaces drift the user wouldn't catch | MEDIUM |
| **B-10 [DONE]** | Extract framework-contract lists to a shared `tests/_framework-contract.js` | Theme 1 | XS | Low — reduces duplication | HIGH |

### P2 — Targeted improvements (medium effort, focused payoff)

| ID | Title | Theme | Effort | Risk of NOT changing | Confidence |
|---|---|---|---|---|---|
| **B-11 [DONE]** | Port `scripts/budget.js` from codex-dev-team and wire `claude-team.js budget {init,update,check}` | Theme 2 | S | Medium — documented escalation never fires; runaway pipeline silent | HIGH |
| **B-12** | Add `scripts/visualize.js` (Mermaid state diagram from gate state) — port from codex | Theme 2 | S | Low — quality-of-life | MEDIUM |
| **B-13 [DONE]** | Pre-flight regex check in `claude-team.js` for stoplist matches; reject `/quick`, `/nano` etc. when matched | Theme 3 | S | Medium — prevents accidental skip of full pipeline on auth/PII changes | HIGH |
| **B-14 [DONE]** | Concurrency test for `approval-derivation.js`: spawn two concurrent review writes, assert both approvals land | Theme 5 | S | Medium — closing T-01; the file-lock model deserves a real concurrency test | HIGH |
| **B-15 [DONE]** | Table-driven test for `security-heuristic.js` with 15–20 sample paths from `pipeline.md` Stage 4.5b list | Theme 5 | XS | Low — closes T-02 | HIGH |
| **B-16** | Cap `JSON.parse` input on gate files to 1 MB to bound memory | Theme 3 | XS | Low — defence in depth | MEDIUM |
| **B-17 [DONE]** | Replace `claude-team.js` if-chain dispatch with object-map dispatch | Theme 1 | S | Low — maintainability and drift safety | HIGH |
| **B-18** | Adapter-contract test: parse each `.claude/adapters/*.md` for required H2 sections | Theme 5 | S | Low — closes T-05 | MEDIUM |
| **B-19 [DONE]** | Release-version consistency test (`VERSION`, `package.json`, configs) | Theme 5 | XS | Low — closes Q-T-4 | HIGH |
| **B-20** | Document hook command's `git rev-parse` requirement and add fallback so `.git`-less checkouts still work | Theme 3 | S | Low — only matters if a user works outside git | MEDIUM |

### P3 — Strategic investments (larger effort, long horizon)

| ID | Title | Theme | Effort | Risk of NOT changing | Confidence |
|---|---|---|---|---|---|
| **B-21** | Split `.claude/rules/pipeline.md` into pipeline-core/pipeline-build/pipeline-tracks files | Theme 1 | M | Low — current monolith works; split would speed agent context loads | MEDIUM |
| **B-22** | Replace busy-spin lock retry loop with async `setTimeout`-based wait | Theme 3 | S | Low — micro-optimisation, but cleaner | LOW |
| **B-23** | Add structured-log mode (`LOG_FORMAT=json`) to both hooks for external observability | Theme 5 | M | Low — useful for orchestrators integrating with CI | MEDIUM |
| **B-24** | Consider porting Codex's async-checkpoint conditional auto-pass to claude-dev-team | Theme 2 | M | Low — claude has the config plumbing already; impl missing | MEDIUM |
| **B-25** | Expand parity-check.js to include behavioural assertions (not just file presence) | Theme 1 | M | Medium — current parity check is shallow | MEDIUM |
| **B-26** | Move `docs/build-presentation.js` to `scripts/`, give it real unit tests | Theme 5 | M | Low — keeps docs/ a doc dir | LOW |
| **B-27** | Add an ADR documenting the bilateral coupling between `pipeline.md` and agent prompts (Q-08) | Theme 1 | XS | Low — defensive doc | LOW |

### Parked (intentionally not doing)

| ID | Title | Reason |
|---|---|---|
| **PK-1** | Replace bespoke YAML / JSON parsing with `gray-matter` / `ajv` | Zero-runtime-dep stance is deliberate; adding deps to save ~50 LOC trades supply-chain surface for code we already trust |
| **PK-2** | Switch from `node:test` to jest/vitest | Native runner is fast, dep-free, and idiomatic; switching would add deps without benefit |
| **PK-3** | Move two hook copies to a single source of truth via require | Claude Code hook loading expects a standalone executable; the require trampoline complicates harness vs CLI invocation. The byte-equality test (B-1) is the simpler safer choice |
| **PK-4** | Sunset `docs/build-presentation.js` | Active stakeholder use; deck is the primary onboarding visual |

## Confidence summary

- **HIGH confidence findings:** B-1, B-2, B-3, B-4, B-5, B-6, B-7, B-8, B-10, B-11, B-13, B-14, B-15, B-19.
- **MEDIUM confidence findings:** B-9, B-12, B-16, B-17, B-18, B-20, B-21, B-23, B-24, B-25.
- **LOW confidence (more discussion needed):** B-22, B-26, B-27.

No findings are speculative; every item points to a concrete file or a
concrete documented mismatch.
