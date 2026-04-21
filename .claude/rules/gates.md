# Gate Schema

Every stage writes a JSON gate file to `pipeline/gates/`.
The orchestrator reads JSON, not prose. Gates are machine-readable.

## Required Fields (all gates)

```json
{
  "stage": "string",
  "status": "PASS | FAIL | ESCALATE",
  "agent": "name of agent that wrote this",
  "timestamp": "ISO 8601",
  "blockers": [],
  "warnings": []
}
```

## Stage-Specific Extra Fields

### Stage 01 (PM brief)
```json
{ "acceptance_criteria_count": 5, "out_of_scope_items": [] }
```

### Stage 02 (Design)
```json
{ "arch_approved": true, "pm_approved": true, "adr_count": 2 }
```

### Stage 04 (Build, per area)
```json
{ "area": "backend | frontend | platform", "files_changed": [] }
```

### Stage 05 (Code review, per area)
```json
{
  "area": "backend | frontend | platform",
  "approvals": ["dev-frontend", "dev-platform"],
  "changes_requested": [],
  "escalated_to_principal": false
}
```

**Validity rule:** a Stage 05 gate's `approvals` entry is invalid if the
named agent modified any file under `src/` during the same invocation.
The READ-ONLY Reviewer Rule in `pipeline.md` forbids fix-forward patches.
If a gate-validator hook detects a source-file edit in the same turn as
an approval, treat the gate as FAIL and re-run the review from the
clean source tree.

### Stage 06 (Tests)
```json
{
  "all_acceptance_criteria_met": true,
  "tests_total": 0,
  "tests_passed": 0,
  "tests_failed": 0,
  "failing_tests": [],
  "assigned_retry_to": null
}
```

### Stage 07 (PM sign-off)
```json
{ "pm_signoff": true, "delta_items": [] }
```

### Stage 08 (Deploy)
```json
{ "environment": "production", "smoke_test_passed": true }
```

### Stage 09 (Retrospective)
Informational gate — status is PASS unless synthesis itself failed.
```json
{
  "severity": "green | yellow | red",
  "lessons_promoted": ["L007 — clarify notify channel in brief"],
  "lessons_retired": ["L002 — prefer offset pagination"],
  "contributions_written": ["pm", "principal", "dev-backend", "dev-frontend", "dev-platform"]
}
```

## Retry Protocol

On FAIL gates with retries, include:
```json
{
  "retry_number": 1,
  "previous_failure_reason": "string",
  "this_attempt_differs_by": "string — required, must be non-empty"
}
```

If `retry_number` >= 2 AND `failing_tests` matches previous FAIL gate exactly:
set `"status": "ESCALATE"` and halt. Same failure twice = escalate, don't retry.
