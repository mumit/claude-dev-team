---
description: >
  Reset the pipeline for a new feature run. Archives the current pipeline
  output, clears gate files, and prepares for a fresh start. Does NOT
  touch src/ — code changes are managed via git.
  Usage: /reset [optional archive label]
---

# Pipeline Reset

Archive and reset the pipeline directory for a new feature run.

Steps:
1. Create `pipeline/archive/` if it doesn't exist
2. Move all files from `pipeline/` (except `archive/` **and
   `lessons-learned.md`**) into `pipeline/archive/run-{timestamp}/`.
   This includes `context.md` and `retrospective.md`.
3. `pipeline/lessons-learned.md` is **persistent** — do not move, copy,
   or modify it. It carries durable rules forward to the next pipeline run.
4. Reset `pipeline/context.md` to its empty template (the header and
   empty sections — no carried-over content). The old context is preserved
   in the archive from step 2.
5. Recreate empty directories: `pipeline/gates/`, `pipeline/adr/`,
   `pipeline/code-review/`
6. Clean up orphaned git worktrees from Stage 4:
   Run `git worktree list`. For any worktree whose path contains
   `dev-team-`, run `git worktree remove <path> --force`.
   Report what was cleaned up (or "no orphaned worktrees found").
7. Report what was archived, confirm `lessons-learned.md` was preserved
   (or note that it doesn't exist yet), and confirm the pipeline is ready.

Archive label (if provided): $ARGUMENTS

Do NOT run git commands. Do NOT delete anything permanently.
Do NOT touch src/ or .claude/.
