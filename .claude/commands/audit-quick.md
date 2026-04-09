---
description: >
  Run a quick codebase orientation and health scan (Phases 0-1 only).
  Use this when you want to understand a codebase fast without a full
  deep analysis. Produces architecture map and health findings but
  skips security review, performance analysis, and roadmap generation.
  Good for onboarding onto a new project or a quick checkup.
---

# /audit-quick

You are running a quick audit — Phases 0 and 1 only.
Read `.claude/references/audit-phases.md` before doing anything else.

## Input

The text after `/audit-quick` is an optional scope constraint.
If provided, focus on that area only.

## Execution

1. Read `.claude/references/audit-phases.md`
2. Read CLAUDE.md if it exists
3. Create `docs/audit/` directory if it doesn't exist
4. Check for `docs/audit-extensions.md`

Run Phase 0 (all steps: 0.1, 0.2, 0.3) and Phase 1 (all steps: 1.1, 1.2, 1.3).
Write all output files. Run extensions if they exist.

Write `docs/audit/status.json` with phases 0 and 1 complete, phases 2 and 3 pending.

## End

Print summary:

```
Quick Audit Complete
═══════════════════════════════════════════════════
Phase                    Status     Files
─────────────────────────────────────────────────
0  Bootstrap             ✅         00, 01, 02
1  Health Assessment     ✅         03, 04, 05
2  Deep Analysis         ⏭️  Skipped
3  Roadmap               ⏭️  Skipped
─────────────────────────────────────────────────

Project: [language/framework], [N modules/services]
Convention issues: [N findings]
Test health: [brief]
Doc gaps: [brief]

To continue with deep analysis and roadmap: /audit --resume
```
