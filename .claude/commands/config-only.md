---
description: >
  Run a configuration-only pipeline: no code logic change, just env vars,
  feature flags, compose/infra config, or `.env.example`. Skips design and
  peer review; runs lint + test + deploy. Use only when the diff is 100%
  inside config files and contains no behavioural logic.
---

# /config-only

🔧 CONFIG MODE — No logic change. Lint + test + deploy only.
Use when the diff is 100% config (env vars, flags, compose, `.env.example`).

The change is: $ARGUMENTS

If no arguments are provided, ask: "Which config is changing?"

## When `/config-only` is appropriate

Scoped to these paths only:

- `config/**`
- `.env.example`, `.env.*.example`
- `src/infra/env/**`
- `docker-compose*.yml` — **only** for environment values, volumes, ports,
  healthcheck intervals. **Not** for adding a new service, changing an
  image, or altering a build context — those need `/pipeline`.
- Feature-flag config files (JSON/YAML) — **toggling** an existing flag.
  Introducing a new flag requires a brief (use `/quick` or `/pipeline`).

If the change adds or modifies logic, a package version, a Dockerfile, a
CI workflow, or any file outside the list above → abort and use `/quick`
or `/pipeline`.

## Routing decision

Before invoking any agent, the orchestrator must:

1. Ask the user (or infer from the description) which config files will change.
2. Verify each path is on the allowlist above. Any off-list file aborts.
3. Confirm the change is a value change, not a structural change.

## Stages (config-only track)

### Stage 0 — Scope check (orchestrator, no agent)

Confirm with the user the exact list of config files to change. Record the
list under `## Brief Changes` in `pipeline/context.md` as:

```
CONFIG-ONLY scope: [list of files]
Rationale: [one line]
```

No brief file is created. There is no Stage 1 in config-only track.

### Stage 4 — Edit (dev-platform)

Invoke: `dev-platform` agent.
Input: the scoped file list + the intended values.
Rules:

- Edit only the listed files. Any edit outside the list is a BLOCKER.
- Write a one-paragraph summary to `pipeline/pr-platform.md` with the
  before/after values and why.
- No `## Plan` preamble required — the scope *is* the plan.

Gate file: `pipeline/gates/stage-04-platform.json` with `"track": "config-only"`.

### Stage 4.5 — Lint + config validation

Platform dev must run, in order:

1. `npm run lint` (or project equivalent) — must exit 0
2. `docker compose config --quiet` if `docker-compose*.yml` changed — must exit 0
3. Any project-specific config validator declared in the target project

If any check fails, halt the track. The fix path is: address the lint/config
error and re-run, or abort to `/quick` if the fix requires logic.

### Stage 6 — Tests (dev-qa)

Invoke: `dev-qa` agent (owns Stage 6 from v2.3; see `.claude/rules/pipeline.md`
§Stage 6).
Run the full test suite. Config changes don't introduce new acceptance
criteria, so the pass bar is **no regression** — every test that passed
before must pass now.

Gate file: `pipeline/gates/stage-06.json` with `"track": "config-only"` and
`"regression_check": "PASS"`.

### Stage 8 — Deploy

After Checkpoint C, ask the user whether to deploy. Run Stage 8 per
`pipeline.md` if yes.

### No retrospective

Config-only changes skip Stage 9. Append one line to the `## Fix Log` in
`pipeline/context.md`:

```
YYYY-MM-DD — config-only: [files] — [rationale]
```

That's the entire audit trail. Lessons-learned.md is not touched.

## Escalation

- Any off-list file appears in the diff → abort immediately, recommend `/quick`
- Tests regress → halt; investigate. If the regression is config-driven
  (a port changed breaking a healthcheck), the platform dev fixes it; if
  it reveals a logic coupling, abort to `/pipeline`.
- User wants to add a new feature flag (not toggle an existing one) →
  abort; new flags need a brief.
