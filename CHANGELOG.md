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

### Added — `v2.3.0` (in progress — agent split + security + pre-review)

- **`dev-qa` agent (new).** Split from `dev-platform`. Owns test
  authoring (`src/tests/`) and Stage 6 test execution. Authors the 1:1
  criterion-to-test mapping that drives the Stage 7 auto-fold from
  v2.2. `dev-platform` retains CI, infra, deploy, and the automated
  pre-review gate.
- **`security-engineer` agent (new).** Promoted from what was formerly
  the `security-checklist` skill (optional, loadable). Now an agent
  with veto power on Stage 4.5b when the triggering heuristic fires.
  Triggers: auth/crypto/PII/payments paths, dependency changes,
  Dockerfile / IaC changes, new env vars. A `veto: true` gate halts
  the pipeline; peer-review approvals cannot override it.
- **Stage 4.5 pre-review checks (new).** Two sub-gates between Stage 4
  (build) and Stage 5 (peer review):
  - **4.5a** — `dev-platform` runs lint + type-check + SCA + license
    allowlist. Writes `pipeline/gates/stage-04-pre-review.json`.
    Reviewers don't spend tokens on what the toolchain already flags.
  - **4.5b** — `security-engineer` review when the heuristic fires.
    Writes `pipeline/gates/stage-04-security.json` with
    `security_approved` and `veto` fields.
- **Stage 6 criterion-to-test mapping.** The Stage 6 gate now carries
  `"criterion_to_test_mapping_is_one_to_one"` — dev-qa sets it, and it
  gates the Stage 7 auto-fold from v2.2.

### Breaking changes — `v2.3.0`

- **`dev-platform` agent narrowed.** The test-authoring and Stage 6
  test-run sections were removed. Projects that invoked `dev-platform`
  directly for test tasks (via `/stage 6` or similar) must now invoke
  `dev-qa` instead. The `/pipeline` orchestrator handles routing
  automatically — no action needed unless you scripted a direct invoke.
- **`src/tests/` ownership moved.** `dev-qa` is now the primary author.
  Permissions under `.claude/settings.json` still allow `Write(src/**)`
  globally, but the agent definitions enforce the split.
- **New gate files.** `pipeline/gates/stage-04-pre-review.json` is
  required on every run. `pipeline/gates/stage-04-security.json` is
  required only when the heuristic fires. Downstream tooling that
  enumerates gates should accept both.
- **New required Stage 6 field.** `criterion_to_test_mapping_is_one_to_one`
  on `stage-06.json`. Older tooling that reads Stage 6 gates should
  accept the new field.
- **`security-checklist` skill now supplementary.** It's still loaded by
  `security-engineer` as the review rubric, but other agents should
  not lean on it as a proxy for security review.

### Added — `v2.3.1` (in progress — scoped review + approval integrity)

- **Approval-derivation hook** (new). `.claude/hooks/approval-derivation.js`
  runs as PostToolUse on Write/Edit and parses per-area sections in
  `pipeline/code-review/by-<reviewer>.md` for `REVIEW: APPROVED` or
  `REVIEW: CHANGES REQUESTED` markers. It then reconciles
  `pipeline/gates/stage-05-<area>.json` accordingly. This closes the
  "any agent can approve anyone" hole from v1/v2 where agents wrote
  their own entries on the gate.
- **Scoped peer review**. When the diff is area-contained (every
  changed file under one of `src/<area>/`), Stage 5 uses
  `review_shape: "scoped"` and `required_approvals: 1` — one reviewer
  from a different area. When the diff crosses areas, the v1 matrix
  applies with `required_approvals: 2`.
- **Stage 5 gate schema**. New fields: `review_shape`
  (`"scoped" | "matrix"`) and `required_approvals` (1 or 2).
  `changes_requested` now carries objects `{reviewer, timestamp}`
  instead of bare strings.
