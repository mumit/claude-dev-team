# Changelog

All notable changes to the `claude-dev-team` framework are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
the project follows [Semantic Versioning](https://semver.org/): major bumps
for breaking changes (pipeline shape, gate schema, agent catalogue, command
surface), minor bumps for additive features, patch bumps for fixes.

Until `v1.0.0`, the framework was tracked through `pipeline/context.md` fix-log
entries. From `v2.0.0` onward, this file is the authoritative changelog for
consumers.

## v2.x release map

| Release | Date | Scope |
|---|---|---|
| [v2.5.0](#250---2026-04-21) | 2026-04-21 | Budget gate + PATTERN review tag + lesson auto age-out + async-friendly checkpoints |
| [v2.4.0](#240---2026-04-21) | 2026-04-21 | Deployment-adapter seam (`.claude/adapters/`) + runbook requirement at Stage 8 |
| [v2.3.1](#231---2026-04-21) | 2026-04-21 | Scoped peer review + approval-derivation hook (closes self-approval hole) |
| [v2.3.0](#230---2026-04-21) | 2026-04-21 | `dev-qa` agent split from `dev-platform`; `security-engineer` with Stage 4.5b veto; Stage 4.5a pre-review gate |
| [v2.2.0](#220---2026-04-21) | 2026-04-21 | Brief/spec template expansion (rollback, FF, migration, observability, SLO, cost) + Stage 7 auto-fold |
| [v2.1.0](#210---2026-04-21) | 2026-04-21 | Gate-validator hardening (bypassed escalations, retry integrity, track advisory, lessons-learned format validation) |
| [v2.0.0](#200---2026-04-21) | 2026-04-21 | Lightweight tracks (`/quick`, `/config-only`, `/dep-update`) + scope routing |
| [v1.0.0](#100---2026-04-17) | 2026-04-17 | Pre-v2 baseline — 9-stage pipeline, gate validator, retrospective, lessons-learned |

All seven v2.x releases shipped in one burst — the per-release granularity exists
because each is a reviewable chunk with its own breaking-change scope, not because
they rolled out over time.

---

## [Unreleased]

### Added
- `VERSION` file at the repo root, stamped into `.claude/VERSION` on every
  bootstrap run so an installed project can report its framework version via
  `cat .claude/VERSION`.
- `framework.version` field in `.claude/config.yml` bumped to `2.5.0` (was
  `2.4` through v2.4 and never updated when v2.5 shipped).
- Bootstrap integration test covering the `.claude/VERSION` stamp and
  `framework.version` field.

### Changed
- `CHANGELOG.md` restructured to Keep-a-Changelog dated-release format.
  Individual version sections now have explicit release dates; compare
  links at the bottom. The retroactive promotion collapses the seven
  "(in progress)" sections that lived under `[Unreleased]` while the v2
  stack was being built.

---

## [2.5.0] - 2026-04-21

Budget gate + PATTERN review tag + lesson auto age-out + async-friendly
checkpoints. v2.x stack complete.

### Added
- **Budget gate (opt-in).** `.claude/config.yml` now has a `budget:`
  block. When `enabled: true`, the orchestrator tracks token usage
  and wall-clock time per run, writes `pipeline/budget.md`, and
  checks the running totals at each stage boundary. On exceed, the
  configured policy (`escalate` or `warn`) fires. Default off; this
  is a guardrail for teams with cost discipline, not a required
  feature.
- **PATTERN positive review tag.** Reviewers can now flag things done
  especially well using `PATTERN:` lines inside Stage 5 review
  sections. The Principal harvests PATTERN entries during Step 9b
  synthesis and can promote recurring ones into
  `pipeline/lessons-learned.md` as positive rules. Competes with the
  agents' "one lesson" contributions for the 2-per-retro promotion
  cap.
- **Lesson auto age-out.** Rules in `lessons-learned.md` that haven't
  been reinforced in 10 runs AND whose current `Reinforced` count is
  0 retire automatically during Step 9b synthesis. The Stage 9 gate's
  new `aged_out` array distinguishes this from explicit retirement
  (`lessons_retired`).
- **Async-friendly checkpoints (opt-in per checkpoint).** New
  `checkpoints.{a,b,c}.auto_pass_when` config in `.claude/config.yml`.
  Supported conditions: `no_warnings`, `all_criteria_passed`
  (Checkpoint C only). Default behaviour unchanged (wait for human).
  Never applies to security-sensitive work — the safety stoplist and
  security-engineer veto remain authoritative.

### Changed
- **Stage 9 gate schema extended.** Additive: new `aged_out` array,
  `patterns_harvested` count, and `dev-qa` in `contributions_written`.

### Breaking
- **Stage 9 gate schema extension.** New fields `aged_out`,
  `patterns_harvested`. Parsers should accept them.
  `contributions_written` now includes `dev-qa`; tooling that
  hardcoded the five-agent list must update.
- **Lessons-learned auto age-out.** Projects with a long-lived
  `lessons-learned.md` containing rules nobody has touched in many
  runs will see those rules disappear over the first few v2.5
  synthesis runs. The retirement is recorded in retro synthesis
  blocks so there's an audit trail.

All v2.5 additions are opt-in or additive. Projects that leave
`budget.enabled: false` and `checkpoints.*.auto_pass_when: null`
will see no behavioural change from v2.4 beyond the age-out and
PATTERN handling.

---

## [2.4.0] - 2026-04-21

Deployment-adapter seam + runbook requirement at Stage 8.

### Added
- **Deployment adapter seam.** Stage 8 no longer hardcodes
  `docker compose`. Projects pick an adapter in `.claude/config.yml`
  (`deploy.adapter`), and `dev-platform` reads the selected adapter's
  instructions from `.claude/adapters/<adapter>.md`. Built-in
  adapters:
  - `docker-compose` (default, feature-complete — same flow as v1–v2.3)
  - `kubernetes` (skeleton with `TODO(project)` markers)
  - `terraform` (skeleton with `TODO(project)` markers)
  - `custom` (escape hatch — project-provided deploy script)
- **`.claude/config.yml`** (new). Project configuration for adapter
  selection and per-adapter settings. Preserved across bootstrap runs.
- **Runbook requirement.** Stage 8 now requires `pipeline/runbook.md`
  with at minimum `## Rollback` and `## Health signals` sections.
  Missing runbook → `status: ESCALATE` at Stage 8 start. Canonical
  shape: `docs/runbook-template.md`.
- **bootstrap.sh** seeds `.claude/config.yml` on first install but
  never overwrites a user-edited config on re-runs.

### Changed
- **Stage 8 gate schema.** New fields: `adapter`, `runbook_referenced`,
  `adapter_result` (adapter-specific nested block).

### Breaking
- **Stage 8 gate schema.** `compose_file` and `services_started` moved
  from the gate baseline into `adapter_result.compose_file` and
  `adapter_result.services_started` for the `docker-compose` adapter.
  Downstream tooling reading these must update.
- **`.claude/config.yml` is required.** Running without it triggers
  `status: ESCALATE` with "Unknown deploy adapter". Bootstrap creates
  it automatically — projects that hand-installed prior versions need
  to create it.
- **`pipeline/runbook.md` is required.** A real behavioural change for
  in-flight pipelines — deploys halt until a runbook is written.
  A minimal runbook for a trivial feature can be ~30 lines.
- Tooling that hardcoded `docker compose` commands should now branch
  on `adapter` first.

---

## [2.3.1] - 2026-04-21

Scoped peer review + approval-derivation hook (closes self-approval hole).

### Added
- **Approval-derivation hook.** `.claude/hooks/approval-derivation.js`
  runs as PostToolUse on Write/Edit and parses per-area sections in
  `pipeline/code-review/by-<reviewer>.md` for `REVIEW: APPROVED` or
  `REVIEW: CHANGES REQUESTED` markers. It then reconciles
  `pipeline/gates/stage-05-<area>.json`. Closes the "any agent can
  approve anyone" hole from v1/v2 where agents wrote their own
  entries on the gate.
- **Scoped peer review.** When the diff is area-contained (every
  changed file under one of `src/<area>/`), Stage 5 uses
  `review_shape: "scoped"` and `required_approvals: 1` — one reviewer
  from a different area. Cross-area diffs still use the v1 matrix
  with `required_approvals: 2`.
- 12 new tests in `tests/approval-derivation.test.js`.

### Changed
- **Stage 5 gate schema.** New fields: `review_shape`
  (`"scoped" | "matrix"`) and `required_approvals` (1 or 2).
  `changes_requested` now carries `{reviewer, timestamp}` objects
  instead of bare strings.

### Breaking
- **Reviewer file format.** Reviewers now write one section per area
  using `## Review of <area>` headers, each ending with a single
  `REVIEW:` marker. Legacy single-verdict review files (no section
  headers) are ignored by the hook — the gate stays at its default
  `FAIL` until a properly-formatted review is written.
- **Agents must not author `approvals` on stage-05 gates.** Any direct
  write will be overwritten on the next reviewer file save. The hook
  is now the single writer.
- **Stage 5 gate `changes_requested` shape.** Now
  `[{reviewer, timestamp}]` objects. Parsers should switch to reading
  the object's `reviewer` field.

---

## [2.3.0] - 2026-04-21

`dev-qa` split from `dev-platform` + `security-engineer` agent + Stage 4.5
pre-review gate.

### Added
- **`dev-qa` agent.** Owns test authoring (`src/tests/`) and Stage 6
  test execution. Authors the 1:1 criterion-to-test mapping that
  drives the Stage 7 auto-fold from v2.2. `dev-platform` retains CI,
  infra, deploy, and the automated pre-review gate.
- **`security-engineer` agent.** Promoted from what was formerly the
  `security-checklist` skill (optional, loadable). Now an agent with
  veto power on Stage 4.5b when the triggering heuristic fires.
  Triggers: auth/crypto/PII/payments paths, dependency changes,
  Dockerfile / IaC changes, new env vars. A `veto: true` gate halts
  the pipeline; peer-review approvals cannot override it.
- **Stage 4.5 pre-review checks** (two sub-gates between Stage 4 and 5):
  - **4.5a** — `dev-platform` runs lint + type-check + SCA + license
    allowlist. Writes `pipeline/gates/stage-04-pre-review.json`.
  - **4.5b** — `security-engineer` review when the heuristic fires.
    Writes `pipeline/gates/stage-04-security.json` with
    `security_approved` and `veto` fields.

### Changed
- **Stage 6 gate.** Now carries `criterion_to_test_mapping_is_one_to_one`
  — dev-qa sets it; it gates the Stage 7 auto-fold from v2.2.

### Breaking
- **`dev-platform` agent narrowed.** Test-authoring and Stage 6 test-run
  sections removed. Projects that invoked `dev-platform` directly for
  test tasks must switch to `dev-qa`. The `/pipeline` orchestrator
  handles routing automatically.
- **`src/tests/` ownership moved.** `dev-qa` is the primary author now.
- **New gate files.** `pipeline/gates/stage-04-pre-review.json` is
  required on every full-track run.
  `pipeline/gates/stage-04-security.json` is required only when the
  heuristic fires. Downstream tooling enumerating gates must accept
  both.
- **`security-checklist` skill demoted.** Still loaded by
  `security-engineer` as the review rubric, but other agents should
  not lean on it as a proxy for security review.

---

## [2.2.0] - 2026-04-21

Brief/spec template expansion + Stage 7 auto-fold from Stage 6.

### Added
- **Expanded brief template.** PM briefs now include six additional
  required sections on the full track and `/hotfix`: Rollback plan,
  Feature flag / rollout strategy, Data migration safety, Observability
  requirements, SLO / error-budget impact, Cost impact. Lighter tracks
  can condense into a single `## Risk notes` line when every dimension
  is trivial.
- **Expanded design-spec template.** Principal specs now include a
  required §6 "Observability instrumentation" section naming specific
  metric/log/trace primitives for each acceptance criterion, plus SLI
  references where SLOs are named.
- **Stage 7 auto-fold.** When Stage 6 maps every acceptance criterion
  1:1 to a passing test and sets `all_acceptance_criteria_met: true`,
  the orchestrator writes Stage 7 directly. Skipped for `/hotfix`,
  ambiguous mappings, and manual-signoff requests. Flagged via
  `auto_from_stage_06: true` on the gate.
- **Canonical templates.** New `docs/brief-template.md` and
  `docs/design-spec-template.md` with full and condensed forms plus a
  worked example.

### Breaking
- Briefs against the v1 or v2.0 template will fail the Stage 1
  `required_sections_complete` check on the full track and `/hotfix`
  until the six risk sections are added. A one-word "None" answer is
  valid for genuinely-empty dimensions.
- Tooling that assumes Stage 7 is always authored by the `pm` agent
  must accept `"agent": "orchestrator"` as well. Filter by
  `auto_from_stage_06` if the author matters.
- New `required_sections_complete` field on Stage 1 gates. Parsers
  with strict schemas should accept it.

---

## [2.1.0] - 2026-04-21

Gate-validator hardening.

### Added
- **Bypassed-escalation detection.** Validator sweeps all gate files and
  halts the pipeline (exit 3) when any gate has `status: ESCALATE` but
  is older than another gate. A newer gate after an unresolved
  escalation indicates the pipeline was bypassed.
- **Retry-integrity enforcement.** Gates with `retry_number >= 1` must
  carry a non-empty `this_attempt_differs_by` string. Missing or
  empty values cause exit 1. Documented in `gates.md` since v1 but
  not enforced in code until now.
- **Track-field advisory.** Non-blocking warning when the `track`
  field (added in v2.0) is missing or unrecognised, so legacy gates
  keep working during migration.
- **Lessons-learned format validation.** Validator scans
  `pipeline/lessons-learned.md` for malformed `**Reinforced:**` lines.
  Valid forms: `**Reinforced:** 0` or
  `**Reinforced:** <N> (last: YYYY-MM-DD)`.
- 12 new tests in `tests/gate-validator.test.js`.

---

## [2.0.0] - 2026-04-21

Lightweight tracks + scope routing.

### Added
- **Lightweight tracks.** `/quick`, `/config-only`, `/dep-update`
  commands for changes that don't justify the full nine-stage
  pipeline. Each track has its own stage set documented in
  `.claude/commands/{track}.md`.
- **Scope-based routing in `/pipeline`.** The orchestrator offers the
  appropriate lighter track when a request fits, rather than
  auto-downgrading silently.
- **Safety stoplist.** Lighter tracks cannot be used for auth, crypto,
  PII, payments, schema migrations, feature-flag introduction, or new
  external dependencies. Enforced at routing time.
- **`track` field on every gate.** Gate files now include
  `"track": "<name>"` so downstream tooling can branch on track.
- `CHANGELOG.md` (this file).
- `docs/migration/v1-to-v2.md`.
- `docs/tracks.md`.

---

## [1.0.0] - 2026-04-17

Pre-v2 baseline. Retroactively tagged to mark the "before state" for the
v2.x release sequence.

### Included
- 9-stage pipeline (PM → Principal → 3 devs → code review → test →
  PM sign-off → deploy → retrospective).
- `gate-validator.js` hook with JSON gate schema.
- Agent catalogue: `pm`, `principal`, `dev-backend`, `dev-frontend`,
  `dev-platform`.
- `pipeline/lessons-learned.md` persistent across `/reset`.
- `/pipeline`, `/hotfix`, `/retrospective`, `/reset`, `/audit`,
  `/review`, and related commands.
- Coding principles (`.claude/rules/coding-principles.md`).

Prior history (batches tracked before v1.0 was declared) remains recorded
in `pipeline/context.md` under `## Fix Log` for audit.

---

## Pre-v1 history (tracked in `pipeline/context.md`)

The fix-log in `pipeline/context.md` captured batches through the first four
rounds of improvements (2026-04-09, 2026-04-17). Those are preserved in
`pipeline/context.md` and will stay there for audit. New entries land in
this file from `v2.0.0` forward.

---

## Version-compare links

[Unreleased]: https://github.com/mumit/claude-dev-team/compare/v2.5.0...HEAD
[2.5.0]: https://github.com/mumit/claude-dev-team/compare/v2.4.0...v2.5.0
[2.4.0]: https://github.com/mumit/claude-dev-team/compare/v2.3.1...v2.4.0
[2.3.1]: https://github.com/mumit/claude-dev-team/compare/v2.3.0...v2.3.1
[2.3.0]: https://github.com/mumit/claude-dev-team/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/mumit/claude-dev-team/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/mumit/claude-dev-team/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/mumit/claude-dev-team/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/mumit/claude-dev-team/releases/tag/v1.0.0
