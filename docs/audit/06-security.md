# Security Review

## Context

This is a configuration-as-code framework, not a web application. It has no endpoints, no database, no user authentication. The security surface is:
1. **Shell script** (`bootstrap.sh`) that modifies the filesystem
2. **Node.js hook** (`gate-validator.js`) that reads/parses JSON files
3. **Agent definitions** that instruct Claude Code agents on what they can/can't do
4. **Settings** that control permissions and hooks

Traditional web security concerns (SQL injection, XSS, CSRF) do not apply to this repo directly — they apply to *target projects* and are covered by the security checklist skill.

---

## 1. Secrets Hygiene

**No secrets found in the codebase.** ✅

- No API keys, tokens, or passwords in any file
- No `.env` files committed
- The security checklist skill correctly instructs agents to use env vars for secrets
- `bootstrap.sh` adds `.env` to target project's `.gitignore`

**Finding S1: No `.gitignore` in the framework repo itself**
- Severity: **Medium** | Confidence: **HIGH**
- While no secrets exist today, there's no `.gitignore` to prevent accidental commits of `.env`, `node_modules/`, or generated `.pptx` files
- The bootstrap script adds `.gitignore` entries to *target* projects but not to this repo
- Suggested fix: Add a `.gitignore` with: `.env`, `node_modules/`, `*.pptx`, `docs/audit/`, `pipeline/gates/`, `pipeline/adr/`, `pipeline/code-review/`

## 2. Input Handling

**Finding S2: gate-validator.js trusts gate file content without sanitization**
- File: `.claude/hooks/gate-validator.js:39-43`
- Severity: **Low** | Confidence: **MEDIUM**
- The validator reads JSON from `pipeline/gates/`, parses it, and uses string values in `console.log` output. If a gate file contained malicious content (e.g., ANSI escape sequences), it could affect terminal output.
- Realistic risk: Very low — gate files are written by Claude Code agents, not external users. This is an internal trust boundary.
- Suggested fix: No action needed. The trust model (Claude agents write, validator reads) is appropriate.

**Finding S3: bootstrap.sh does not validate `$TARGET` path**
- File: `bootstrap.sh:20`
- Severity: **Low** | Confidence: **MEDIUM**
- `TARGET="${1:-$(pwd)}"` is used in `cp` and `mkdir` operations without validation. A path containing spaces or special characters could cause unexpected behavior.
- The script does quote `$TARGET` in most uses, which is good.
- Realistic risk: Low — the user is running this manually on their own system.
- Suggested fix: Add basic validation: `[ -d "$TARGET" ] || { echo "Target directory does not exist"; exit 1; }`

## 3. Auth & Authz

**Finding S4: Permission model relies on Claude Code's enforcement, not the framework's**
- Severity: **Informational** | Confidence: **HIGH**
- Agent file permissions (e.g., "dev-backend can only write to `src/backend/`") are stated in agent markdown frontmatter. Claude Code is trusted to enforce these boundaries. The framework has no independent enforcement mechanism.
- This is by design — the framework is a configuration layer for Claude Code. But users should understand that the permissions are only as strong as Claude Code's enforcement.
- No fix needed — document this in the trust model section of README (already partially covered under "Known Limitations").

**Finding S5: settings.json permission allowlist is broad**
- File: `.claude/settings.json:7-31`
- Severity: **Low** | Confidence: **HIGH**
- `Bash(curl *)` allows arbitrary HTTP requests. This is needed for smoke tests in the deploy stage, but could be used for data exfiltration if an agent were compromised or hallucinated a harmful command.
- `Bash(git checkout *)` allows checking out any branch, which could discard working changes.
- `Write(src/**)` allows any agent to write anywhere in `src/`, even though agent-level permissions are narrower.
- Assessment: The project-level permissions are the outer boundary; agent frontmatter provides the inner boundary. This layered approach is reasonable but the outer layer is quite permissive.
- Suggested fix: Consider tightening `Write(src/**)` to `Write(src/backend/**)`, `Write(src/frontend/**)`, `Write(src/infra/**)` separately, though this may not be supported by Claude Code's permission model.

## 4. Dependency Vulnerabilities

**Finding S6: No dependency management for build-presentation.js**
- File: `docs/build-presentation.js:1-5`
- Severity: **Medium** | Confidence: **HIGH**
- The script requires `pptxgenjs`, `react`, `react-dom`, `sharp`, `react-icons` with no version pinning. Users install these ad-hoc via `npm install`. Without a `package.json` and lockfile, there's no way to audit for CVEs or pin known-good versions.
- `sharp` in particular has native bindings and a history of vulnerabilities.
- Suggested fix: Add a `package.json` with pinned dependencies and a `package-lock.json`.

**Finding S7: gate-validator.js uses only Node.js builtins — no dependency risk** ✅
- The hook uses only `fs` and `path`. No external dependencies. This is excellent for a security-critical component.

## 5. Data Exposure

**No PII or sensitive data patterns found.** ✅

- Pipeline artifacts (`brief.md`, `design-spec.md`, etc.) may contain business logic descriptions but no credentials
- The framework instructs agents not to include secrets in code or responses
- Gate files contain only status metadata

## 6. Cryptography

**Not applicable.** The framework doesn't perform any cryptographic operations. The security checklist skill covers crypto concerns for target projects.

---

## Summary

| # | Finding | Severity | Confidence |
|---|---|---|---|
| S1 | No `.gitignore` in framework repo | Medium | HIGH |
| S2 | Gate validator trusts file content | Low | MEDIUM |
| S3 | bootstrap.sh doesn't validate target path | Low | MEDIUM |
| S4 | Permissions rely on Claude Code enforcement | Info | HIGH |
| S5 | Settings.json allowlist is broad | Low | HIGH |
| S6 | No dependency management for presentation script | Medium | HIGH |
| S7 | Gate validator has zero external deps | ✅ Good | HIGH |

**No critical or high severity findings.** The framework's security posture is appropriate for its role as a configuration layer. The two medium findings (missing `.gitignore` and unmanaged deps) are straightforward to fix.
