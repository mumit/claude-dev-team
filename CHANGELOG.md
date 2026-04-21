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

### Added — `v2.2.0` (in progress — brief/spec expansion + Stage 7 fold)

- **Expanded brief template.** PM briefs now include six additional
  required sections on the full track and `/hotfix`: Rollback plan,
  Feature flag / rollout strategy, Data migration safety, Observability
  requirements, SLO / error-budget impact, Cost impact. Each has a
  default "None"-style answer for cases where the dimension is
  genuinely empty, but the section must be present. Lighter tracks can
  condense the six into a single `## Risk notes` line when every
  dimension is trivial.
- **Expanded design-spec template.** Principal specs now include a
  required §6 "Observability instrumentation" section naming the
  specific metric/log/trace primitive for each acceptance criterion in
  the brief, and the SLI each feeds where an SLO is named.
- **Stage 7 auto-fold.** When Stage 6 maps every acceptance criterion
  1:1 to a passing test and sets `"all_acceptance_criteria_met":
  true`, the orchestrator writes Stage 7 directly without invoking the
  PM agent. Skipped for `/hotfix` (always requires manual sign-off),
  for ambiguous test-to-criteria mappings, and when the user requests
  a manual review. Flagged via `"auto_from_stage_06": true` on the
  gate.
- **Canonical templates.** New `docs/brief-template.md` and
  `docs/design-spec-template.md` with full and condensed forms plus a
  worked example.

### Breaking changes — `v2.2.0`

- Briefs written against the v1 or v2.0 template will fail the Stage 1
  `required_sections_complete` check on the full track and `/hotfix`
  until the six risk sections are added. The fix is to add each
  section; for dimensions genuinely empty, a one-word "None" is valid.
- Downstream tooling that assumes Stage 7 is always written by the
  `pm` agent must accept `"agent": "orchestrator"` as well — the
  auto-fold path sets it to `orchestrator`. Filter by
  `"auto_from_stage_06"` instead if the author matters.
- Stage 1 gate gains a new `"required_sections_complete"` field.
  Parsers with strict schemas should accept it.

### Still pending in `v2.x`

The following planned items ship in later `v2.x` releases, as they break
orthogonal things and benefit from staged rollout:

- `v2.3` — Split `dev-qa` from `dev-platform`. Security Engineer agent
  with veto. Automated pre-review gate (Stage 4.5) for lint + SCA.
  Approval-derivation hook (parse `REVIEW: APPROVED` from review files).
  Scoped peer-review matrix (1+1 for area-contained changes).
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
