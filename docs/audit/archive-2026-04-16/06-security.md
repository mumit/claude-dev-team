# 06 — Security Review

## Threat Model

This is a configuration-as-code framework, not a web application. There is no server, no database, no user authentication, and no network endpoints exposed from this repo. The attack surface is:

1. **`bootstrap.sh`** — writes to the filesystem of a target project (including a target owned by a different user if run with elevated privileges).
2. **`.claude/hooks/gate-validator.js`** — reads and parses JSON files from `pipeline/gates/`; runs on every subagent stop.
3. **Agent / command / skill prompts** — text that Claude Code executes as instructions. Malicious content here becomes *prompt injection* into an agent's context.
4. **`.claude/settings.json` permission allowlist** — controls what bash commands and write paths a Claude Code session can perform without prompting.
5. **`docs/build-presentation.js`** — standalone Node.js tool that loads four native-binding devDependencies (`sharp`, `pptxgenjs`, `react`, `react-dom`).

OWASP top-10 categories (injection, XSS, CSRF, auth) map onto *target projects*, not this repo. Those concerns are documented in `.claude/skills/security-checklist/SKILL.md`, which is propagated into target projects by bootstrap.

Two trust boundaries matter for this repo itself:
- **Framework ↔ Target project**: `bootstrap.sh` crosses this boundary. It writes files into a directory the user nominates.
- **Orchestrator ↔ Subagent**: each agent writes gate files; the orchestrator reads them. Gate-validator.js mediates.

---

## Findings

### Secrets & Data Exposure

**Finding S1 — No secrets in tree (verified)**
- Searched for token/key/password patterns across tracked files. None found.
- `.gitignore` covers `.env`, `.env.local`, `.claude/settings.local.json`, `CLAUDE.local.md`.
- CI workflow uses no secrets.
- Severity: ✅ clean

**Finding S2 — `.gitignore` present and comprehensive (resolved)**
- Prior audit flagged the absence of `.gitignore`. Now present at repo root; covers `node_modules/`, `.env*`, `*.pptx`, pipeline runtime artifacts, local overrides.
- Severity: Resolved.

