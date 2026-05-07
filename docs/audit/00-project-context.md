# 00 — Project Context

_Audit run: 2026-05-07. Scope: full repo. Prior audit archived under `archive-2026-04-16/`._

## What this is

`claude-dev-team` is a **framework/template repo** that bootstraps a simulated
9-stage software dev team into a target project. It does not contain `src/`
itself — `src/` is created inside target projects after `bootstrap.sh` runs.
The team is composed of 8 agents (PM, Principal, 5 devs, peer reviewer)
plus a security engineer that fires conditionally.

There is a sibling repo, `../codex-dev-team`, which is the same framework
re-targeted at the Codex CLI. The two are intentionally near-parity at the
schema/template/gate layer; CLI surfaces and runtime hooks diverge.

## Languages, frameworks, build

| Concern | Choice |
|---|---|
| Runtime | Node.js (20+, 22 in CI) |
| Test runner | `node:test` + `node:assert/strict` (no external runner) |
| Lint | ESLint 9 flat config (`eslint.config.js`) |
| Frontmatter parser | bespoke (regex), no `gray-matter` dep |
| YAML | bespoke (regex), no `js-yaml` dep |
| JSON Schema | bespoke shallow validator, no `ajv` dep |
| Runtime deps | **zero** — all 7 packages in `package.json` are devDependencies |

The deliberate "zero runtime deps" stance keeps the bootstrap surface tiny and
the supply-chain surface near zero. All schema validation, hook logic, and CLI
helpers are inlined.

## Commands

| Purpose | Command |
|---|---|
| Install dev deps | `npm install` |
| All tests (~265 assertions, 16 test files) | `npm test` |
| Bootstrap integration tests | `npm run test:integration` (requires `rsync`) |
| Frontmatter schema test | `npm run lint:frontmatter` |
| Lint JS | `npm run lint` |
| Verify framework health | `npm run doctor` |
| Validate gate JSON against schemas | `npm run validate` |
| Parity check vs codex-dev-team | `npm run parity:check` |

CI runs on Node 20 and 22.

## Deploy target

This repo does not deploy itself. It bootstraps into target projects via
`bootstrap.sh` or `node scripts/bootstrap.js`. Target projects then run
`/pipeline` (Stage 8) using one of four pluggable deploy adapters:
`docker-compose` (default), `kubernetes`, `terraform`, `custom` — defined in
`.claude/adapters/*.md`.

## Codebase size

| Area | Files | Notes |
|---|---|---|
| `.claude/agents/` | 8 | PM, Principal, 5 devs, reviewer + security-engineer |
| `.claude/commands/` | 23 slash commands | mirror most of the CLI surface |
| `.claude/skills/` | 6 | implement, pre-pr-review, conventions, review-rubric, security-checklist |
| `.claude/rules/` | 7 | orchestrator, pipeline, gates, escalation, coding-principles, retrospective, compaction |
| `.claude/hooks/` | 2 (~684 LOC) | gate-validator + approval-derivation |
| `.claude/adapters/` | 4 + README | deploy adapters |
| `.claude/references/` | 2 | audit-phases, audit-extensions-example |
| `scripts/` | 16 | `claude-team.js` CLI (~1.3k LOC) + 15 helpers |
| `schemas/` | 11 | gate base + 10 stage schemas |
| `templates/` | 11 | canonical pipeline artifact scaffolds |
| `tests/` | 16 test files | ~265 assertions across unit/integration/CLI/release/frontmatter |
| `docs/` | 36 | adoption guide, user guide, release notes, FAQ, presentation deck builder |
| `examples/` | 1 | `tiny-app/` for dogfooding bootstrap |

Single-package, not a monorepo.

## Conventions

**Documented:**
- Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `test:`).
- YAML frontmatter required on all agent/skill markdown files; validated by
  `tests/frontmatter.test.js`.
- Gate schema contract in `.claude/rules/gates.md`; every JSON gate must have
  `stage`, `status`, `agent`, `track`, `timestamp`, `blockers`, `warnings`.
- READ-ONLY reviewer rule (Stage 5 reviewers must not edit `src/`).
- 4 binding coding principles (`coding-principles.md`).

**Implied (not in any single doc but uniformly observed):**
- Per-stage gates land at `pipeline/gates/stage-NN.json`; per-area gates use
  `stage-NN-<area>.json`.
- Hook scripts live in two locations: `.claude/hooks/` (registered via
  `settings.json`) and `scripts/` (callable from `claude-team.js`). The two
  copies are kept byte-similar but technically duplicated — see compliance
  finding C-01.
- Templates live in two places too: `templates/` (canonical, agent-facing) and
  `docs/*-template.md` (human-facing); the relationship is not documented
  anywhere obvious.

## Comparison context — codex-dev-team

The audit was informed by side-by-side comparison with `../codex-dev-team`
(same framework, Codex CLI variant, currently v1.2.0 unreleased). The two
share core gate schemas, templates, and pipeline shape. Notable deltas:

- **codex has `scripts/budget.js` and `scripts/visualize.js`; claude does
  not.** Both repos reference `budget` in `parity-check.js`, so claude is
  knowingly missing the budget tracker — this is finding S-04 / Q-01.
- **claude splits pre-review into 4.5a (lint+SCA) + 4.5b (security veto);
  codex collapses to a single pre-review.** Acceptable divergence; documented
  in `.claude/rules/pipeline.md`.
- **claude has a dedicated `reviewer` agent (Stage 5 READ-ONLY); codex has
  not added one yet.** claude is ahead here.
- **claude ships a presentation deck builder at `docs/build-presentation.js`;
  codex does not.** Distinct from the codex `visualize.js` (Mermaid state
  diagram). Two different ideas, neither shared.

The `parity-check.js` script enforces drift detection at the file-name +
configuration-key level but does not check behavioural parity. See
finding D-03.

## Surprises and open questions

1. **Two copies of every hook script** — `.claude/hooks/gate-validator.js` and
   `scripts/gate-validator.js` are required to behave identically; same for
   `approval-derivation.js`. There is no symlink and no test pinning them
   together. This is a latent drift bug. (Findings: C-01, Q-04.)
2. **Budget gate is documented but not implemented.** `pipeline.md` Stage 0
   describes writing `pipeline/budget.md` with running token totals, but no
   script in this repo writes it. The codex sibling has `scripts/budget.js`;
   claude does not. (Findings: S-04, Q-01.)
3. **Slash commands and CLI shims overlap.** A user has two ways to run most
   things: `/pipeline` (slash command) or `npm run pipeline` → `claude-team.js
   pipeline`. The contract is that they produce identical state. There is no
   test pinning that. (Finding: Q-02.)
4. **`.claude/hooks/approval-derivation.js` matcher is `Write|Edit`,
   unfiltered.** The hook fires on every Write/Edit anywhere, then internally
   filters by path. Cheap on a fast machine but every save during normal dev
   work pays a small node-startup cost. (Finding: P-02.)
5. **`docs/build-presentation.js` is a 10-commit churn hotspot but has no
   tests.** This is the only major scripts-folder file without test coverage.
   (Finding: T-03.)
6. **Single-author repo.** All 106 commits in the last six months are from
   one author. No reviewer-of-record on merges. The framework's *own*
   pipeline rule mandates peer review on changes to its target projects but
   the framework itself does not eat its own dog food on PRs. (Finding:
   Q-05; weak signal, not a blocker.)
