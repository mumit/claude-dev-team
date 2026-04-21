# Migrating from v1 to v2

`v2.x` introduces lightweight tracks, harder gate enforcement, expanded
brief and design-spec templates, and a deployment-adapter seam. This guide
walks an existing project through the upgrade in the order that minimises
breakage.

## Why upgrade

Under `v1`, every change — a typo, a config value tweak, a dependency bump
— ran the full nine-stage pipeline. The average run was 30–90 minutes and
spent most of that time in ceremony that routine changes didn't need.
`v2` keeps the full pipeline for feature-sized work and adds three
lighter tracks for everything smaller.

`v2` also closes a set of enforcement gaps the `v1` validator didn't catch:
the Stage 5 READ-ONLY reviewer rule, retry integrity, approval integrity,
and stale-escalation detection. Those land in `v2.1`; see the per-release
section below.

## Versioning and release shape

| Release | Scope | Breaking? |
|---|---|---|
| `v2.0.0` | Lightweight tracks + scope routing + `track` field on gates | Minor additive breaks only (see below) |
| `v2.1.0` | Gate-validator hardening + approval integrity + src-edit detector | Breaks gates that rely on loose validation |
| `v2.2.0` | Expanded brief/spec templates + Stage 7 folding + scoped peer review | Breaks brief/spec templates; peer review matrix shape |
| `v2.3.0` | `dev-qa` split from `dev-platform` + security-engineer agent + pre-review gate | Breaks agent catalogue and permissions |
| `v2.4.0` | Deployment-adapter seam + runbook requirement | Breaks Stage 8 default (docker-compose no longer assumed) |
| `v2.5.0` | Budget gate + cross-run retro + lesson age-out + `PATTERN` channel | Opt-in features, non-breaking |

Consumers can take releases individually. Each minor release has its own
migration steps at the bottom of this document.

## Before you start

Confirm the framework version the target project is on. From the target
project's root:

```bash
grep -E '^\s*##\s*\[' ../path-to-framework/CHANGELOG.md | head -5
```

If the target project doesn't track framework version explicitly, check the
`## Fix Log` in `pipeline/context.md` for the most recent batch.

Take a clean snapshot of `pipeline/` before upgrading — the preflight scan
(`v2.1`) flags things you'll want to diff against. Committing `pipeline/`
into git is not expected in every project, so either commit or stash it
somewhere outside the tree for the duration of the upgrade.

## `v2.0.0` — Tracks and routing

### What breaks

- The `/pipeline` command now asks about track choice when the request
  looks like a fit for `/quick`, `/config-only`, or `/dep-update`. If you
  have automation or scripts that pipe feature requests into Claude Code
  expecting zero prompts, they'll need an extra scripted response. The
  quickest mitigation is to prefix requests with `TRACK: full — ` which
  the orchestrator interprets as a hard-full directive.
- Gate files now contain a `"track"` field. Downstream tooling that
  parses gates with a strict schema (no extra fields) will fail. Relax
  the schema or add the field to your parser.
- The safety stoplist in `/pipeline` routing vetoes use of lighter tracks
  for auth/crypto/PII/payments/migrations/feature-flag/new-dep work. If
  you previously ran these as fast-tracked via an ad-hoc `/hotfix`, the
  `/hotfix` path still exists — the stoplist applies only to the three
  new lighter tracks.

### What doesn't break

- `/pipeline`, `/hotfix`, `/pipeline-brief`, `/pipeline-review`,
  `/retrospective`, `/reset`, `/resume`, `/stage`, `/status`,
  `/pipeline-context`, and all audit commands behave identically for
  feature-sized work.
- The 9-stage pipeline definition in `.claude/rules/pipeline.md` is
  additive: Stage 0 (routing) is new, but Stages 1–9 are unchanged.
- Agents are unchanged. PM, Principal, and the three devs keep their
  tool scopes, skills, and permissions.
- `pipeline/lessons-learned.md` format is unchanged.

### Steps