**Finding S3 — `pipeline/context.md` and `brief.md` may leak sensitive business context if the repo is ever published**
- Observation: `pipeline/context.md` is tracked in `.gitignore` in *target projects* (bootstrap appends it). In *this* repo, `pipeline/context.md` is tracked (by design — it's the seed file used by bootstrap).
- Risk: If a contributor uses this repo itself as a target and runs a real `/pipeline`, they might inadvertently commit a partially-filled context.md with internal details. Low probability but real.
- Severity: **Low** | Confidence: MEDIUM
- Suggested fix: Add a comment header in `pipeline/context.md` saying "This is the framework's seed file; do not commit customer or project-specific data here."

### Input Handling

**Finding S4 — `gate-validator.js` trusts gate file content**
- File: `.claude/hooks/gate-validator.js:39-83`
- Observation: Values from the gate JSON (`gate.escalation_reason`, `gate.options`, `gate.blockers`) are concatenated into `console.log` output without escaping. A gate file containing ANSI escape sequences or control characters could manipulate the terminal display, and a very long string could spam the transcript.
- Realistic risk: Gate files are written by agents in the same trust domain as the orchestrator. An attacker would have to compromise an agent to exploit this — at which point there are much larger problems. This is an *internal* trust boundary.
- Severity: **Low** | Confidence: HIGH
- Suggested fix: Optional hardening — strip non-printable characters from gate fields before printing. Not a blocking concern.

**Finding S5 — `bootstrap.sh` validates preflight, quotes `$TARGET` (resolved)**
- File: `bootstrap.sh:34-40`
- Prior audit flagged unvalidated `$TARGET`. Current script checks `[ -d "$TARGET" ]` and quotes the variable throughout (`"$TARGET/.claude/"`, `"$TARGET/CLAUDE.md"`, etc.).
- Severity: Resolved.

**Finding S6 — `bootstrap.sh` runs rsync with `--exclude='*.local.*'` for user-file preservation**
- File: `bootstrap.sh:60-63`
- Observation: The exclude pattern matches any filename with `.local.` anywhere in it. This is the documented safety mechanism. A file legitimately named `my.local.config.json` in `.claude/` would be preserved across updates — potentially desirable, potentially surprising.
- Risk: None exploitable. The pattern is a preservation heuristic, not a security control.
- Severity: Informational.

### Command & Permission Boundaries

**Finding S7 — `.claude/settings.json` permission allowlist is intentionally broad**
- File: `.claude/settings.json:6-32`
- Observation: Allow list includes `Bash(curl *)`, `Bash(git checkout *)`, `Bash(git worktree *)`, `Write(src/**)`, `Write(pipeline/**)`, `Write(docs/**)`, `Write(.claude/agents/**)`, `Write(.claude/skills/**)`. These are wide surfaces.
- Rationale visible in the repo:
  - `curl *` — needed for Stage 8 smoke tests and health-check fetches.
  - `git checkout *` / `git worktree *` — needed for Stage 4 parallel builds.
  - `Write(.claude/agents|skills/**)` — needed so the framework can be updated from within a Claude session.
- Deny list contains `Bash(git push --force *)`, `Bash(rm -rf *)`, `Bash(git push origin main *)`. These are the right guards.
- Residual risk: An agent that misunderstands or hallucinates instructions could `curl` to an arbitrary URL, `git checkout` away uncommitted work, or rewrite an agent definition without review. This is *by design* — the framework expects Claude Code's own prompt-level safety reviews to catch misuse, with the deny list as a backstop for destructive operations.
- Severity: **Informational** — this is a documented trust model, not a bug.
- Suggested improvement: Document the trust model in `README.md` "Known Limitations" or in `.claude/settings.json` as a leading comment explaining why each allow entry is needed. (README already notes "permissions rely on Claude Code enforcement" — this could be expanded.)

**Finding S8 — `deny` list doesn't cover all force-push forms**
- File: `.claude/settings.json:34-37`
- Observation: `Bash(git push --force *)` and `Bash(git push origin main *)` are denied. Not denied: `git push -f` (short form), `git push --force-with-lease`, `git push origin +HEAD:main` (refspec force), or `git push origin main --force` (flags after positional).
- Realistic risk: Low. An agent following instructions would use the long form. But a prompt-injected or hallucinated short-form push would bypass the deny.
- Severity: **Low** | Confidence: HIGH
- Suggested fix: Add `Bash(git push -f *)` and `Bash(git push *--force-with-lease*)` to the deny list. Consider denying any push to `origin main` irrespective of flags (`Bash(git push * main*)` with a broader pattern) — but this may be overbroad.

### Dependencies

**Finding S9 — `package.json` pins devDependencies; lockfile committed (resolved)**
- Files: `package.json`, `package-lock.json`
- Prior audit flagged unmanaged deps for `build-presentation.js`. Now: seven devDeps pinned to major/minor ranges; `package-lock.json` is committed (reproducible installs). No runtime deps at all.
- Severity: Resolved.

**Finding S10 — `sharp` native binding CVE surface persists**
- Files: `package.json:20`, `package-lock.json`
- Observation: `sharp ^0.33.5` pulls a native image-processing library with history of heap overflows in decoding. The Node version is a devDep used only by `build-presentation.js`, run manually. Not imported by `gate-validator.js` or any runtime code path.
- Realistic risk: Low. `build-presentation.js` only processes static React-rendered SVG strings generated in-process — no user-uploaded images.
- Severity: **Low** | Confidence: HIGH
- Suggested fix: Run `npm audit` in CI (`.github/workflows/test.yml`) to surface future CVEs. Pin `sharp` to minor if the ecosystem churn becomes a concern.

**Finding S11 — `gate-validator.js` uses Node builtins only (clean)**
- File: `.claude/hooks/gate-validator.js`
- No `require()` of anything outside `fs`, `path`. Good for the framework's single highest-leverage runtime component.
- Severity: ✅ clean

### Agent Safety / Prompt Injection Surface

**Finding S12 — `pipeline/context.md` read by every agent at spawn**
- Files: `.claude/rules/orchestrator.md:16`, `.claude/agents/*.md`
- Observation: Every agent reads `pipeline/context.md` as part of its context. This file accumulates PM answers, decisions, and fix-log entries across a run. A malicious or hallucinated entry written to `context.md` is then seen by every subsequent agent — a prompt-injection amplifier.
- Realistic risk: The write path to `context.md` is the orchestrator and dev agents. A user who reviews gate outputs sees context.md drift; but a user who doesn't review sees whatever the earlier agents wrote.
- Severity: **Low-Medium** | Confidence: MEDIUM
- Suggested fix: Consider length-capping context.md append operations and requiring the orchestrator to summarize rather than concatenate. Currently `/reset` archives the file, which is partial mitigation. No immediate fix required.

**Finding S13 — Dev-agent PostToolUse hooks shell out to `npm run lint` unconditionally**
- Files: `.claude/agents/dev-backend.md:21`, `dev-frontend.md:19`, `dev-platform.md:19`
- Observation: Each dev agent, after every Write/Edit, runs `cd $(git rev-parse --show-toplevel) && npm run lint --if-present 2>&1 | tee -a pipeline/lint-output.txt || true`. In a target project, the target's `package.json` controls what `npm run lint` does — the framework inherits whatever script the target defines.
- Realistic risk: The target project is the user's own code; they can already run anything. But this means a malicious target `package.json` *executes* the moment the framework runs. This is a standard npm-script trust model, already accepted by running `npm install` or `npm test`.
- Severity: **Informational** — standard Node.js trust model.
- Suggested improvement: Document this in the bootstrap output / README trust model section: "The framework will run `npm run lint` in your project as part of every dev-agent write. Review that script if installing the framework into an untrusted tree."

### Hook Invocation Safety

**Finding S14 — `gate-validator.js` is invoked on every Stop and SubagentStop**
- File: `.claude/settings.json:39-60`
- Observation: The hook runs unconditionally after every subagent stop. If the hook itself ever throws, the orchestrator sees a hook failure mid-pipeline. The script's error handling is currently minimal (see Finding 3 in 03-compliance.md).
- Severity: **Low** | Confidence: HIGH
- Suggested fix: Wrap the hook body in a top-level try/catch that prints `[gate-validator] internal error: <msg>; treating as PASS` and exits 0 on unexpected errors, so a bug in the validator itself can't wedge an entire pipeline. Trade-off: this would mask validator bugs from reaching CI.

---

## Verified Clean

- No PII or credentials in any tracked file.
- No cryptography performed by framework code.
- No unvalidated deserialization beyond JSON.parse on trusted files.
- No process execution that takes user-controlled argv beyond `bash bootstrap.sh $TARGET` (validated) and `node ./gate-validator.js` (no argv).
- CI workflow (`test.yml`) runs only on `main` pushes and PRs; no write access to the repo from job steps; no secrets referenced.

## Summary

| # | Finding | Severity | Confidence | Status |
|---|---|---|---|---|
| S1 | No secrets in tree | ✅ | HIGH | Clean |
| S2 | .gitignore comprehensive | ✅ | HIGH | Resolved |
| S3 | context.md leak risk if published | Low | MEDIUM | Open |
| S4 | Gate file content unescaped in logs | Low | HIGH | Internal trust; defer |
| S5 | bootstrap.sh path validation | ✅ | HIGH | Resolved |
| S6 | rsync `*.local.*` preservation | Info | HIGH | Documented |
| S7 | settings.json allowlist broad | Info | HIGH | By design |
| S8 | `deny` list has push-flag gaps | Low | HIGH | Open |
| S9 | Deps pinned; lockfile committed | ✅ | HIGH | Resolved |
| S10 | `sharp` native-binding CVE surface | Low | HIGH | Monitor via `npm audit` |
| S11 | gate-validator has zero external deps | ✅ | HIGH | Clean |
| S12 | context.md as prompt-injection amplifier | Low-Med | MEDIUM | Open |
| S13 | Dev hook inherits target's npm scripts | Info | HIGH | Standard npm trust |
| S14 | Hook has no top-level try/catch | Low | HIGH | Open |

**Posture**: No critical or high-severity findings. Six findings resolved since prior audit (secrets, gitignore, path validation, dep management, plus redundant entries on the prior table). The three open Low-severity items (S3, S8, S14) have small, concrete fixes. The two Informational items (S7, S13) are documented trust-model features, not bugs.

The framework's security model is appropriate for its role as a Claude Code configuration layer: narrow runtime surface, no network exposure, pinned deps, and a clear deny-list backstop on destructive git operations.
