# 01 — Architecture Map

## Component inventory

### `.claude/` — runtime surface (consumed by Claude Code harness)

| Component | Purpose | Entry | Internal deps |
|---|---|---|---|
| `agents/` | 8 agent personas with YAML frontmatter (model, tools, scope) | invoked by orchestrator and slash commands | reads `pipeline/*`, writes per-agent artefacts |
| `commands/` | 23 slash commands (`/pipeline`, `/audit`, `/quick`, …) | user types `/<name>` | dispatch into agents and rules |
| `skills/` | 6 reusable skill modules (implement, pre-pr-review, conventions, review-rubric, security-checklist) | loaded on demand by Claude Code | none — self-contained |
| `rules/` | 7 rule files defining pipeline, gates, escalation, retros, coding principles, compaction, orchestrator | read by orchestrator at startup | source of truth |
| `hooks/gate-validator.js` | PostStop + SubagentStop hook; reads `pipeline/gates/*.json` and exits 0/2/3 | wired in `settings.json` `hooks.Stop` and `hooks.SubagentStop` | reads gate JSON, schemas |
| `hooks/approval-derivation.js` | PostToolUse hook (Write/Edit); parses `pipeline/code-review/by-*.md` and derives stage-05 approvals | wired in `settings.json` `hooks.PostToolUse` matcher `Write\|Edit` | reads/writes stage-05-*.json with file lock |
| `adapters/` | 4 deploy adapter contracts + README (docker-compose, kubernetes, terraform, custom) | invoked by `dev-platform` at Stage 8 | none |
| `references/` | 2 reference files; only loaded by `/audit` | read on demand | none |
| `config.example.yml` | Example config; project copies to `.claude/config.yml` | read by orchestrator and budget/security scripts | none |
| `settings.json` | Hook registration, permissions allow/deny, env | loaded by Claude Code | none |

### Root scripts (consumed by CI and `npm run *`)

| Script | LOC | Purpose |
|---|---|---|
| `scripts/claude-team.js` | ~1.3k | CLI dispatcher; mirrors slash commands so non-Claude tooling can drive the pipeline |
| `scripts/gate-validator.js` | duplicated copy of `.claude/hooks/gate-validator.js` for CLI invocation |
| `scripts/approval-derivation.js` | duplicated copy of `.claude/hooks/approval-derivation.js` |
| `scripts/bootstrap.js` | Node port of `bootstrap.sh` for cross-platform install |
| `scripts/audit.js` | aggregates audit doc state |
| `scripts/roadmap.js` | reads `docs/audit/10-roadmap.md` and prints status |
| `scripts/lessons.js` | parses `pipeline/lessons-learned.md` |
| `scripts/status.js` | pipeline-state dashboard |
| `scripts/security-heuristic.js` | Stage 4.5b trigger evaluation |
| `scripts/runbook-check.js` | validates `pipeline/runbook.md` for `## Rollback` and `## Health signals` |
| `scripts/consistency.js` | cross-file consistency checks (templates ↔ rules ↔ schemas) |
| `scripts/parity-check.js` | drift detection vs codex-dev-team (file presence, config keys) |
| `scripts/release.js` | bumps version, generates release notes |
| `scripts/pr-pack.js` | bundles a PR description from pipeline state |
| `scripts/lint-syntax.js` | lints YAML frontmatter and JSON gates |
| `scripts/summary.js` | post-run summary printer |

### `schemas/` — JSON Schema files

`gate.schema.json` (base), `stage-01.schema.json` … `stage-09.schema.json`,
plus `stage-04a.schema.json` (the pre-review automated gate) and
`stage-04-security.schema.json` (the conditional security gate). All shallow,
no `$ref` between them; validation is bespoke (`scripts/gate-validator.js`).

### `templates/` — canonical pipeline artefacts

11 markdown scaffolds: brief, design-spec, runbook, ADR, build, clarification,
pre-review, PR summary, retrospective, review, test-report. Used by agents
when first creating each artefact.

### `tests/`

16 test files covering: bootstrap idempotency, frontmatter schema, gate
schema, gate-validator behaviour, approval-derivation file locking,
consistency checks, parity check, CLI commands, security heuristic, runbook
check, release script, lessons parser, audit helpers. ~265 assertions total.

### `docs/`

| Subarea | Purpose |
|---|---|
| `docs/adoption-guide.md`, `user-guide.md`, `concepts.md`, `tracks.md`, `faq.md` | user-facing |
| `docs/releases/v2.x.md` (7 files) | per-release deep-dives |
| `docs/migration/v1-to-v2.md` | upgrade guide |
| `docs/audit/` | this audit; persistent (re-runs archive prior outputs) |
| `docs/parity/` | claude↔codex drift notes |
| `docs/runbook-template.md` | template for target projects |
| `docs/build-presentation.js` | builds Reveal.js slide deck from pipeline state — **outlier: only sizable JS file in `docs/`** |
| `docs/presentation-notes.md` | speaker notes for the deck |

## Dependency graph (internal)

