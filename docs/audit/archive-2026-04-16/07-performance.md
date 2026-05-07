# 07 — Performance & Reliability

## Context

Conventional web-app performance concerns (throughput, latency, DB load) do not apply. This framework's "performance" axes are:

1. **Hook overhead** — `gate-validator.js` runs after every subagent stop; its cost is multiplied by pipeline depth.
2. **Pipeline reliability** — does a full run complete deterministically without hanging, retrying forever, or leaving orphaned state?
3. **Token economy** — agent context loading and pipeline artifact growth drive the dominant cost.
4. **Cross-platform portability** — does `bootstrap.sh` and `npm test` work on macOS, Linux, and CI runners?
5. **Graceful degradation** — how does the system behave when an agent fails, a gate is malformed, or a stage stalls?

---

## Findings

### Hook Overhead

**Finding P1 — `gate-validator.js` scans the whole gates directory on every invocation**
- File: `.claude/hooks/gate-validator.js:22-29`
- Observation: `readdirSync` + `statSync` per file + sort by mtime. For a typical pipeline run (8-12 gate files), this is sub-millisecond work. Even 100 gate files would take <5 ms.
- Impact: Negligible.
- Severity: ✅ no action

**Finding P2 — Hook fires on both `Stop` and `SubagentStop`**
- File: `.claude/settings.json:39-60`
- Observation: The same `node .claude/hooks/gate-validator.js` command is wired to both hook events. Each subagent stop plus the main agent stop re-runs the validator. For a full pipeline (~20+ subagent stops), the validator runs 20+ times.
- Impact: At <5 ms per invocation, 20 invocations is <0.1 s of total wall time. Negligible in absolute terms. But *conceptually* redundant — the latest gate hasn't changed between the SubagentStop and the immediate Stop that follows.
- Severity: **Informational** | Confidence: HIGH
- Suggested improvement: Optional — skip the hook on Stop if the last SubagentStop already ran within the same second. Not worth the complexity for the current cost.

### Pipeline Reliability

**Finding P3 — Orphaned worktree cleanup now wired into `/reset` and `/pipeline` (resolved)**
- Files: `.claude/commands/reset.md:22-25`, `.claude/commands/pipeline.md:28-30`
- Prior audit flagged orphaned worktrees as a Stage 4 reliability risk. Both commands now list `git worktree list` + `git worktree remove <path> --force` for any path matching `dev-team-*` as a preflight step.
- Severity: Resolved.

**Finding P4 — Stage-duration guidance added (resolved)**
- File: `.claude/rules/pipeline.md` ("Stage Duration Expectations" table)
- Prior audit flagged missing timeout discipline. Stage-by-stage typical/stall-indicator durations are now documented. Claude Code does not enforce timeouts — the documentation is guidance for the human watching the pipeline.
- Severity: Resolved (documentation mitigation).

**Finding P5 — No programmatic timeout on any stage**
- Observation: If an agent enters a loop or stalls on a large context, only the Claude Code session-level timeout saves the pipeline. The framework has no stage-level watchdog.
- Realistic risk: Low — Claude Code's own stop conditions catch most cases. A stall is visible to the watching human via `pipeline-context`.
- Severity: **Low** | Confidence: MEDIUM
- Suggested fix: None at framework level. A documented mitigation in `pipeline.md` ("Stall Indicators") is the right-sized response.

**Finding P6 — Retry-limit-3 + same-failure-escalates pattern is sound**
- File: `.claude/rules/gates.md` (Retry Protocol)
- Observation: The retry rule says "If `retry_number >= 2` and `failing_tests` matches previous FAIL exactly, escalate." This prevents a retry storm on a deterministic failure.
- Severity: ✅ positive pattern

