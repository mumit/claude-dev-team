---
description: >
  Run a full codebase audit: map the architecture, assess health, perform
  deep analysis, and generate a prioritized improvement roadmap. Use this
  when you want to deeply understand an existing codebase, find problems,
  and build an action plan. Runs Phases 0-3 with human checkpoints between
  each phase.
---

# /audit

You are running a full codebase audit.
Read `.claude/references/audit-phases.md` before doing anything else.

## Input

The text after `/audit` is an optional scope constraint.
- If provided (e.g., `/audit src/backend/`), focus the audit on that area only.
- If `/audit --resume`, read `docs/audit/status.json` and resume from the last completed phase.
- If neither, audit the entire codebase.

## Startup

1. Read `.claude/references/audit-phases.md`
2. Read CLAUDE.md if it exists
3. Create `docs/audit/` directory if it doesn't exist
4. Check for `docs/audit-extensions.md` — note whether it exists (used after each phase)
5. Check for `docs/audit/status.json` — if resuming, load state

Write initial status:
```json
// docs/audit/status.json
{
  "started": "YYYY-MM-DDTHH:MM:SS",
  "scope": "full" or "scoped to X",
  "phases": {
    "phase-0": "pending",
    "phase-1": "pending",
    "phase-2": "pending",
    "phase-3": "pending"
  },
  "current_phase": "phase-0"
}
```

## Execution

Run each phase as defined in `.claude/references/audit-phases.md`.

### Phase 0 — Bootstrap
Run steps 0.1, 0.2, 0.3. Write each output file.
If extensions exist, run Phase 0 extensions and append results.
Update `status.json`: `"phase-0": "complete"`.

Print summary:
```
[Phase 0 — Bootstrap] ✅ Complete
  • Project: [language/framework]
  • Size: [N files, M modules/services]
  • Key finding: [one-sentence highlight]
```

**✋ Checkpoint A** — "I've mapped the project architecture. Review docs/audit/00-project-context.md and docs/audit/01-architecture.md. Type `proceed` to continue to health assessment, or give feedback to adjust."

### Phase 1 — Health Assessment
Run steps 1.1, 1.2, 1.3. Write each output file.
If extensions exist, run Phase 1 extensions and append results.
Update `status.json`: `"phase-1": "complete"`.

Print summary:
```
[Phase 1 — Health Assessment] ✅ Complete
  • Convention violations: [N findings, M high-confidence]
  • Test coverage: [brief summary]
  • Documentation: [brief summary]
```

**✋ Checkpoint B** — "Health assessment complete. Review the findings in docs/audit/03-compliance.md, 04-tests.md, and 05-documentation.md. Type `proceed` for deep analysis, or give feedback."

### Phase 2 — Deep Analysis
Run steps 2.1, 2.2, 2.3. Write each output file.
If extensions exist, run Phase 2 extensions and append results.
Update `status.json`: `"phase-2": "complete"`.

Print summary:
```
[Phase 2 — Deep Analysis] ✅ Complete
  • Security: [N findings, M critical/high]
  • Performance: [N findings]
  • Code quality: [N findings]
```

**✋ Checkpoint C** — "Deep analysis complete. Review docs/audit/06-security.md, 07-performance.md, and 08-code-quality.md. Type `proceed` to generate the roadmap, or give feedback."

### Phase 3 — Roadmap
Run steps 3.1, 3.2. Write each output file.
If extensions exist, run Phase 3 extensions and append results.
Update `status.json`: `"phase-3": "complete"`.

## End of Audit

Print a summary dashboard:

```
Codebase Audit Complete
═══════════════════════════════════════════════════
Phase                    Status     Files
─────────────────────────────────────────────────
0  Bootstrap             ✅         00, 01, 02
1  Health Assessment     ✅         03, 04, 05
2  Deep Analysis         ✅         06, 07, 08
3  Roadmap               ✅         09, 10
─────────────────────────────────────────────────

Themes: [list 3-5 themes from backlog]

Roadmap summary:
  P0 (fix now):           [N items]
  P1 (quick wins):        [N items]
  P2 (targeted):          [N items]
  P3 (strategic):         [N items]
  Parked:                 [N items]

Next step: use `implement [item]` to start working on roadmap items,
or `/roadmap` to see the full plan.
```

## Monorepo Handling

If Phase 0 reveals this is a monorepo with multiple apps/services:
1. Complete Phase 0 for the whole repo
2. Ask the user: "This is a monorepo with [N] services. Run Phases 1-2 across everything, or focus on a specific subsystem?"
3. If focused: run Phases 1-2 on the chosen subsystem, then ask about the next
4. Run Phase 3 across all findings regardless
