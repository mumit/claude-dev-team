# Changelog

All notable changes to the `claude-dev-team` framework are recorded here. The
project follows [Semantic Versioning](https://semver.org/): major bumps for
breaking changes (pipeline shape, gate schema, agent catalogue, command
surface), minor bumps for additive features, patch bumps for fixes.

Until `v1.0.0`, the framework was tracked through `pipeline/context.md` fix-log
entries. From `v2.0.0` onward, this file is the authoritative changelog for
consumers.

## [Unreleased]

The `v2.x` line adds lightweight tracks, harder gate enforcement, expanded
brief/spec templates, and a deployment-adapter seam. Breaking changes are
called out per release below. Full upgrade path: `docs/migration/v1-to-v2.md`.

### Added — `v2.0.0` (in progress — tracks and routing)

- **Lightweight tracks.** New commands `/quick`, `/config-only`, `/dep-update`
  for changes that don't justify the full nine-stage pipeline. Each track has
  its own stage set documented in `.claude/commands/{track}.md`.
- **Scope-based routing in `/pipeline`.** When a feature request looks like
  a quick fix, the orchestrator now offers the appropriate lighter track
  before running the full pipeline. The user can still force full pipeline.
- **Safety stoplist.** Lighter tracks must not be used for auth, crypto, PII,
  payments, schema migrations, feature-flag introduction, or new external
  dependencies. The stoplist is enforced at routing time.
- **`track` field on every gate.** Gate files now include `"track":
  "<name>"` so downstream tooling can branch on track.

### Documentation

- `CHANGELOG.md` (this file) — new; versioned release notes.
- `docs/migration/v1-to-v2.md` — new; upgrade path for existing projects.
- `docs/tracks.md` — new; reference for the four tracks and how routing
  picks between them.

### Added — `v2.1.0` (in progress — gate-validator hardening)

- **Bypassed-escalation detection.** The validator now sweeps all gate
  files and halts the pipeline (exit 3) when any gate has
  `status: ESCALATE` but is older than another gate. A newer gate after
  an unresolved escalation indicates the pipeline was bypassed without
  resolving the decision.
- **Retry-integrity enforcement.** Gates with `retry_number >= 1` must
  carry a non-empty `this_attempt_differs_by` string. Missing or empty
  values cause exit 1. The rule was documented in `gates.md` since v1
  but was not enforced in code until now.
- **Track-field advisory.** Gates are now expected to carry a `"track"`
  field (`full` / `quick` / `config-only` / `dep-update` / `hotfix`).
  Missing or unrecognised values produce a non-blocking advisory so
  legacy gates from pre-v2.0 runs keep working during migration.
- **Lessons-learned format validation.** The validator scans
  `pipeline/lessons-learned.md` for malformed `**Reinforced:**` lines
  and reports line numbers as advisories. Only two forms are valid:
  `**Reinforced:** 0` and `**Reinforced:** N (last: YYYY-MM-DD)`.
- 12 new tests in `tests/gate-validator.test.js` cover all of the above
  (116 tests total; up from 104).

### Still pending in `v2.x`

The following planned items ship in later `v2.x` releases, as they break
orthogonal things and benefit from staged rollout:

- `v2.2` — Expanded brief template (rollback, FF, migration, observability,
  SLO, cost). Expanded design-spec template. Stage 7 folded into Stage 6
  when every acceptance criterion maps 1:1 to a passing test.
- `v2.3` — Split `dev-qa` from `dev-platform`. Security Engineer agent
  with veto. Automated pre-review gate (Stage 4.5) for lint + SCA.
  Approval-derivation hook (parse `REVIEW: APPROVED` from review files).
- `v2.4` — Deployment-adapter seam (`.claude/adapters/{docker-compose,k8s,
  terraform}/`). Runbook requirement on Stage 8.
- `v2.5` — Budget gate, cross-run meta-retro, lesson auto age-out, positive
  review channel (`PATTERN` tag), async-friendly checkpoints.

---

## Pre-v1 history (tracked in `pipeline/context.md`)

The fix-log in `pipeline/context.md` captured batches through the first four
rounds of improvements (2026-04-09, 2026-04-17). Those are preserved in
`pipeline/context.md` and will stay there for audit. New entries land in
this file from `v2.0.0` forward.