1. **Re-run bootstrap** against the target project. The three new command
   files (`quick.md`, `config-only.md`, `dep-update.md`) install under
   `.claude/commands/`. The updated `pipeline.md` command and
   `pipeline.md` rule file overwrite their predecessors.
2. **Read `docs/tracks.md`** to understand when each track fires.
3. **Decide a project policy** for which in-flight feature requests should
   route to `/quick` by default. The routing choice is interactive — the
   orchestrator asks, you answer — but you can set a house preference by
   adding a short rule to `CLAUDE.md`:

   ```markdown
   ## Pipeline routing preferences

   - Any request matching the pattern "docs:", "typo:", or "copy:" →
     default to `/quick` without prompting.
   - Any request matching "bump", "upgrade", "update <pkg>" → default to
     `/dep-update` without prompting.
   - Config-only requests named explicitly as such → `/config-only`.
   ```

   `CLAUDE.md` is yours and bootstrap never overwrites it, so the policy
   survives future framework updates.
4. **Update any external tooling** that parses `pipeline/gates/*.json` to
   ignore unknown fields (the `"track"` addition).
5. **Run one test pipeline** in each track to confirm your local shell,
   hooks, and agent catalogue all work. The lighter tracks are fast
   enough (~5–10 minutes each) that three dry runs is cheap insurance.

### Rollback

If `v2.0` breaks something in your environment: the three new track
commands are additive — you can `rm .claude/commands/{quick,config-only,
dep-update}.md` to disable them, and revert `.claude/commands/pipeline.md`
and `.claude/rules/pipeline.md` to their pre-`v2.0` state from git. The
`"track"` field on gate files is harmless if downstream tooling ignores
unknown fields.

## `v2.1.0` — Gate-validator hardening (forthcoming)

*Ships in a follow-up release.* Expected breakage: gates with malformed
`Reinforced:` lines in `lessons-learned.md`, Stage 5 gates whose named
approvers modified `src/` during the review invocation, retry gates with
empty `this_attempt_differs_by`. Full details plus a `npm run migrate:v2-1
--dry-run` preflight ship with that release.

## `v2.2.0` — Template expansion and Stage 7 folding (forthcoming)

*Ships in a follow-up release.* Breaks existing `pipeline/brief.md` and
`pipeline/design-spec.md` templates by requiring new sections. Stage 7
PM sign-off is folded into Stage 6 when every acceptance criterion maps
1:1 to a passing test; your automation should iterate gates rather than
assume a `stage-07.json` file exists for every run.

## `v2.3.0` — Agent catalogue expansion

### What breaks

- **`dev-platform` agent narrowed.** Test authoring and the Stage 6
  test run moved to the new `dev-qa` agent. Scripts that directly
  invoked `dev-platform` for `/stage 6` or test-related work must
  switch to `dev-qa`. The `/pipeline` orchestrator handles routing
  automatically.
- **New gate files.** Full-track runs now write
  `pipeline/gates/stage-04-pre-review.json`. Runs that trigger the
  security heuristic also write `pipeline/gates/stage-04-security.json`.
  Downstream tooling that enumerates gates (status dashboards, audit
  exports) needs to recognise these.
- **New Stage 6 field.** `"criterion_to_test_mapping_is_one_to_one"` on
  `pipeline/gates/stage-06.json`. Legacy tooling missing this field
  should default to `false` when absent — safer, triggers manual PM
  sign-off at Stage 7.
- **`security-checklist` skill demoted.** Still useful as a rubric
  (loaded by `security-engineer`), but other agents should no longer
  rely on it as a proxy for security review.

### What doesn't break

- `dev-backend` and `dev-frontend` are unchanged except for awareness
  of the new agents in their prompts.
- `pm` and `principal` unchanged (v2.2 was the last PM/Principal change).
- Existing `src/tests/` layouts continue to work — `dev-qa` follows
  existing conventions rather than imposing a new one.
- The Stage 5 peer-review matrix is unchanged in v2.3; scoped peer
  review ships in v2.3.1 as a follow-up.

### Steps

1. **Re-run bootstrap.** New `dev-qa.md` and `security-engineer.md`
   land under `.claude/agents/`; narrowed `dev-platform.md` overwrites
   the v2.2 version.
