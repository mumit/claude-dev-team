# 01 — Architecture Map

## Component inventory

### 1. Orchestrator layer — root markdown

| File | Purpose | Entry / reader |
|---|---|---|
| `CLAUDE.md` | Target project's per-project instructions slot (nearly empty in this repo) | Loaded by Claude Code at session start |
| `AGENTS.md` | Cross-tool agent summary (Claude Code / Cursor / Copilot) | Read by multi-tool agents |
| `README.md`, `EXAMPLE.md`, `CONTRIBUTING.md` | Human docs (not loaded at runtime) | Users |
| `.claude/rules/orchestrator.md` | The actual orchestrator rules routed to the main session | Claude Code session |
| `.claude/rules/pipeline.md` | 8-stage pipeline definition + duration expectations | Main session + `/pipeline`, `/hotfix`, `/resume`, `/stage` |
| `.claude/rules/gates.md` | JSON gate schema | Every agent + `gate-validator.js` |
| `.claude/rules/escalation.md` | Escalation protocol | Main session + agents |
| `.claude/rules/compaction.md` | Context preservation guidance | Claude Code on compact |

### 2. Agents (`.claude/agents/`)

Five YAML-frontmatter-first markdown definitions. Frontmatter keys: `name`, `description`, `tools`, `model`, `permissionMode`, `skills?`, `hooks?`, `mcpServers?` (optional).

| Agent | Model | Tools | Scope | Skills loaded |
|---|---|---|---|---|
| `pm` | opus | Read, Write, Glob | `pipeline/` only | — |
| `principal` | opus | Read, Write, Glob, Grep, Bash | Read + ADRs | `security-checklist`, `api-conventions` |
| `dev-backend` | sonnet | Read, Write, Edit, Glob, Grep, Bash | `src/backend/` | `code-conventions`, `api-conventions`, `security-checklist`, `review-rubric` |
| `dev-frontend` | sonnet | Read, Write, Edit, Glob, Grep, Bash | `src/frontend/` | `code-conventions`, `security-checklist`, `review-rubric` |
| `dev-platform` | sonnet | Read, Write, Edit, Glob, Grep, Bash | `src/infra/` + tests + deploy | `code-conventions`, `security-checklist`, `review-rubric` |

All three devs share an identical `PostToolUse` hook that pipes `npm run lint` output to `pipeline/lint-output.txt`.

### 3. Commands (`.claude/commands/`) — 18 slash commands

- **Pipeline**: `pipeline.md`, `pipeline-brief.md`, `design.md`, `pipeline-review.md`, `pipeline-context.md`, `status.md`, `stage.md`, `resume.md`, `reset.md`
- **Audit / quality**: `audit.md`, `audit-quick.md`, `health-check.md`, `roadmap.md`, `review.md`
- **Governance**: `adr.md`, `principal-ruling.md`, `ask-pm.md`
- **Urgent path**: `hotfix.md`

Commands are thin — they mostly instruct the main session which rules file, agents, and gate files to read/write in what order.

### 4. Skills (`.claude/skills/`) — 6 skills, each a folder with `SKILL.md`

| Skill | Frontmatter | Role |
|---|---|---|
| `implement/SKILL.md` | name + description | Plan → Execute → Verify → Commit for focused changes |
| `pre-pr-review/SKILL.md` | name + description | Pre-merge review for non-pipeline work |
| `code-conventions/SKILL.md` | no frontmatter | Passive rules loaded by dev agents |
| `api-conventions/SKILL.md` | no frontmatter | REST conventions for backend |
| `security-checklist/SKILL.md` | no frontmatter | Security review checklist |
| `review-rubric/SKILL.md` | no frontmatter | Stage-5 peer-review rubric |

The split is intentional: `implement` + `pre-pr-review` are user-invocable (have frontmatter so Claude Code lists them); the other four are context-loaded by agents via `skills:` frontmatter.

### 5. Gate validator — `.claude/hooks/gate-validator.js` (90 lines)

- Reads the most-recently-modified `*.json` under `pipeline/gates/`.
- Validates `["stage", "status", "agent", "timestamp", "blockers", "warnings"]` are present.
- Exits `0` on PASS, `2` on FAIL, `3` on ESCALATE, `1` on malformed input.
- Wired to both `Stop` and `SubagentStop` hooks in `.claude/settings.json`.

### 6. Tests (`tests/`) — 4 files, 98 subtests total

| File | Target | Notes |
|---|---|---|
| `gate-validator.test.js` | `gate-validator.js` | 13 subtests, uses tmpdirs, covers all status codes + error cases |
| `bootstrap.test.js` | `bootstrap.sh` | 17 subtests, shells out to bash; needs `rsync` on PATH |
| `frontmatter.test.js` | `.claude/agents/*.md`, `.claude/skills/*/SKILL.md` | Parses YAML frontmatter, validates required keys, enforces `name` matches filename |
| `smoke-presentation.test.js` | `docs/build-presentation.js` | 1 subtest: `node --check` syntax only |

### 7. Bootstrap — `bootstrap.sh` (168 lines)