```
   ┌───────────────┐      reads    ┌──────────────────────────┐
   │ user / Claude │ ─────────────▶│ .claude/rules/orchestrator│
   └───────────────┘                └────────────┬─────────────┘
                                                 │ invokes
                                  ┌──────────────┼───────────────┐
                                  ▼              ▼               ▼
                          .claude/agents/* .claude/skills/*  .claude/adapters/*
                                  │              │               │
                                  └──────┬───────┘               │
                                         ▼                       ▼
                                pipeline/<artefacts>      pipeline/deploy-log.md
                                         │
                          Write/Edit ─── ▼ ───┐
                                              │ PostToolUse hook
                                              ▼
                                .claude/hooks/approval-derivation.js
                                              │ writes
                                              ▼
                                pipeline/gates/stage-05-*.json
                                              │
                                  SubagentStop / Stop hook
                                              ▼
                                .claude/hooks/gate-validator.js
                                              │ exits 0/2/3
                                              ▼
                                       Claude Code halts on FAIL/ESCALATE
```

No circular deps. Two high-fan-in components: `pipeline/context.md` (every
agent reads, every agent appends — concurrency is serialised by the harness)
and `pipeline/gates/*.json` (every stage writes one, hooks read all).

## External integrations

There are **none** at runtime. Build/test integrations only:

- **GitHub Actions** — Node 20/22 matrix, runs `npm test`, `npm run lint`,
  `npm run lint:frontmatter`, `npm run validate`, `npm run parity:check`.
- **rsync** — required on PATH for bootstrap integration tests.
- **(target project's own deps)** — adapters delegate to whatever the target
  uses (`docker compose`, `kubectl`, `terraform`, or a user script).

## Data flow — primary user-facing flow (full pipeline)

```
user runs /pipeline "feature X"
   │
   ▼
Stage 1 PM        → pipeline/brief.md           + gates/stage-01.json
   │ Checkpoint A (halt for "proceed")
Stage 2 Principal → design-spec.md + adr/*      + gates/stage-02.json
   │ Checkpoint B
Stage 3 PM        → resolve open QUESTION: lines in pipeline/context.md
Stage 4 Devs      → src/{backend,frontend,infra}/* (3 worktrees parallel)
                                                + gates/stage-04-{area}.json
Stage 4.5a Platform → lint + type-check + SCA   + gates/stage-04-pre-review.json
Stage 4.5b Security → conditional veto          + gates/stage-04-security.json
Stage 5 Reviewer  → pipeline/code-review/by-*.md (READ-ONLY)
                    └── PostToolUse hook → gates/stage-05-{area}.json
Stage 6 QA        → pipeline/test-report.md     + gates/stage-06.json
   │ Checkpoint C
Stage 7 PM        → sign-off (or auto-fold)     + gates/stage-07.json
Stage 8 Platform  → adapter deploy + smoke      + gates/stage-08.json
Stage 9 All       → retrospective.md + lessons-learned.md (persistent)
                                                + gates/stage-09.json
```

`/quick`, `/nano`, `/config-only`, `/dep-update`, `/hotfix` skip stages and
shrink reviewer count per the routing table in `pipeline.md`.

## Configuration surface

| Where | What | Owner |
|---|---|---|
| `.claude/config.yml` | budget enable/limits, checkpoint auto-pass, deploy adapter selection, security trigger paths | committed; framework + project both edit |
| `.claude/config.local.yml` | env-specific overrides | gitignored, project-only |
| `.claude/settings.json` | hook registration, tool permissions allow/deny | committed; framework owns |
| `.claude/settings.local.json` | local-only permission overrides | gitignored |
| `CLAUDE.md` | project-specific instructions | committed; bootstrap creates once, never overwrites |
| `CLAUDE.local.md` | local-only instructions | gitignored |
| Env / secrets | none in framework; target project may use `.env` | n/a |

The framework itself stores no secrets. The doctor (`npm run doctor`) checks
that all framework files are present and config sections exist, but does not
inspect values.

## What's working well (preserve)

1. **Hooks are deterministic and inline-coded.** No regex-on-prose
   approval inference, no LLM-driven gate decisions. JSON in / exit code
   out. This is the design choice that makes the framework auditable.
2. **Approval-derivation is the single writer of stage-05 gates.** Agents
   cannot self-approve by editing the gate JSON; the hook reconciles from
   the review markdown on every save. File locking (added v2.5.1) makes
   concurrent reviewer writes safe.
3. **Bootstrap is idempotent.** Re-running it overwrites only framework
   files (`.claude/`, `scripts/`, `schemas/`, `templates/`); leaves
   `CLAUDE.md`, `pipeline/context.md`, `.local.*` alone. The integration
   test pins this.
4. **Track routing has an explicit stoplist.** `/quick`, `/nano`, etc.
   cannot be used to bypass the full pipeline on auth/PII/migration changes
   — `pipeline.md` calls this out and the orchestrator is supposed to
   default to `/pipeline` on uncertainty. (Enforcement is honour-system,
   though — see finding S-01.)
5. **READ-ONLY reviewer rule** is a genuine improvement on v1/v2 where the
   reviewing dev could "just fix it." Combined with approval-derivation,
   this closes the silent-fix loophole.
6. **Stage-9 retrospective with lessons-learned.md** that survives
   `/reset` is a real organisational-memory mechanism. Auto age-out (10
   runs without reinforcement) prevents bloat.
7. **Zero runtime dependencies.** Supply-chain surface is effectively
   zero. Bespoke parsing is uglier than `gray-matter` + `ajv` but
   intentional.
8. **Schemas-per-stage** with backward-compatibility for the missing
   `track` field (advisory warning, not failure) lets gates evolve without
   breaking older runs.