2. **Verify agents are discoverable.** The agent picker or
   `claude --help` should list `dev-qa` and `security-engineer`.
3. **Update downstream tooling** that enumerates gates to accept
   `stage-04-pre-review` and `stage-04-security` as valid stages.
4. **Decide on the security heuristic fit.** Default heuristic triggers
   on auth/crypto/PII/payments paths + dep changes + Dockerfile + IaC
   + env vars. If your project uses a different directory layout,
   adjust the heuristic in `.claude/rules/pipeline.md` Stage 4.5b.
5. **Dry-run a small pipeline.** Confirm:
   - Stage 4.5a fires and passes on green lint/SCA
   - Stage 4.5b fires when heuristic matches, skips otherwise
   - Stage 6 is invoked on `dev-qa`, not `dev-platform`
   - Stage 7 auto-fold from v2.2 still works with v2.3's new field

### Rollback

`v2.3` is mostly additive. Deleting `dev-qa.md` and
`security-engineer.md` plus reverting `dev-platform.md` to the v2.2
version restores the old behaviour. The `stage-04-pre-review.json`
and `stage-04-security.json` gate files become orphan data — safe to
delete from old pipeline runs.

## `v2.3.1` — Scoped review + approval integrity

### What breaks

- **Reviewer file format changed.** Reviewers write per-area sections
  now (`## Review of backend\n...\nREVIEW: APPROVED`). Reviewers
  still emitting a single trailing `REVIEW:` line without section
  headers will have their verdicts ignored — the gate stays at `FAIL`
  until a properly-formatted review arrives.
- **Agents can no longer write `approvals` directly.** The hook
  (`approval-derivation.js`) is the single writer on Stage 5 gate
  approvals. Direct writes are overwritten on the next reviewer file
  save.
- **Stage 5 gate `changes_requested` shape** changed from `[string]`
  to `[{reviewer, timestamp}]`. Downstream parsers need to read the
  `reviewer` field on the object.

### What doesn't break

- Existing `stage-05-<area>.json` gates from prior runs continue to
  parse — the hook treats missing `required_approvals` as 2 (matrix
  default) and missing `review_shape` as `"matrix"`.
- `dev-qa`, `security-engineer`, and the `dev-*` agents all updated
  in-place; no new file permissions needed beyond what v2.3 added.

### Steps

1. **Re-run bootstrap.** `.claude/hooks/approval-derivation.js` lands,
   `.claude/settings.json` gets the new `PostToolUse` entry, and the
   `dev-*` / `security-engineer` agents get the updated review-file
   format instructions.
2. **Archive any mid-flight reviews.** If a pipeline is between Stage 4
   and Stage 5 at upgrade time, its `pipeline/code-review/by-*.md`
   files are in the legacy single-verdict format. Either finish the
   review under the legacy format before upgrading, or `/reset` and
   restart Stage 5 under the new format.
3. **Update any status dashboards** that iterate Stage 5 gates to
   read `review_shape` and `required_approvals` (default to `matrix`
   and `2` when absent) and to read `changes_requested[i].reviewer`
   instead of treating each entry as a string.