- Preflight for Node, git, rsync, claude (claude is a soft warn).
- `rsync --exclude='settings.local.json' --exclude='*.local.*'` copies `.claude/` into target.
- Creates `CLAUDE.md` only if missing; always overwrites `AGENTS.md`.
- Creates `pipeline/`, `src/{backend,frontend,infra}`, and appends gitignore entries.

### 8. Presentation builder — `docs/build-presentation.js` (686 lines)

- Generates an 18-slide `.pptx` marketing deck via `pptxgenjs`.
- Renders `react-icons` components through `react-dom/server` → `sharp` → PNG data URIs.
- Module-level palette/font constants + per-slide functions orchestrated by `build()`.
- Runs standalone via `node docs/build-presentation.js`; no npm script.

### 9. CI — `.github/workflows/test.yml`

- Triggers: `push` and `pull_request` to `main`.
- Matrix: Node 20 and 22 on ubuntu-latest.
- Steps: checkout → setup-node → `apt-get install rsync` → `npm install` → `npm run lint` → `npm test`.

### 10. Audit / documentation output (`docs/`)

- `docs/lifecycle.md`, `docs/faq.md` — prose docs.
- `docs/build-presentation.js` — the deck generator above.
- `docs/audit/` — this audit's output directory. Contains `status.json` plus 11 phase files (this one included).

## Dependency graph

```
CLAUDE.md ─────────────┐
                       ▼
.claude/rules/orchestrator.md
   ├── pipeline.md ───────────► consumed by commands + main session
   ├── gates.md ──────────────► consumed by every agent + gate-validator.js
   ├── escalation.md ─────────► consumed by main session + agents
   └── compaction.md ─────────► consumed on /compact

.claude/settings.json
   ├── hooks.Stop / SubagentStop ──► .claude/hooks/gate-validator.js ──► pipeline/gates/*.json
   └── env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS

.claude/agents/*.md
   ├── skills: ─────► .claude/skills/*/SKILL.md (context-loaded)
   └── hooks.PostToolUse ─► `npm run lint` ─► pipeline/lint-output.txt

.claude/commands/*.md ──► reads rules + invokes agents + writes gate/brief/spec/pr files

bootstrap.sh ──► rsync .claude/ + copy root md files + mkdir pipeline/ + src/ + patch .gitignore

tests/*.test.js
   ├── gate-validator.test.js ─► .claude/hooks/gate-validator.js
   ├── bootstrap.test.js      ─► bootstrap.sh (via execFileSync)
   ├── frontmatter.test.js    ─► .claude/agents/*.md + .claude/skills/*/SKILL.md
   └── smoke-presentation.test.js ─► docs/build-presentation.js (node --check)

docs/build-presentation.js
   └── pptxgenjs + react + react-dom/server + react-icons + sharp
```

**Circular dependencies**: none.

**High fan-in components** (many things read them):
- `.claude/rules/gates.md` — spec referenced by every agent that writes a gate, plus the validator tests.
- `.claude/rules/pipeline.md` — read by every pipeline-adjacent command and agent.
- `.claude/skills/security-checklist/SKILL.md` — loaded by all 3 dev agents + principal + `pre-pr-review`.
- `.claude/skills/code-conventions/SKILL.md` — loaded by all 3 dev agents + `pre-pr-review`.
- `pipeline/context.md` — append-only shared memory across agents.

**High-coupling cluster**: the three `dev-*.md` agents share almost identical `PostToolUse` hook strings. Copy-paste coupling — see `03-compliance.md`.

## External integrations

| Integration | Type | Users | Abstraction |
|---|---|---|---|
| Claude Code CLI | Host runtime | All markdown + hooks | Direct (this IS Claude Code config) |
| Node.js ≥20 | Runtime | gate-validator, tests, build-presentation | Direct, built-ins only except in build-presentation |
| `rsync` | System binary | `bootstrap.sh` + its tests | Direct, hard prerequisite |
| `git` | VCS | `bootstrap.sh`, dev agents (worktrees), `pre-pr-review` skill | Direct shell-outs |
| `docker compose` | Deploy | `dev-platform` agent's deploy task | Direct shell-outs documented in agent prompt |
| `npm` | Package manager | CI + lint hook | Direct |
| ESLint 9 + `@eslint/js` + `globals` | Linter | `npm run lint` | Direct |
| `pptxgenjs` | PPTX builder | `docs/build-presentation.js` | Direct |
| `react` + `react-dom` + `react-icons` | SSR icons | `docs/build-presentation.js` | Direct |
| `sharp` | PNG rasteriser | `docs/build-presentation.js` | Direct |
| GitHub Actions | CI host | `.github/workflows/test.yml` | Direct |
| MCP servers (GitHub, Slack, Jira) | Optional | Agent frontmatter examples | Documented only; nothing wired up |

## Primary data flow — `/pipeline`

