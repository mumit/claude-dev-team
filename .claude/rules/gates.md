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

**Enforced since v2.1**: the validator exits 1 on any gate where
`retry_number >= 1` but `this_attempt_differs_by` is missing or empty. The
fix is to state the delta explicitly before re-writing the gate.

---

## Track field (v2.0+)

Every gate should carry a `"track"` field identifying which pipeline
track the gate belongs to. Valid values: `full`, `quick`, `config-only`,
`dep-update`, `hotfix`.

```json
{ "track": "full" }
```

The validator emits an advisory (non-blocking) when the field is missing
or carries an unrecognised value. Legacy gates written before v2.0 don't
carry the field — they still pass, but downstream tooling that branches on
track should treat "missing" as "full" for backward compatibility.

---

## What the validator enforces (v2.1)

The `gate-validator.js` hook runs after every subagent stop. As of v2.1
it performs these checks in order:

1. **Bypassed-escalation sweep.** Across all gate files, if any gate has
   `"status": "ESCALATE"` but is not the most recently modified, the
   pipeline has written a later gate without resolving the earlier
   escalation. The validator exits 3 and reports which gate was bypassed.
2. **Most-recent-gate status.** The primary exit code still reflects the
   most recently modified gate: 0 on PASS, 2 on FAIL, 3 on ESCALATE.
3. **Required-field presence.** Exits 1 on gates missing any of `stage`,
   `status`, `agent`, `timestamp`, `blockers`, `warnings`.
4. **Retry integrity.** Exits 1 when `retry_number >= 1` without a
   non-empty `this_attempt_differs_by` string (see above).
5. **Advisory: track field.** Warns without halting when `track` is
   missing or unrecognised.
6. **Advisory: lessons-learned format.** Scans `pipeline/lessons-learned.md`
   for malformed `**Reinforced:**` lines. Only two forms are valid:
   - `**Reinforced:** 0` (no suffix; lesson has never been reinforced)
   - `**Reinforced:** <N> (last: YYYY-MM-DD)` where N ≥ 1

Unexpected internal errors in the validator itself are downgraded to a
WARN and exit 0 so a bug in the hook never halts a live pipeline. The
test suite at `tests/gate-validator.test.js` is the authoritative check
for correct validator behaviour.
