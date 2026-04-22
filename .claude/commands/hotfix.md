---
description: >
  Run an expedited hotfix pipeline: skips design stage, goes directly to
  build → peer review → test → deploy. Use ONLY for critical production
  bugs with a clear, scoped fix. Requires PM sign-off before deploy.
  Pass a description of the bug and the intended fix as the argument.
---

# /hotfix

⚠️  HOTFIX MODE — Design stage skipped. Use only for scoped production bugs.

The bug and fix description is: $ARGUMENTS

Read `.claude/rules/pipeline.md` for stage details, but run only:
  Stage 4 (Build) → Stage 4.5b (Security, conditional) → Stage 5 (Review) → Stage 6 (Test) → Stage 7 (PM sign-off) → Stage 8 (Deploy)

**Stage 4.5a (lint + type-check + SCA) is skipped** for hotfixes — the
blast-radius constraint in `pipeline/hotfix-spec.md` already bounds scope
tightly enough that pre-review automated checks add more delay than value.
Record the skip in `pipeline/context.md` as `STAGE-4.5A-SKIP: hotfix track`.

**Stage 4.5b (security review) still runs** if the heuristic fires — hotfixes
frequently touch security surfaces, and that is exactly when security review is
most needed. Do not skip 4.5b even under time pressure.

Before invoking any dev agent, write a minimal fix spec to
`pipeline/hotfix-spec.md` covering:
- What is broken
- What the fix changes
- What must NOT change (blast radius constraint)

Pass `pipeline/hotfix-spec.md` to each dev agent instead of `pipeline/design-spec.md`.

Human checkpoints still apply at Checkpoint C (after tests pass).
PM sign-off is required before deploy regardless of urgency.

## Stage 9 — Retrospective (abbreviated)

After Stage 8 completes (or on a red halt), run an abbreviated retro.
The parallel 5-agent contribution pass is skipped. Instead:

- The dev(s) who built the fix each append one section to
  `pipeline/retrospective.md` under their `## dev-{area}` heading using
  the four-heading template.
- Principal runs the synthesis step as normal.

Gate file: `pipeline/gates/stage-09.json` with `"track": "hotfix"`.

Promotion limit: 0 for hotfix retros. `pipeline/lessons-learned.md` is not
updated from a hotfix run unless the Principal explicitly marks a lesson as
durable and distinct from the incident itself. Rationale: lessons extracted
under pressure are often too narrow — they describe this bug, not a
generalisable rule.

## Reviewer Instruction for Hotfix

When invoking each reviewer agent during Stage 5, pass this additional instruction:

> This is a hotfix review. Before evaluating code quality, read `pipeline/hotfix-spec.md`
> and verify the changes do NOT touch any area listed under "What must NOT change
> (blast radius constraint)". If any change violates the blast radius constraint,
> that is an automatic BLOCKER — mark the review `REVIEW: CHANGES REQUESTED` and
> specify exactly which files/lines exceed the constraint.