**Finding P7 — Stage-5 has parallel (Agent Teams) and sequential fallback**
- File: `.claude/rules/pipeline.md:68-95`
- Observation: The dual-path design (parallel if Agent Teams available, else sequential reading other reviewers' files) is resilient to the experimental feature being unavailable. Sequential fallback correctly reads prior reviewer output to avoid duplicate comments.
- Severity: ✅ positive pattern

**Finding P8 — Gate append-merge for Stage 5 prevents overwrite races**
- File: `.claude/rules/pipeline.md:76-82`
- Observation: "Never overwrite a gate that already has entries in `approvals`. Append only." This explicit rule guards against one reviewer stomping another's gate entry when both run in parallel.
- Severity: ✅ positive pattern
- Caveat: In true parallel execution, two reviewers doing `read → modify → write` on the same JSON file can race. There is no file lock. On fast filesystems with truly simultaneous writes, the last writer wins. Agent Teams is sequential per Claude Code's current implementation, so this is theoretical today — but if it ever parallelizes writes, the rule needs enforcement (e.g., `flock`) not just documentation.
- Severity: **Low** | Confidence: MEDIUM (future concern)

### Token Economy

**Finding P9 — Every agent re-reads multiple context files at spawn**
- Files: `.claude/agents/*.md`, `.claude/rules/orchestrator.md`
- Observation: Each dev agent reads `brief.md`, `design-spec.md`, all ADRs in `pipeline/adr/`, and `pipeline/context.md`. Reviewers read the PR plus the prior reviewer's file. This is necessary — subagents don't share memory — but the token cost scales with design-spec size and ADR count.
- Impact: For a typical feature (~500-line design-spec, 2 ADRs), each dev loads ~2-5k tokens of context before doing any work. Three devs × Stage 4 + three reviewers × Stage 5 + one Stage 6 dev = ~70-100k tokens of redundant loading per pipeline run.
- Mitigation: README "Known Limitations" acknowledges token cost; `/pipeline-brief` is the documented smaller-footprint alternative.
- Severity: **Informational** (cost, not correctness)

**Finding P10 — `pipeline/context.md` grows across a pipeline run; `/reset` archives it (partial mitigation)**
- Files: `pipeline/context.md`, `.claude/commands/reset.md`
- Prior audit flagged unbounded growth. `/reset` now archives the file with a separator and resets. During a single pipeline run, context.md still only grows — across runs, it resets.
- Residual risk: If a pipeline run has many PM questions or a long fix log, a late-pipeline agent reads a large context.md. Still bounded by a single run's length.
- Severity: **Low** | Confidence: HIGH
- Suggested improvement: None required. Current archive-on-reset behavior is right-sized.

### Cross-Platform Portability

**Finding P11 — `bootstrap.sh` now uses rsync instead of `cp -rn` (resolved)**
- File: `bootstrap.sh:60-63`
- Prior audit flagged macOS/Linux/BusyBox `cp -rn` inconsistency. Current script uses `rsync -a --exclude='*.local.*' --exclude='settings.local.json'`. Preflight validates rsync is installed.
- Severity: Resolved.

**Finding P12 — `bootstrap.sh` preflight checks for `node`, `git`, `rsync`, and warns on missing `claude`**
- File: `bootstrap.sh:35-38`
- Observation: Clear failure messages with install hints. `claude` is a warning, not an error (bootstrap can run without Claude Code installed).
- Severity: ✅ positive pattern

**Finding P13 — CI matrix covers Node 20 and 22 on Ubuntu only**
- File: `.github/workflows/test.yml:12-14`
- Observation: macOS and Windows runners not exercised. `bash bootstrap.sh` is bash-dependent, and rsync flag behavior can differ on BSD rsync (macOS ships rsync 2.6.9 by default).
- Realistic risk: Low. The `rsync -a --exclude` flags used are portable to BSD rsync. But nobody runs the test suite on macOS in CI, so "works on macOS" is verified by contributor goodwill, not automation.
- Severity: **Low** | Confidence: MEDIUM
- Suggested fix: Add `macos-latest` to the CI matrix. Single-line `os: [ubuntu-latest, macos-latest]` plus `runs-on: ${{ matrix.os }}` change.

### Observability

**Finding P14 — Gate files provide structured, queryable pipeline state**
- Files: `pipeline/gates/*.json`, `.claude/commands/status.md`, `.claude/commands/pipeline-context.md`
- Observation: Every stage writes a JSON gate with timestamp, agent, status, blockers, warnings. The `/status` dashboard and `/pipeline-context` dump read these. This is the right shape for observability — machine-readable, diffable, and reviewable.
- Severity: ✅ positive pattern

**Finding P15 — Dev-agent lint output captured to `pipeline/lint-output.txt` (resolved)**
- Files: `.claude/agents/dev-*.md`
- Prior audit flagged `|| true` silently dropping lint output. Now `tee -a pipeline/lint-output.txt` captures output even though the exit code is still masked.
- Severity: Resolved.

**Finding P16 — Test output not automatically persisted into pipeline state**
- Observation: `npm test` output goes to stdout/stderr. Stage 6 writes `pipeline/test-report.md` (narrative), but raw test output is not captured as a pipeline artifact.
- Impact: A test retry on the same failure has to re-run to see the failure detail. Low impact given tests are cheap; noted for completeness.
- Severity: **Informational**

### Resource Lifecycle

**Finding P17 — `build-presentation.js` renders 27 icons sequentially**
- File: `docs/build-presentation.js:34-44` (icon helpers), various call sites
- Observation: Each icon = React SSR + sharp PNG. Sequential `await` in the order they're composed. Run manually, once. Several seconds wall time.
- Impact: Not in any hot path; irrelevant to framework performance.
- Severity: ✅ no action (acknowledged outlier)

**Finding P18 — No memory leaks observed**
- The three JS files are short-lived processes; no long-running listeners, no timers without cleanup, no event-emitter subscriptions.
- Severity: ✅ clean

---

## Summary

| # | Finding | Impact | Confidence | Status |
|---|---|---|---|---|
| P1 | gate-validator scans full dir | Low | HIGH | Clean |
| P2 | Hook fires on Stop + SubagentStop | Info | HIGH | By design |
| P3 | Orphaned worktree cleanup | ✅ | HIGH | Resolved |
| P4 | Stage duration guidance | ✅ | HIGH | Resolved |
| P5 | No programmatic stage timeout | Low | MEDIUM | Docs-only mitigation |
| P6 | Retry-limit-3 + escalate | ✅ | HIGH | Positive pattern |
| P7 | Stage-5 parallel / sequential | ✅ | HIGH | Positive pattern |
| P8 | Stage-5 gate append-merge | ✅ | HIGH | Positive; future risk if truly parallel |
| P9 | Per-agent context re-load | Info | HIGH | Documented cost |
| P10 | context.md grows within run | Low | HIGH | Archive-on-reset mitigates |
| P11 | bootstrap rsync portability | ✅ | HIGH | Resolved |
| P12 | bootstrap preflight checks | ✅ | HIGH | Positive pattern |
| P13 | CI matrix Ubuntu-only | Low | MEDIUM | Open — add macos-latest |
| P14 | Gate files structured | ✅ | HIGH | Positive pattern |
| P15 | Dev-agent lint output captured | ✅ | HIGH | Resolved |
| P16 | Test output not persisted | Info | LOW | Acceptable |
| P17 | 27 icons rendered serially | ✅ | HIGH | Acceptable outlier |
| P18 | No memory leaks | ✅ | HIGH | Clean |

**Posture**: Reliability patterns are strong — deterministic gates, structured escalation, explicit retry budget, orphaned-worktree cleanup, append-only Stage-5 gate merges. Eight of the prior audit's 14 findings are resolved by the April 2026 health check. The remaining open item of substance is the Ubuntu-only CI matrix (P13); everything else is either informational or has documented mitigations. No critical performance concerns for a framework whose primary cost centers are agent-loading token spend and wall-clock pipeline duration — both bounded by Claude Code's own behavior, not by framework code.
