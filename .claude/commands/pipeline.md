---
description: >
  Run the full dev team pipeline for a feature request. Use this command
  when the user wants to build a new feature end-to-end: requirements,
  design, build, review, test, and deploy. Orchestrates PM → Principal →
  Devs → Code Review → Test → Deploy with human checkpoints.
---

# /pipeline

You are running the full dev team pipeline.
Read `.claude/rules/pipeline.md` before doing anything else.

## Input

The text after `/pipeline` is the feature request.
If none is provided, ask: "What feature would you like to build?"

## Startup Checklist

Before invoking any agent:
1. Read `CLAUDE.md`
2. Read `.claude/rules/pipeline.md`
3. Read `.claude/rules/gates.md`
4. Read `.claude/rules/escalation.md`
5. Read `pipeline/context.md`
6. Ensure `pipeline/gates/` exists — create if missing
7. Check for orphaned worktrees: run `git worktree list`. If any
   worktree path contains `dev-team-`, remove it with
   `git worktree remove <path> --force` and note the cleanup in output

## Routing: full pipeline or a lighter track?

Before running the full nine-stage pipeline, decide whether a lighter
track fits the request better. Three lighter tracks exist:

| Track | Command | Fits |
|---|---|---|
| Quick | `/quick` | Single-area change, ≤ ~100 LOC, no auth/crypto/PII/migration/dep change |
| Config-only | `/config-only` | 100% config file changes (env, flags, compose values) |
| Dep update | `/dep-update` | Package upgrade, no refactor beyond the minimum |

### Routing decision

Examine the feature request:

1. If the user explicitly asks for a track (`/quick X`, `/config-only Y`,
   `/dep-update Z`), honour that — do not second-guess.
2. If the request describes a single-sentence change on one file or
   config value, **offer** the appropriate track:
   > "This looks like it fits `/quick` (or `/config-only`). That skips
   > design and the full peer-review matrix, and takes ~5–10 minutes
   > instead of ~30–90. Full `/pipeline` still available if you prefer.
   > Which track?"
   Wait for the user's choice. Do not auto-downgrade silently.
3. If the request is ambiguous, ask one clarifying question (scope, area,
   risk profile) rather than guessing.
4. If the request is clearly feature-sized (multi-area, API/schema
   change, new surface), proceed with full pipeline without prompting.

**Safety stoplist** — always use full `/pipeline`, never a lighter track,
for any of:

- Authentication / authorization / session handling
- Cryptography, key management, secrets rotation
- PII / payments / regulated-data handling
- Schema migrations, destructive data changes
- Feature-flag introduction (toggling existing flags is fine in `/config-only`)
- New external dependencies (upgrades are fine in `/dep-update`)

Record the routing decision under `## Brief Changes` in `pipeline/context.md`
as `TRACK: full` (or `quick` / `config-only` / `dep-update`) with a one-line
rationale.

## Execution

Follow the stage sequence in `.claude/rules/pipeline.md` exactly.

After each stage, print one status line:
`[Stage N — Name] ✅ PASS` or `[Stage N — Name] ❌ FAIL — reason`

### Stage 7 auto-fold check (v2.2+)

Before invoking the `pm` agent for Stage 7, check Stage 6's gate. If
all of the following are true, skip the PM invocation and write Stage 7
directly with `"auto_from_stage_06": true`:

- `stage-06.json` has `"status": "PASS"` and `"all_acceptance_criteria_met": true`
- The Stage 6 test report has a 1:1 mapping from each acceptance criterion
  to at least one passing test (no criterion with zero tests; no test
  covering multiple criteria with distinct verify conditions)
- The user did not request manual sign-off
- The track is not `/hotfix`

Otherwise invoke the PM agent normally. See `.claude/rules/pipeline.md`
Stage 7 for the detailed auto-fold contract.

At each HUMAN CHECKPOINT (A, B, C):
- Print a plain-English summary of what was produced
- Write the checkpoint gate file
- Print: "✋ **Checkpoint [A/B/C]** — type `proceed` to continue, or give feedback to adjust before the next stage"
- Halt and wait

On ESCALATE from any gate:
- Stop immediately
- Print the `escalation_reason` and `decision_needed`
- Show `options` if present
- Wait for user input
- Record the decision in `pipeline/context.md` under `## User Decisions`
- Resume from the halted stage

## End of Pipeline

Print a summary table:

| Stage | Name | Status |
|-------|------|--------|
| 1 | Requirements | ✅ |
| 2 | Design | ✅ |
| ... | ... | ... |
