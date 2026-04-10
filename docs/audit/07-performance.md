# Performance & Reliability

## Context

This is a configuration-as-code framework. "Performance" here means:
1. How efficiently the gate-validator hook runs (called after every subagent stop)
2. How reliably the bootstrap script works across environments
3. How the framework's design affects token consumption and pipeline execution time
4. How gracefully the system degrades when things go wrong

---

## 1. Resource Lifecycle

**Finding P1: gate-validator.js reads the entire gates directory on every invocation**
- File: `.claude/hooks/gate-validator.js:22-29`
- Impact: **Low** | Confidence: **HIGH**
- The validator does `fs.readdirSync` + `fs.statSync` on every file, sorts by mtime, then reads only the latest. For a typical pipeline run (8-12 gate files), this is negligible.
- At scale: Even 50+ gate files (multiple retries, re-runs) would take <1ms. Not a concern.
- No fix needed.

**Finding P2: build-presentation.js renders all icons eagerly**
- File: `docs/build-presentation.js:67-96`
- Impact: **Low** | Confidence: **HIGH**
- All 27 icon variants are rendered to PNG at startup (`await icon(...)` in sequence). Each involves React SSR + sharp PNG conversion. This takes several seconds.
- However, this script runs once manually, not in any hot path. Not a concern.
- Suggested improvement: Minor — could use `Promise.all()` to render icons in parallel, but not worth changing for a one-shot script.

## 2. Concurrency

**Finding P3: Stage 4 parallel builds depend on git worktree availability**
- File: `.claude/rules/pipeline.md:54-62`
- Impact: **Medium** | Confidence: **HIGH**
- Three dev agents build in parallel using git worktrees. If a previous pipeline run left orphaned worktrees (e.g., crash, ctrl-c), the next run will fail to create worktrees at the same paths.
- The `/reset` command archives pipeline artifacts but does not clean up worktrees.
- Suggested fix: Add worktree cleanup to `/reset` command: `git worktree list` and `git worktree remove` for any dev-team-* worktrees. Or add a preflight check to the `/pipeline` command.

**Finding P4: Stage 5 review has both parallel (Agent Teams) and sequential fallback paths**
- File: `.claude/rules/pipeline.md:68-90`
- Impact: **Informational** | Confidence: **HIGH**
- The pipeline supports Agent Teams for parallel reviews, falling back to sequential if the experimental feature fails. This is well-designed — the sequential fallback reads other reviewers' output files to avoid duplicate comments.
- No fix needed — good reliability pattern.

## 3. Error Handling Quality

**Finding P5: gate-validator.js exits with distinct codes — excellent pattern**
- File: `.claude/hooks/gate-validator.js:59-89`
- Impact: **Positive** | Confidence: **HIGH**
- Exit codes 0/1/2/3 map to PASS/ERROR/FAIL/ESCALATE. The orchestrator can make deterministic decisions. This is one of the best-designed aspects of the framework.

**Finding P6: No graceful handling if `pipeline/gates/` has non-JSON files**
- File: `.claude/hooks/gate-validator.js:22-23`
- Impact: **Low** | Confidence: **MEDIUM**
- The filter `f.endsWith(".json")` handles this correctly — non-JSON files are ignored. ✅
- However, a `.json` file that is empty (0 bytes) would cause a JSON parse error caught by the try/catch — appropriate behavior.

**Finding P7: bootstrap.sh uses `cp -rn` which behaves differently on Linux vs macOS**
- File: `bootstrap.sh:61`
- Impact: **Medium** | Confidence: **HIGH**
- `cp -rn` (no-clobber recursive copy) works on macOS but on some Linux distributions, the `-n` flag for `cp` is `--no-clobber`. GNU coreutils supports both, but BusyBox does not support `-n`.
- The script has `#!/usr/bin/env bash` and `set -e`, which is good.
- Suggested fix: Either document "requires GNU coreutils" or use `rsync --ignore-existing` for better portability.

## 4. Timeout Discipline