```
User: /pipeline <feature>
  │
  ├── Stage 1 — Requirements
  │     pm → pipeline/brief.md + gates/stage-01.json
  │     ✋ Checkpoint A
  │
  ├── Stage 2 — Design
  │     principal (draft) → pipeline/design-spec.md (DRAFT)
  │     dev-backend + dev-frontend + dev-platform (parallel, read-only)
  │        → pipeline/design-review-notes.md
  │     principal (chair) → updates spec, writes pipeline/adr/NNNN-*.md,
  │                          appends to pipeline/adr/index.md,
  │                          sets gates/stage-02.json arch_approved=true
  │     pm (scope-fit) → sets pm_approved=true
  │     ✋ Checkpoint B
  │
  ├── Stage 3 — Clarification
  │     If QUESTION: lines in pipeline/context.md lack PM-ANSWER, invoke pm.
  │
  ├── Stage 4 — Build (parallel worktrees)
  │     dev-backend  → src/backend/  → pr-backend.md  + stage-04-backend.json
  │     dev-frontend → src/frontend/ → pr-frontend.md + stage-04-frontend.json
  │     dev-platform → src/infra/    → pr-platform.md + stage-04-platform.json
  │
  ├── Stage 5 — Peer review (each dev reviews the other two)
  │     gate per area accumulates 2 approvals before PASS
  │
  ├── Stage 6 — Test
  │     dev-platform runs full suite → pipeline/test-report.md
  │                                   + gates/stage-06.json
  │     ✋ Checkpoint C
  │
  ├── Stage 7 — PM sign-off
  │     pm compares test-report to brief → gates/stage-07.json.pm_signoff
  │
  └── Stage 8 — Deploy
        dev-platform (docker compose up --wait + smoke tests)
          → pipeline/deploy-log.md + gates/stage-08.json
        pm writes stakeholder summary
```

## Secondary data flow — `/audit`

```
User: /audit [scope]
  │
  ├── Phase 0  → docs/audit/{00-project-context, 01-architecture, 02-git-history}.md
  │             ✋ Checkpoint A
  ├── Phase 1  → docs/audit/{03-compliance, 04-tests, 05-documentation}.md
  │             ✋ Checkpoint B
  ├── Phase 2  → docs/audit/{06-security, 07-performance, 08-code-quality}.md
  │             ✋ Checkpoint C
  └── Phase 3  → docs/audit/{09-backlog, 10-roadmap}.md
                 status.json updated at each phase for --resume.
```

## Tertiary data flow — `implement` skill

```
User: "implement <item>"
  │
  ├── Reads docs/audit/00, 01, 10 + pipeline/context.md + CLAUDE.md
  ├── Step 1 Plan     → presents plan; waits for user
  ├── Step 2 Execute  → edits + lints; stops if plan is wrong
  ├── Step 3 Verify   → full test + lint + cross-check anti-patterns
  └── Step 4 Commit   → atomic commit after user approves message
```

## Configuration surface

| Config | Location | Purpose |
|---|---|---|
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | `.claude/settings.json` `env` | Enable Agent Teams (parallel reviewers in Stage 5) |
| `permissions.allow` | `.claude/settings.json` | `Bash(npm run *)`, `Bash(docker compose *)`, `Bash(git *)`, `Write(src/**)`, `Write(pipeline/**)`, etc. |
| `permissions.deny` | `.claude/settings.json` | `git push --force *`, `rm -rf *`, `git push origin main *` |
| `hooks.Stop` + `hooks.SubagentStop` | `.claude/settings.json` | Both run `node .claude/hooks/gate-validator.js` |
| Per-agent model + tools + skills + hooks | `.claude/agents/*.md` frontmatter | Scoped per role |
| Eslint config | `eslint.config.js` | Ignores `node_modules/`, uses `js.configs.recommended`, CJS sourceType |

**Env vars**: only `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`. No secrets in the repo.
**Feature flags**: only the experimental Agent Teams flag.
**Secrets**: none.

## What's working well

1. **Deterministic gates.** JSON files + a small Node hook that exits with a status code. No natural-language gate parsing. `gate-validator.test.js` exercises every code path, including the "pick newest mtime" behaviour.
2. **Role-scoped permissions.** PM can't write code, devs can't touch each other's directories, Principal has read-only Bash. The boundary is enforced by both frontmatter `tools` and `permissions.allow`.
3. **Append-only shared memory.** `pipeline/context.md` as the multi-agent scratchpad avoids write conflicts across parallel workers.
4. **Stage-5 approval merge strategy** is explicit in `pipeline.md` (read-then-append, never overwrite) — codifies a race condition that would otherwise appear in parallel review.
5. **Bootstrap is idempotent and safe.** Re-running it preserves `CLAUDE.md`, `pipeline/context.md`, `*.local.*` files, and user `src/`. Covered by integration tests.
6. **Documentation trio is coherent.** `README.md` (quickstart), `docs/lifecycle.md` (walkthrough), `docs/faq.md` (evaluator-oriented). Each has a distinct audience.
7. **Frontmatter is machine-validated.** `tests/frontmatter.test.js` enforces the agent schema, so a future contributor who adds an agent without required fields will fail CI.
8. **CI is minimal but real.** Node 20 + 22 matrix, lint and test both wired up, reproducible via `npm ci`.
