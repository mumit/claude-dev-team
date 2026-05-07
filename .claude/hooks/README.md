# Hooks

Two Node scripts wired into Claude Code's hook system to enforce gate
integrity and derive Stage 5 approvals deterministically from review
files. Both run with the user's filesystem permissions in the project's
working directory.

The framework keeps a byte-identical copy of each hook under `scripts/`
so the same code can be invoked from `claude-team.js` and from CI.
`tests/hook-parity.test.js` pins the pairs equal; do not edit one
without updating the other.

## What a hook is

A hook is a shell command Claude Code runs in response to a named event.
Hooks are registered in `.claude/settings.json` under `hooks.<event>`.
Claude Code passes event-specific context on stdin (a JSON object) and
inspects the exit code:

- **0** — succeed silently; the session continues.
- **non-zero** — the user-facing meaning depends on the event. For
  `Stop` and `SubagentStop`, non-zero halts the agent boundary; for
  `PostToolUse`, the tool result is still surfaced to the user but the
  hook output is logged.

This framework reads the JSON context only inside `approval-derivation`
and only to extract the file path being written, so the hook can early-
exit on non-review files. Everything else relies on the working
directory being the project root (Claude Code guarantees this).

## How `settings.json` wires hooks

```jsonc
"hooks": {
  "PostToolUse": [
    {
      "matcher": "Write|Edit",
      "hooks": [
        {
          "type": "command",
          "command": "bash -c 'node \"$(git rev-parse --show-toplevel)/.claude/hooks/approval-derivation.js\"'"
        }
      ]
    }
  ],
  "SubagentStop": [
    { "hooks": [{ "type": "command", "command": "bash -c 'node \"$(git rev-parse --show-toplevel)/.claude/hooks/gate-validator.js\"'" }] }
  ],
  "Stop": [
    { "hooks": [{ "type": "command", "command": "bash -c 'node \"$(git rev-parse --show-toplevel)/.claude/hooks/gate-validator.js\"'" }] }
  ]
}
```

The `git rev-parse --show-toplevel` shim keeps the path correct when
the user runs Claude Code from a sub-directory; if the project is not
in a git repo the hook will fail to start.

## `approval-derivation.js` (PostToolUse)

**Trigger:** every `Write` or `Edit` (matcher is unfiltered; the hook
filters internally on path). Cold-start cost is ~50 ms per save; the
non-review-file path exits in <10 ms after stdin parse.

**Reads:**
- Stdin: the PostToolUse context JSON. Parsed only to obtain the
  written file path; on parse failure the hook falls back to scanning
  every review file in `pipeline/code-review/` (slower, but correct).
- `pipeline/code-review/by-<reviewer>.md` files. Per-area sections
  ending in `REVIEW: APPROVED` or `REVIEW: CHANGES REQUESTED` are the
  only authoritative source of approval state.

**Writes:**
- `pipeline/gates/stage-05-<area>.json` — atomic temp-file write +
  rename, protected by a `.lock` file (5 s stale-lock timeout, 20 ×
  30 ms retry). Agents that edit `approvals` or `changes_requested`
  arrays directly will be overwritten on the next reviewer save.

**Exit code:** always 0. Failures are logged to stdout as
`[approval-derivation] WARN …` so the user sees them, but the hook
does not halt a session.

## `gate-validator.js` (Stop, SubagentStop)

**Trigger:** every agent boundary. Validates the most recent gate
file in `pipeline/gates/` and sweeps all gates for unresolved
escalations.

**Reads:**
- `pipeline/gates/*.json`. The newest file determines status; older
  files are scanned for `status: ESCALATE` to detect bypassed
  escalations (`v2.1+`).
- `pipeline/lessons-learned.md`, if present, for malformed
  `**Reinforced:**` lines (advisory warning only).

**Writes:** none.

**Exit codes:**

| Code | Meaning |
|---|---|
| 0 | PASS — most recent gate is PASS, no bypassed escalations. |
| 1 | Validator-level error — gate JSON malformed, required field missing, retry without `this_attempt_differs_by`, OR a halt-class filesystem error (`EACCES`, `EPERM`, `ENOTDIR`, `EISDIR`, `EROFS`) on `pipeline/gates/`. |
| 2 | FAIL — most recent gate has `status: FAIL`. |
| 3 | ESCALATE — most recent gate is `ESCALATE` OR an older gate is `ESCALATE` and a newer gate exists (bypass). |

A non-fs runtime error inside the validator itself logs a warning and
exits 0, on the principle that a hook bug should not halt every user
session. Filesystem errors *do* halt — see audit finding B-3 / S-03.

## Adding a new hook

1. Pick an event from Claude Code's hook taxonomy. The two used today
   are `PostToolUse` and `Stop` / `SubagentStop`.
2. Write the hook as a self-contained Node script under
   `.claude/hooks/<name>.js`. Constraints:
   - Zero runtime deps (the framework's stance).
   - Use `node:fs`, `node:path`, `node:child_process`, `node:crypto`
     only.
   - Read the working directory; do not assume the script's own path
     is the project root. Use `process.cwd()` or the
     `git rev-parse --show-toplevel` shim wired in `settings.json`.
   - Bound execution time and memory; another agent's session is on
     the other end.
3. Decide whether the hook must also run from CI. If so, copy the
   file to `scripts/<name>.js` and add a parity assertion to
   `tests/hook-parity.test.js`.
4. Register the hook in `.claude/settings.json` under `hooks.<event>`.
5. Add tests under `tests/<name>.test.js` covering: happy path, every
   exit code (if non-zero meaningful), failure-recovery paths, and
   any concurrency model.
6. Document the hook in this README under a new heading.

## Debugging hooks

- **The hook didn't run.** Confirm `.claude/settings.json` is valid
  JSON (`node -e 'JSON.parse(require("fs").readFileSync(".claude/settings.json","utf8"))'`)
  and that the matcher applies. The `git rev-parse` shim fails outside
  a git repo; `git init` if needed.
- **The hook ran but gate didn't update.** Check
  `pipeline/gates/.lock` — a stale lock blocks writes for up to 5 s
  but is auto-recovered. Delete it manually only if the recovery is
  somehow failing.
- **`gate-validator.js` exits 1 unexpectedly.** Likely a malformed
  gate JSON or a missing required field. Inspect the gate file the
  agent just wrote; the validator names it in its error output.
- **Approval-derivation seems slow on every save.** Expected: the
  hook spawns a fresh node process on every Write/Edit. Cost is
  bounded at ~50 ms per save; non-review-file saves exit in <10 ms
  after stdin parse.
