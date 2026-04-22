---
description: >
  Run a lightweight single-dev pipeline for small, contained changes. Skips
  the design stage and the full peer-review matrix; one dev edits, one
  reviewer from a different area approves, tests run, deploy optional.
  Use for typo fixes, docs updates, config tweaks, one-file refactors,
  and anything under ~20 LOC that clearly belongs to one owning area.
---

# /quick

⚡ QUICK MODE — Design stage skipped. Single-dev + single cross-area reviewer.
Use for contained changes: docs, typos, small refactors, single-file edits.

The change request is: $ARGUMENTS

If no arguments are provided, ask: "What's the change?"

## When `/quick` is appropriate

- Single file, or a small group of closely related files under **one owning area**
  (`src/backend/`, `src/frontend/`, or `src/infra/`)
- No new API surface, no schema change, no new dependency
- Estimated diff under ~100 LOC
- Does not touch auth, crypto, payments, PII handling, or migrations
- No feature flag or rollout coordination needed

If any of those fail, stop and recommend `/pipeline` (or `/hotfix` for
urgent production bugs).

## Routing decision

Before invoking any agent, the orchestrator must classify the change:

1. Decide the owning area from the change description.
2. If the description is ambiguous between areas, ask the user to confirm
   before proceeding. Do not guess.
3. If the description mentions anything on the stoplist above (auth, crypto,
   payments, PII, migrations, new dependency, cross-area), abort the `/quick`
   track and tell the user: "This needs `/pipeline` — it touches [X]."

## Stages (quick track)

### Stage 1 — Mini brief (PM)

Invoke: `pm` agent.
Input: the change request + an explicit instruction that this is a quick-track
change (no acceptance-criteria proliferation; one or two bullet points is fine).
Output: `pipeline/brief.md` with:

- One-line problem statement
- 1–3 acceptance criteria, each observable
- Out-of-scope line if anything nearby could be mistaken for in-scope

Gate file: `pipeline/gates/stage-01.json` with `"track": "quick"`.

**No Checkpoint A.** Quick-track briefs are tight enough that the human
reviews at Checkpoint C (tests).

### Stage 4 — Build (single dev)

Invoke the owning dev agent (`dev-backend`, `dev-frontend`, or `dev-platform`).
Pass the explicit instruction: `TRACK=quick` — the dev must:

- Skip the `## Assumptions` ceremony block unless there are actual assumptions
  to record (coding-principles §1 is relaxed for quick-track)
- Write a short `## Plan` in `pipeline/pr-{area}.md` with verify steps mapped
  to acceptance criteria — still required, still concrete
- Keep the diff under ~100 LOC or halt and escalate to full pipeline

Gate file: `pipeline/gates/stage-04-{area}.json`.

### Stage 5 — Single reviewer (cross-area)

Pick one reviewer from a **different** area than the owning dev:

| Owning dev | Default reviewer |
|---|---|
| `dev-backend`  | `dev-platform` |
| `dev-frontend` | `dev-backend`  |
| `dev-platform` | `dev-backend`  |

**Gate pre-creation (required).** Before invoking the reviewer, the
orchestrator must write `pipeline/gates/stage-05-{area}.json` with at
minimum `"required_approvals": 1` and `"review_shape": "scoped"`. The
`approval-derivation.js` hook defaults newly-created gates to
`required_approvals: 2` (matrix). If the gate doesn't pre-exist with the
correct value, the hook creates a matrix gate and the review never passes
on a single approval.

The reviewer follows the READ-ONLY Reviewer Rule from
`.claude/rules/pipeline.md` Stage 5 exactly. One approval closes the gate.

Gate file: `pipeline/gates/stage-05-{area}.json` requires **1** entry in
`"approvals"` (not 2) AND `"track": "quick"` in the gate body.

If the reviewer writes `REVIEW: CHANGES REQUESTED`, the owning dev fixes in
their area — no fix-forward. After one round-trip, if it isn't resolved,
escalate to full `/pipeline`.

### Stage 6 — Tests (QA dev)

Invoke: `dev-qa` agent (owns Stage 6 from v2.3; see `.claude/rules/pipeline.md`
§Stage 6 for the full contract).
Run the test suite; map results to the acceptance criteria in the mini brief.
Gate file: `pipeline/gates/stage-06.json` with `"all_acceptance_criteria_met":
true`.

**Checkpoint C applies** — user confirms before any deploy.

### Stage 7 — PM sign-off (auto-pass)

Apply the Stage 7 auto-fold check from `.claude/rules/pipeline.md` §Stage 7.
For the quick track the `/hotfix` exception does not apply (quick is never
a hotfix), so the only conditions that matter are:

- `stage-06.json` has `"status": "PASS"` and `"all_acceptance_criteria_met": true`
- The Stage 6 gate has a 1:1 criterion-to-test mapping
- The user did not request manual sign-off

When all conditions hold, write Stage 7 with `"pm_signoff": true` and
`"auto_from_stage_06": true`. No PM invocation.
If any condition fails, invoke `pm` to decide delta or abort.

### Stage 8 — Deploy (optional)

Deploy is **not automatic** in quick track. After Checkpoint C, ask the user:
"Tests pass. Deploy now, or stop here?"

- `deploy` → run Stage 8 as defined in `pipeline.md`
- `stop` → end the run; write a minimal `pipeline/deploy-log.md` recording
  that the change is tested but not deployed

### Stage 9 — Retrospective (abbreviated)

Quick track skips the 5-agent parallel contribution pass. Instead:

- The owning dev appends one section to `pipeline/retrospective.md` under
  `## dev-{area}` with the four-heading template
- Principal runs the synthesis step as normal, but the promotion limit is
  0 for quick-track unless the dev explicitly surfaces a durable lesson
  (preserves the signal-to-noise of `lessons-learned.md`)

Gate file: `pipeline/gates/stage-09.json` with `"track": "quick"`.

## Escalation out of quick track

At any stage, if the scope outgrows the track, the orchestrator must halt
and tell the user: "Quick track is too small for this change. Re-run as
`/pipeline`." Do not silently expand the stage set.

Signals that scope has outgrown quick:

- Diff exceeds ~100 LOC or spans more than one area
- A new dependency, API, or schema change surfaces
- Reviewer's blockers can't be resolved in one round-trip
- Tests reveal behaviour outside the mini-brief acceptance criteria
