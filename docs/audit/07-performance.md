# 07 — Performance & Reliability

## Hot paths and observed costs

Estimates on a current laptop (M-series Mac, hot disk cache):

| Path | Frequency | Wall-clock |
|---|---|---|
| `approval-derivation.js` PostToolUse, non-review file | every Write/Edit during a Claude session | ~50–100 ms (cold start dominates) |
| `approval-derivation.js` PostToolUse, review file | a handful of times per Stage 5 | +20 ms for lock + atomic gate write |
| `gate-validator.js` Stop / SubagentStop | once per agent boundary | ~100–150 ms |
| `claude-team.js status` / `next` / `summary` | manual | ~150–250 ms |
| `npm test` | CI / pre-commit | ~9 s for 265 assertions |

Cumulative cost for a full `/pipeline` run: roughly 1–2 s of hook
overhead spread across the run. Acceptable; not user-visible.

## Findings

### P-01 — `gate-validator.js` swallows errors as PASS — MEDIUM
Mirror of S-03. Top-level `catch` exits 0 on any internal error,
silently green-lighting the pipeline on permission errors or hook bugs.
Fix: distinguish error classes; exit 1 on unexpected.

### P-02 — `approval-derivation` matcher is unfiltered Write/Edit — LOW
Mirror of C-03. The hook fires on every save, then internally short-
circuits when the path is not under `pipeline/code-review/`. Cost is
~50 ms of node cold-start per save during normal dev work. This is the
correct trade-off given Claude Code's matcher syntax does not support
path globs inside `Write|Edit`. Document the rationale, no code fix.

### P-03 — Lock-acquire spin uses busy-wait `while (Date.now() < end) { }` — LOW
**File:** `.claude/hooks/approval-derivation.js` ~lines 170–171.

The retry loop burns ~30 ms of CPU per attempt instead of yielding.
Twenty retries = ~600 ms of busy spinning in the absolute worst case.
Practically invisible but inelegant.

**Fix:** Replace the inner spin with `await new Promise(r =>
setTimeout(r, LOCK_DELAY_MS))` (and make the function async). Or use
`fs.watchFile` for event-driven retry. ~5 lines.

### P-04 — `gate-validator.js` re-reads every gate on every invocation — LOW
**File:** `.claude/hooks/gate-validator.js` lines ~144–154.

The escalation-bypass sweep iterates every gate file. With <30 gates
per pipeline run this is sub-30 ms; not a concern at current scale.
Could become noticeable in long-lived projects with many archived runs
in the same `pipeline/gates/` directory, but `/reset` archives gate
files between runs, so this is already mitigated.

### P-05 — `approval-derivation.js` has no telemetry on lock contention — LOW
A `WARN` is logged when lock acquisition fails after retries, but
there's no histogram of retries-needed or wait-time. If two reviewers
ever genuinely contend, debugging "why did the gate take 600 ms" is
hard.

**Fix:** Optional — emit `{ retries: N, waited_ms: T }` to stderr on
exit when retries > 0. Easy diagnostic if anyone reports a stuck Stage
5.

### P-06 — Lessons-learned regex scan runs every gate-validator — LOW
**File:** `.claude/hooks/gate-validator.js` lines ~118–141.

Re-parses the entire `lessons-learned.md` every Stop / SubagentStop.
Linear in lessons file size; ~10 ms per scan at current size. Not a
concern unless the file grows past several MB, which the auto-age-out
rule should prevent.

## Concurrency

The single most important reliability mechanism is the file-lock model
in `approval-derivation.js`:

- O_EXCL-style write to a `.lock` file
- Stale-lock recovery if the lock is older than 5 s (LOCK_STALE_MS)
- Atomic temp-file write + rename for the gate JSON
- `finally` block ensures the lock is released on exception paths
- Stale-lock recovery is unit-tested

This is among the better concurrency patterns the audit has seen in a
file-based coordination system. The only gap is **lack of tests for
true parallel reviewer invocation** (T-01 in the test-health phase).

## Graceful degradation

| Scenario | Behaviour | Verdict |
|---|---|---|
| `pipeline/` doesn't exist | hooks exit 0, no error | OK — `claude-team.js` creates dirs at first stage |
| `pipeline/gates/` unreadable (EACCES) | gate-validator catches and exits 0 | **bug — see P-01** |
| Gate file is corrupt JSON | approval-derivation logs WARN, leaves gate alone | OK |
| `lessons-learned.md` missing | gate-validator skips scan | OK |
| Two reviewers write simultaneously | second blocks on lock; both eventually succeed | OK in design, untested in practice |
| `.git` directory missing (hook command uses `git rev-parse`) | hook fails to find script root; warning printed | minor — see settings.json hook commands |

## Observability

Hooks log to stdout in human-readable form. Examples:
- `[approval-derivation] dev-frontend → APPROVED on backend (approvals: 1/2, status: FAIL)`
- `[gate-validator] PASS: stage-04-backend.json`

Two small improvements would help debugging:
1. **Quiet successful runs** by default; opt-in verbose via env var. The
   current behaviour clutters Claude Code's transcript with one line per
   gate per agent boundary.
2. **Structured logs** (JSON to stderr) under a `LOG_FORMAT=json` flag
   would let an external orchestrator consume hook results without
   parsing prose.

Neither blocks; both are quality-of-life wins.

## Scaling envelope

Current sizing:
- ~30 gates per pipeline run, archived on `/reset`.
- ~6 reviewer files per Stage 5.
- ~100–500 lessons in `lessons-learned.md` (auto-age-out caps growth).
- ~16 test files, ~265 assertions, ~9 s suite.

The framework is sized for one team running one pipeline at a time. None
of the current data structures would inhibit that.

## What's well-architected (preserve)

1. **Atomic temp-file + rename** for gate writes prevents partial JSON.
2. **Stale-lock recovery with explicit timeout** prevents indefinite
   blocking after a crashed hook process.
3. **Stdin-based early exit** in `approval-derivation.js` avoids
   directory scans on the 99% of saves that aren't review files.
4. **Bespoke parsing** keeps cold-start time low by avoiding
   `require('ajv')` etc.
5. **No persistent state** in any hook — every invocation reads its
   inputs fresh. Easy to reason about.
