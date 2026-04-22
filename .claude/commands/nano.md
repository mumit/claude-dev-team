---
description: >
  Run a nano pipeline for trivial single-file changes: documentation edits,
  typo fixes, comment corrections, dead-code removal with no callers.
  No brief, no design, no peer review, no deploy. Single dev edits,
  affected tests run, done. Use only when the change cannot affect runtime
  behaviour.
---

# /nano

⚡⚡ NANO MODE — No brief, no design, no review.
Single-file trivial changes only. If in doubt, use `/quick`.

The change is: $ARGUMENTS

If no arguments are provided, ask: "What's the trivial change?"

## When `/nano` is appropriate

**ALL** of the following must be true:

- At most two closely related files
- The diff **cannot** affect runtime behaviour: no logic change, no API
  surface, no data shape change, no config value change, no dependency
- Examples that qualify: typo in a comment, dead import removal with no
  callers, README link fix, markdown formatting, doc section rewrite
- Does not touch files that execute in production (`src/**/*.ts`,
  `src/**/*.py`, etc.) — only documentation, comments, and clearly dead
  code

If any of those fail → use `/quick`. When in doubt → use `/quick`.
The cost difference is small; the risk of silently underspecifying is not.

## Routing guard

Before proceeding, the orchestrator must confirm: "Could this change
execute, affect a value, or alter a contract in any environment?"
If the answer is anything other than a definitive "no", route to `/quick`.

## Stages (nano track)

No Stage 1 (no brief), Stage 2 (no design), Stage 3 (no clarification),
Stage 4.5 (no pre-review gate), Stage 5 (no peer review), Stage 8
(no pipeline deploy), Stage 9 (no retro).

### Stage 0 — Scope capture (orchestrator, no agent)

Record the intent in `pipeline/context.md` under `## Brief Changes`:

```
TRACK: nano
CHANGE: <one sentence>
FILE(S): <list of files>
```

### Stage 4 — Edit (single owning dev)

Invoke the owning dev agent (`dev-backend`, `dev-frontend`, or
`dev-platform`). Pass `TRACK=nano` and explicitly instruct it to **skip**
reading `pipeline/design-spec.md` — there is no design spec in a nano run.
Also skip the `## Plan` and `## Assumptions` ceremony normally required by
coding-principles §1 and §4.

- Make only the described change — no opportunistic cleanup elsewhere
- No `## Plan` or `## Assumptions` ceremony required
- Write a one-line summary to `pipeline/pr-{area}.md`

Gate file: `pipeline/gates/stage-04-{area}.json` with `"track": "nano"`.

**Stage 4.5a and 4.5b are both skipped.** There is no dependency change,
security surface, or infra file by nano's scope definition. If either
condition is uncertain, that's a signal the change isn't nano — use
`/quick`.

### Stage 6 — Tests (dev-qa)

Invoke: `dev-qa` agent.

Run only the tests relevant to the changed file(s). If no tests exist for
the changed file (e.g. a pure docs edit), record that in the gate and
proceed.

The pass bar is **no regression** — no new failures versus the pre-change
baseline.

Gate file: `pipeline/gates/stage-06.json` with `"track": "nano"` and
`"regression_check": "PASS"`.

**No Checkpoint C** — proceed automatically if tests pass.

### Stage 7 — Auto-fold (orchestrator, no agent)

Stage 7 always auto-folds for nano. Write the gate directly:

```json
{
  "stage": "stage-07",
  "status": "PASS",
  "pm_signoff": true,
  "auto_from_stage_06": true,
  "track": "nano",
  "agent": "orchestrator",
  "timestamp": "<ISO>",
  "blockers": [],
  "warnings": []
}
```

### No deploy, no retro

Nano changes are committed and pushed through the normal developer
workflow, not through the pipeline deploy stage. Skip Stages 8 and 9.

Append one line to `## Fix Log` in `pipeline/context.md`:

```
YYYY-MM-DD — nano: [file(s)] — [one-line rationale]
```

## Escalation out of nano

At any stage, if scope turns out to be larger than described, stop
immediately and tell the user:

> "This change is larger than nano. Re-run as `/quick`."

Signals that scope has outgrown nano:

- Dev edits more than 2 files
- Dev touches any logic, test, or config file
- Tests reveal a behaviour change (not a pre-existing failure)
- The owning dev writes a `QUESTION:` or `CONCERN:` — nano changes should
  have no ambiguity; escalate rather than guess
