---
description: >
  Run a dependency-update pipeline: validates that the full test suite
  still passes after a package upgrade, scans the changelog for breaking
  changes, and runs a platform-dev supply-chain review. Skips design and
  the full peer-review matrix. Use for npm/pip/gem/etc. updates.
---

# /dep-update

📦 DEPENDENCY UPDATE MODE — Package upgrade with supply-chain review.
Test suite must stay green. Breaking-change scan is mandatory.

The update is: $ARGUMENTS

If no arguments, ask: "Which dependency, and what version range?"

## When `/dep-update` is appropriate

- Updating one or more dependencies in `package.json`, `requirements.txt`,
  `Gemfile`, `pyproject.toml`, `go.mod`, etc.
- Associated lockfile regeneration (`package-lock.json`, `poetry.lock`, etc.)
- **No** code changes beyond what the dependency update minimally requires
  to keep the build green (e.g. an import-path rename forced by the new version)

If the dependency update requires real refactoring (API migration, config
reshape, new feature adoption), that's `/pipeline` — not `/dep-update`.

## Stages (dep-update track)

### Stage 0 — Scope declaration (orchestrator)

Ask or confirm:

- Which package(s) and target version(s)
- Whether this is a security patch, a minor bump, or a major upgrade
- Expected blast radius (does the package underpin auth, data, infra?)

Record under `pipeline/context.md` `## Brief Changes` as:

```
DEP-UPDATE: <package> <old-version> → <new-version>
Reason: security | minor | major | ...
Blast radius: <one line>
```

### Stage 4 — Update (dev-platform)

Invoke: `dev-platform` agent.

1. Read the dependency's changelog between the old and new version.
   Summarise breaking changes in `pipeline/pr-platform.md` under a
   `## Breaking Changes Noted` heading. If any of them apply to code in
   this repo, list the affected files — **do not fix them in this track**.
   Any required code fix aborts to `/pipeline` or `/quick`.
2. Update the dependency and regenerate the lockfile.
3. Run the following scans and capture their output in the PR file:
   - **Lint**: `npm run lint` / project equivalent
   - **License check**: if the project has a license allowlist script, run it
   - **Vulnerability scan**: `npm audit --audit-level=high` / `pip-audit` /
     `bundler-audit`. A `high` or `critical` finding halts the track.
4. Write a short summary in `pipeline/pr-platform.md`.

Gate file: `pipeline/gates/stage-04-platform.json` with `"track": "dep-update"`.

### Stage 5 — Supply-chain review (single reviewer)

Invoke one reviewer (`dev-backend` by default, or the most relevant area
lead) with the explicit instruction: focus review on the supply-chain
aspects of this diff, not code correctness.

Checklist the reviewer must apply:

- Are the upgraded packages from the expected source (no typosquat)?
- Is the version change consistent with the stated scope (patch vs major)?
- Does the lockfile diff only contain the packages we expected to change?
  (Lockfile churn can hide transitive changes — flag anything surprising.)
- Does the changelog mention any security advisories we need to note?

Gate file: `pipeline/gates/stage-05-deps.json` — requires 1 approval,
`"track": "dep-update"`.

### Stage 6 — Full test suite (dev-qa)

Invoke: `dev-qa` agent (owns Stage 6 from v2.3; see `.claude/rules/pipeline.md`
§Stage 6).
Run the full suite. Pass bar: **no regression**.

Gate file: `pipeline/gates/stage-06.json` with `"track": "dep-update"` and
`"regression_check": "PASS"`.

### Stage 8 — Deploy (optional)

After Checkpoint C, ask whether to deploy. For security patches, recommend
deploying immediately; for minor/major bumps, treat normally.

### No retrospective

Append a single-line entry to `## Fix Log` in `pipeline/context.md`:

```
YYYY-MM-DD — dep-update: <package> <old> → <new> — <reason>
```

If the changelog surfaced a repo-wide refactor opportunity (e.g. an API
the new version deprecates but we still use), add that as a `CONCERN:`
under `## Open Questions` so it gets picked up by the next `/pipeline`
or `/audit` run.

## Escalation

- `high` or `critical` CVE in the scan → halt, surface to user
- Tests regress → halt. If the regression is a trivial API rename,
  abort to `/quick`. If it's substantive, abort to `/pipeline`.
- Lockfile contains unexpected package changes (not just the target
  dependency) → halt, show the user the diff before proceeding.