4. **Test the hook locally.** After bootstrap, write a dummy review
   file under `pipeline/code-review/by-frontend.md` with one `##
   Review of backend` section and `REVIEW: APPROVED`, then save (any
   editor that triggers Claude Code's Write/Edit hook). Verify
   `pipeline/gates/stage-05-backend.json` gets the `dev-frontend`
   entry in `approvals`.

### Rollback

Delete `.claude/hooks/approval-derivation.js` and remove the
`PostToolUse` block from `.claude/settings.json`. Agents fall back to
writing approval arrays directly per v2.3 rules. Legacy single-verdict
review files start working again.

## `v2.4.0` — Deployment-adapter seam + runbook requirement

### What breaks

- **Stage 8 gate schema changed.** The old hardcoded `compose_file`
  and `services_started` fields moved from the baseline into
  `adapter_result.compose_file` and
  `adapter_result.services_started` for the `docker-compose` adapter.
  Any downstream tooling that reads these fields needs to look one
  level deeper.
- **`.claude/config.yml` is required.** Without it, `dev-platform`
  doesn't know which adapter to use and halts Stage 8 with
  `ESCALATE`. Bootstrap creates one automatically with the
  docker-compose default, so projects that re-bootstrap are fine.
  Projects that installed by hand before v2.4 must create the file.
- **`pipeline/runbook.md` is required.** Stage 8 halts with ESCALATE
  if the file is missing or lacks `## Rollback` and `## Health
  signals` sections. See `docs/runbook-template.md`.

### What doesn't break

- Projects using `docker compose` today keep working identically —
  the default adapter is `docker-compose` and the procedure is
  verbatim the v1–v2.3 flow.
- Stages 1–7 and 9 are unchanged.
- The gate-validator, approval-derivation hook, and Stage 5 format
  from v2.3.1 all work unchanged.

### Steps

1. **Re-run bootstrap** against the target project. `.claude/adapters/`,
   `.claude/config.yml` (if absent), `docs/runbook-template.md`, and
   the new dev-platform.md land in place. Existing `.claude/config.yml`
   is preserved.
2. **Pick an adapter.** Edit `.claude/config.yml`:
   ```yaml
   deploy:
     adapter: docker-compose   # or kubernetes, terraform, custom
   ```
   Fill in the per-adapter config block for the one you chose.
   Built-in adapters' docs are at `.claude/adapters/<adapter>.md`.
3. **Write a runbook.** Copy `docs/runbook-template.md` to
   `pipeline/runbook.md` and fill it in. For a trivial feature, the
   minimum is §Rollback (one command set) and §Health signals (one
   metric). Don't pad; a 30-line runbook is fine if it answers "how
   do I fix this at 3am".
4. **Update downstream tooling.** Anything that reads Stage 8 gates
   needs to (a) read `adapter` to branch on deployment type, and
   (b) read previously-baseline fields from `adapter_result` for the
   matching adapter.
5. **Dry-run.** Run one pipeline end-to-end to confirm Stage 8
   reads config, dispatches to the adapter, checks the runbook, and
   writes the new gate shape.

### Migrating from the hardcoded v1–v2.3 docker-compose flow

If your project was using the hardcoded docker-compose flow:

1. After bootstrap, `.claude/config.yml` will have
   `deploy.adapter: docker-compose` selected by default.
2. The adapter's instructions (`.claude/adapters/docker-compose.md`)
   match the v1–v2.3 flow step-for-step. No behavioural change.
3. Write `pipeline/runbook.md`. The minimum for a docker-compose
   project is: "`docker compose down && git checkout <prior-sha> &&
   docker compose up -d --wait`, verify via curl on `/health`."

### Writing a custom adapter

If none of the built-in adapters fit:

1. Start from `.claude/adapters/custom.md` if your deploy is already
   a shell script. Point `deploy.custom.script` at it.
2. For anything more structured (deploying through an internal CD
   system, an API-driven platform, etc.), copy
   `.claude/adapters/docker-compose.md` as a template, rewrite the
   procedure, and commit it as `.claude/adapters/<your-name>.md`.
   Follow the contract in `.claude/adapters/README.md`.

### Rollback

`v2.4` adds new files; removing `.claude/adapters/`, deleting
`.claude/config.yml`, and reverting `dev-platform.md` restores the
v2.3 hardcoded docker-compose path. The Stage 8 gate reverts to the
v2.3 shape automatically (no migration of existing gate files
needed).

## `v2.5.0` — Learning loop and budget (forthcoming)

*Ships in a follow-up release.* Adds opt-in token/wall-clock budget gate,
cross-run meta-retro, lesson auto age-out, and a positive-signal
`PATTERN` review tag. All opt-in, non-breaking.

## Getting help

- Routing questions: `docs/tracks.md`
- Stage definitions: `.claude/rules/pipeline.md`
- Gate schema: `.claude/rules/gates.md`
- Known limitations and open issues: the `Unreleased` section of
  `CHANGELOG.md`
