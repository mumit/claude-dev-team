---
description: >
  Show the current roadmap status dashboard. Reads docs/audit/10-roadmap.md
  and displays progress: what's done, what's next, what's stalled.
  Use anytime to see where you are in the improvement plan.
---

# /roadmap

Read `docs/audit/10-roadmap.md` and `docs/audit/09-backlog.md`.

If neither file exists: "No roadmap found. Run `/audit` to generate one."

## Output

Print a status dashboard:

```
Improvement Roadmap
═══════════════════════════════════════════════════
Batch    Status       Items    Done    Remaining
─────────────────────────────────────────────────
1 (P0)   [status]     N        N       N
2 (P1)   [status]     N        N       N
3 (P2)   [status]     N        N       N
4 (P3)   [status]     N        N       N
Parked   —            N        —       —
─────────────────────────────────────────────────
```

Then print:

**Next up:** List the next 3 unfinished items in sequence, with their
title, effort estimate, and which batch they're in.

**Recently completed:** List any items marked `[DONE]` (check for the
prefix in the roadmap file, and cross-reference recent git history for
related commits).

**Stalled:** Items that appear to be in-progress but have no recent
git activity (no related commits in the last 2 weeks).

**Themes:** The 3-5 systemic themes from `docs/audit/09-backlog.md`.

End with: "Use `implement [item title]` to work on an item, or
`/health-check` to run a full delta scan."