- **12 new tests** in `tests/approval-derivation.test.js`. Total suite:
  144 tests (up from 132 in v2.3), all green.

### Breaking changes — `v2.3.1`

- **Reviewer file format changed.** Reviewers now write one section per
  area using `## Review of <area>` headers, each ending with a single
  `REVIEW:` marker. Legacy single-verdict review files (no section
  headers) are ignored by the hook — the gate stays at its default
  `FAIL` until a properly-formatted review is written.
- **Agents must not author `approvals` on stage-05 gates.** Any direct
  write will be overwritten on the next reviewer file save. The hook
  is now the single writer.
- **Stage 5 gate `changes_requested` shape.** Now `[{reviewer, timestamp}]`
  objects, previously `[string]`. Parsers should switch to reading the
  object's `reviewer` field.

### Added — `v2.4.0` (in progress — deploy adapters + runbook requirement)

- **Deployment adapter seam.** Stage 8 no longer hardcodes
  `docker compose`. Projects pick an adapter in `.claude/config.yml`
  (`deploy.adapter`), and `dev-platform` reads the selected adapter's
  instructions from `.claude/adapters/<adapter>.md`. Built-in
  adapters:
  - `docker-compose` (default, feature-complete — same flow as v1–v2.3)
  - `kubernetes` (skeleton with `TODO(project)` markers)
  - `terraform` (skeleton with `TODO(project)` markers)
  - `custom` (escape hatch — project-provided deploy script)
- **`.claude/config.yml` (new).** Project configuration for the
  adapter selection and per-adapter settings. Preserved across
  bootstrap runs — your config never gets overwritten.
- **Runbook requirement.** Stage 8 now requires `pipeline/runbook.md`
  to exist and carry at minimum `## Rollback` and `## Health signals`
  sections. Missing runbook → `status: ESCALATE` at Stage 8 start.
  See `docs/runbook-template.md` for the canonical shape.
- **Stage 8 gate schema.** New fields: `adapter`, `runbook_referenced`,
  `adapter_result` (adapter-specific nested block). The old
  hardcoded `compose_file` field is gone from the baseline; it now
  lives under `adapter_result` for the `docker-compose` adapter.
- **bootstrap.sh** seeds `.claude/config.yml` on first install but
  never overwrites a user-edited config on re-runs.

### Breaking changes — `v2.4.0`

- **Stage 8 gate schema changed.** `compose_file` and
  `services_started` moved from the gate baseline into
  `adapter_result.compose_file` and `adapter_result.services_started`
  for the `docker-compose` adapter. Downstream tooling reading these
  must update.
- **`.claude/config.yml` is now required** for the `dev-platform`
  deploy task. Running without it triggers `status: ESCALATE` with
  `"Unknown deploy adapter"`. Bootstrap creates it automatically
  with the docker-compose default, so projects already bootstrapped
  are fine — but projects that hand-installed prior versions need
  to create it.
- **`pipeline/runbook.md` is now required** at Stage 8. This is a
  real behavioural change for in-flight pipelines — the deploy will
  halt until a runbook is written. Use `docs/runbook-template.md` as
  a starting point; a minimal runbook for a trivial feature can be
  ~30 lines.
- Tooling that hardcoded `docker compose` commands based on reading
  Stage 8 gates should now branch on `adapter` first.

### Still pending in `v2.x`

The following planned items ship in later `v2.x` releases, as they break
orthogonal things and benefit from staged rollout:

- `v2.5` — Budget gate, cross-run meta-retro, lesson auto age-out, positive
  review channel (`PATTERN` tag), async-friendly checkpoints.

---

## Pre-v1 history (tracked in `pipeline/context.md`)

The fix-log in `pipeline/context.md` captured batches through the first four
rounds of improvements (2026-04-09, 2026-04-17). Those are preserved in
`pipeline/context.md` and will stay there for audit. New entries land in
this file from `v2.0.0` forward.