**Finding P8: No timeout on pipeline stages**
- Impact: **Medium** | Confidence: **MEDIUM**
- Individual agent invocations have no timeout defined in the framework. If an agent enters an infinite loop or gets stuck on a large codebase, the pipeline hangs indefinitely.
- Claude Code itself has conversation-level timeouts, but the framework doesn't add stage-level time limits.
- Suggested fix: Document expected durations per stage. Consider adding a soft timeout warning to the orchestrator instructions (e.g., "if a stage hasn't completed in 10 minutes, check progress").

## 5. Scaling Concerns

**Finding P9: Token cost scales with codebase size and pipeline complexity**
- Impact: **Medium** | Confidence: **HIGH**
- The README acknowledges this: "Token costs scale quickly." The mitigation is `/pipeline-brief` before full runs and `/audit-quick` before full audits.
- Each pipeline stage invokes agents with full context loading (brief, design-spec, ADRs, context.md). For large projects, this repeated context loading adds significant token overhead.
- Suggested improvement: The compaction rules (`.claude/rules/compaction.md`) are well-designed for managing context within a conversation. No additional fix needed — the existing mitigation is appropriate.

**Finding P10: `pipeline/context.md` is append-only with no size management**
- File: `pipeline/context.md`
- Impact: **Low** | Confidence: **MEDIUM**
- Context.md grows across the pipeline run. For a complex feature with many questions, answers, and fix logs, it could become large. All agents read it at spawn.
- The `/reset` command preserves context.md with a separator, so it accumulates across runs.
- Suggested fix: The `/reset` command could archive context.md entries from the completed run instead of keeping everything.

## 6. Observability

**Finding P11: Gate files provide excellent pipeline observability** ✅
- Impact: **Positive** | Confidence: **HIGH**
- Every stage writes a structured JSON gate with timestamp, agent, status, blockers, and warnings. The `/status` and `/pipeline-status` commands read these for dashboards. This is a well-designed observability pattern.

**Finding P12: No logging from gate-validator.js beyond console output**
- Impact: **Low** | Confidence: **MEDIUM**
- The validator writes to stdout/stderr only. In a long pipeline run, this output may be lost to context compaction.
- The gate *files* persist on disk, so the data is not lost — only the validator's formatted summary.
- No fix needed — the files are the source of truth.

## 7. Graceful Degradation

**Finding P13: Escalation protocol handles degradation well** ✅
- Impact: **Positive** | Confidence: **HIGH**
- The ESCALATE status with structured decision-needed format is an excellent degradation pattern. Instead of failing silently or retrying forever, the system halts and asks the human.

**Finding P14: Retry limit of 3 with escalation prevents infinite loops** ✅
- File: `.claude/rules/gates.md` retry protocol
- Impact: **Positive** | Confidence: **HIGH**
- Same failure twice = auto-escalate. This prevents retry storms.

---

## Summary

| # | Finding | Impact | Confidence |
|---|---|---|---|
| P1 | Gate validator reads full directory | Low | HIGH |
| P2 | Icons rendered eagerly in presentation | Low | HIGH |
| P3 | Orphaned worktrees not cleaned up | Medium | HIGH |
| P4 | Parallel/sequential fallback for reviews | ✅ Good | HIGH |
| P5 | Distinct exit codes for gate status | ✅ Good | HIGH |
| P6 | Non-JSON files handled correctly | ✅ Good | MEDIUM |
| P7 | `cp -rn` portability across Linux/macOS | Medium | HIGH |
| P8 | No stage-level timeouts | Medium | MEDIUM |
| P9 | Token cost scales with project size | Medium | HIGH |
| P10 | context.md grows unbounded across runs | Low | MEDIUM |
| P11 | Gate files provide observability | ✅ Good | HIGH |
| P12 | No persistent logging from validator | Low | MEDIUM |
| P13 | Escalation protocol for degradation | ✅ Good | HIGH |
| P14 | Retry limit prevents infinite loops | ✅ Good | HIGH |

The framework has strong reliability patterns (deterministic gates, structured escalation, retry limits) but has gaps in worktree cleanup and cross-platform portability.
