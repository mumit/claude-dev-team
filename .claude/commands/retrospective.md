---
description: >
  Run Stage 9 (Retrospective) standalone on the current pipeline state.
  Gathers contributions from all five agents in parallel, then invokes
  Principal to synthesise and promote lessons into the persistent
  pipeline/lessons-learned.md. Use after a pipeline halts red (failed
  deploy, unresolved escalation) or any time you want the team to reflect
  on a completed run before /reset.
---

# /retrospective

You are running Stage 9 standalone.
Read `.claude/rules/retrospective.md` before doing anything else.

## Preconditions

1. `pipeline/brief.md` exists (there has to be something to retro on)
2. At least one of `pipeline/pr-*.md` OR `pipeline/test-report.md` exists

If neither: print "Nothing to retro — no build artefacts found." and halt.

## Execution

### Step 9a — Contribution pass (parallel)

Invoke in parallel — one message with five Agent calls:
- `pm`
- `principal` (contribution only — not synthesis yet)
- `dev-backend`
- `dev-frontend`
- `dev-platform`

Each agent reads the inputs listed in `.claude/rules/retrospective.md`
and appends its section to `pipeline/retrospective.md` using the
four-heading template.

### Step 9b — Synthesis

After all five contributions are written, invoke `principal` again with
the synthesis task. Principal prepends a synthesis block to
`pipeline/retrospective.md` and updates `pipeline/lessons-learned.md`
(max 2 promotions, retire rules proved wrong or reinforced ≥5x).

Write `pipeline/gates/stage-09.json`.

## Output

Print to the user:

1. Severity (green / yellow / red) and top theme from the synthesis block.
2. The list of **lessons promoted** to `pipeline/lessons-learned.md`
   (each shown as `L<NNN> — title` with the Why line).
3. The list of **lessons retired**, with the reason.
4. The path to `pipeline/retrospective.md` for full detail.

Do not print the full retro file — it is too long. Summary only.
