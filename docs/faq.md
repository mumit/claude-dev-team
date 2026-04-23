# Claude Dev Team — FAQ

Frequently asked questions from technical teams evaluating the framework.

---

## General

**What is Claude Dev Team?**

A reusable framework that gives Claude Code structure, memory, and guardrails for the full software development lifecycle. It provides commands (deterministic workflows), skills (passive knowledge), and agents (role-scoped AI actors) that work together to audit codebases, implement improvements, review code, build features, and maintain quality over time.

**How is this different from just writing better prompts?**

Prompts are ephemeral — they vanish when the session ends or context compacts. The framework writes all findings, decisions, and progress to persistent files (`docs/audit/`, `pipeline/`). It also enforces checkpoints where Claude stops and waits for human approval, and loads your team's coding conventions automatically through skills. You don't need to remember to paste rules or re-explain your architecture each session.

**What do I need to get started?**

Claude Code CLI (installed and authenticated), a Git repository, and about 10 minutes for initial setup. Run `bootstrap.sh` to install the `.claude/` directory structure into your project. Optionally create a `docs/audit-extensions.md` file for project-specific checks.

**Does this work with any language or framework?**

Yes. The audit workflow is language-agnostic — it discovers your stack, conventions, and patterns by reading the codebase. The extension mechanism (`docs/audit-extensions.md`) lets you add checks specific to your framework (FastAPI, Spring, Next.js, Rails, etc.) without modifying the framework itself.

**Where does this live in my repo?**

The framework installs into `.claude/` at the root of your project — the standard location for Claude Code configuration. Generated audit output goes to `docs/audit/`, feature build artifacts go to `pipeline/`. Both are gitignored by default since they're generated.

---

## Audit Workflow

**How long does a full /audit take?**

Depends on codebase size. For a typical monorepo (20-50K lines), expect 30-60 minutes with human checkpoint pauses. The `/audit-quick` command runs Phases 0-1 only (architecture + health scan) in about 10-15 minutes — useful for quick orientation on a new codebase.

**What if my session times out or I lose connection mid-audit?**

The audit writes a `docs/audit/status.json` file tracking which phases are complete. Run `/audit --resume` and it picks up from the last completed phase. All findings written to `docs/audit/` files are preserved across sessions.

**Can I scope the audit to a specific part of the codebase?**

Yes. Run `/audit src/backend/` or `/audit packages/auth/` to focus on a subdirectory. For monorepos, the command asks whether to audit the whole repo or focus on a subsystem.

**What does a finding actually look like?**

Each finding includes: the violation type, the specific file and line number, the current code pattern, the expected pattern, the rule being violated (referenced by name from CLAUDE.md or conventions), and a confidence rating (HIGH / MEDIUM / LOW). Findings are written to structured markdown files that Claude can read in future sessions.

**How do I customize the audit for my team's conventions?**

Create a `docs/audit-extensions.md` file in your project. It uses a simple format: sections named "After Phase 1", "After Phase 2", "After Phase 3" that describe your platform-specific checks. The `/audit` command loads this file automatically. See `.claude/references/audit-extensions-example.md` for a worked example.

**What's the difference between /audit, /audit-quick, and /health-check?**

`/audit` runs all 4 phases with full analysis. `/audit-quick` runs Phases 0-1 only — good for onboarding or a quick checkup. `/health-check` is a monthly delta scan that compares the current state against the last audit and flags regressions, new violations, stale docs, and dependency changes.

---

## Implementation & Review

**Does Claude just start writing code after the audit?**

No. The `implement` skill follows a strict Plan → Execute → Verify cycle. In the Plan phase, Claude proposes what to change and stops for your approval. Only after you confirm does it make changes. If tests fail during Execute, it stops and reports instead of pushing through.

**Can Claude commit or push code on its own?**

No. Claude never commits or pushes without explicit human approval. The framework's settings.json allows write access to source files but the `implement` skill always stops for review after making changes. You decide when to commit.

**What does /review check?**

It loads the `pre-pr-review` skill which performs: full-file diff analysis (reads complete changed files, not just diffs), convention compliance (loads your coding standards skill), security scanning (loads the security checklist skill), and regression detection (cross-references known violations from prior audits). You can focus it with `/review security` or `/review performance`.

**How is /review different from /pipeline-review?**

`/review` is for non-pipeline work — ad-hoc changes, audit fixes, hotfixes. `/pipeline-review` is Stage 5 of the pipeline workflow, where agents cross-review each other's code as part of a structured feature build.

---

## Pipeline & Agents

**What is the virtual dev team? Is it just a gimmick?**

It's a set of Claude Code agents — each defined in `.claude/agents/` with specific YAML frontmatter that constrains their model, file permissions, and tool access. The team has seven agents: PM, Principal, Backend Dev, Frontend Dev, Platform Dev, QA (`dev-qa`, added v2.3), and Security Engineer (`security-engineer`, added v2.3 with veto power on security diffs). Each agent is scoped to its area — for example, Backend dev can only write to `src/backend/`. This prevents the common problem of AI going off-scope and making changes across the entire codebase.

**Why different models for different roles?**

Opus is used for the PM, Principal, and Security Engineer because all three require broader judgment — requirements writing, architectural decisions, and threat modelling respectively. Sonnet is used for the four developer roles (Backend, Frontend, Platform, QA) because they're doing focused execution work where speed matters more than breadth of reasoning.

**What are gates?**

Every pipeline stage writes a JSON file to `pipeline/gates/` with a status: PASS, FAIL, or ESCALATE. The `gate-validator.js` hook runs automatically after each agent stops and reads these files deterministically — no natural language parsing, no ambiguity. FAIL retries the stage. ESCALATE halts the pipeline for human input.

**What is Stage 5's READ-ONLY reviewer rule?**

During Stage 5 (peer code review), developer agents may write only to their review file (`pipeline/code-review/by-{agent}.md`) and the approval gate — never to source files. If a reviewer finds a bug, they write `REVIEW: CHANGES REQUESTED` and halt; the orchestrator re-invokes the owning dev to fix it in their worktree. Silent inline fixes are prohibited: they bypass the owning dev, skip re-review of the patched lines, and leave no audit trail. A Stage 5 gate that has an approval from a reviewer who modified `src/` during the same invocation is invalid.

**When does security review happen?**

Automatically, at Stage 4.5b, when the diff matches any of these conditions: paths under `src/backend/auth*`, `src/backend/crypto*`, `src/backend/payment*`, `src/backend/pii*`, `src/backend/session*`, or files named `*secret*` / `*token*` / `*credential*`; new or upgraded dependencies; `Dockerfile` or `docker-compose*.yml` changes that add/modify a service image, network, or volume; `src/infra/` changes affecting network topology, IAM, TLS, secrets management, or CI/CD secret handling; new database migrations; new environment variables in `.env.example`. The `security-engineer` agent (Opus) reviews and can issue a veto — a `veto: true` gate halts the pipeline regardless of peer-review approvals. Stage 4.5a (lint + type-check + SCA) always runs before Stage 5.

**Who writes the Stage 5 approval gates? Why can't I edit them directly?**

The `approval-derivation.js` hook (registered in `.claude/settings.json`) writes them. It parses each reviewer's file (`pipeline/code-review/by-{agent}.md`) for `REVIEW: APPROVED` or `REVIEW: CHANGES REQUESTED` markers after every file save, then derives the `approvals` and `changes_requested` arrays in `pipeline/gates/stage-05-{area}.json`. Agents do not write to those arrays directly, and any manual edit to an approvals array is overwritten on the next reviewer file save. This prevents reviewers from approving their own work (the v2.3.1 self-approval fix).

**What is Stage 9 — the Retrospective?**

Stage 9 runs automatically after every deploy (success or failure). All agents — six to seven depending on whether Stage 4.5b fired — each append a section to `pipeline/retrospective.md` covering what worked, what went wrong, where the pipeline slowed them, and one concrete lesson. The `security-engineer` contributes when it participated in the run. The Principal then synthesises and promotes at most two lessons to `pipeline/lessons-learned.md` — a file that survives `/reset`. Every agent reads `lessons-learned.md` at the start of their work in future runs, so the team gets measurably better over time. Run `/retrospective` to trigger Stage 9 standalone on the current pipeline state.

**What is the runbook requirement at Stage 8?**

Before Stage 8 (Deploy) begins, `pipeline/runbook.md` must exist and contain at least `## Rollback` and `## Health signals` sections. If the file is missing, the pipeline ESCALATEs immediately with a pointer to `docs/runbook-template.md`. The deploy is adapter-driven — select your adapter in `.claude/config.yml` under `deploy.adapter` (options: `docker-compose` (default), `kubernetes`, `terraform`, `custom`). Each adapter's instructions live in `.claude/adapters/<adapter>.md`.

**Are there opt-in features I can enable?**

Three features in `.claude/config.yml` are opt-in (off by default):
- **Budget gate** — token + wall-clock budget tracking per run in `pipeline/budget.md`. On exceed: `escalate` halts; `warn` logs and continues.
- **Async-friendly checkpoints** — each of Checkpoints A, B, C can be configured to auto-pass when a precondition holds (`no_warnings` or `all_criteria_passed`). Default: always wait for human.
- **PATTERN review tag** — reviewers can tag things done especially well (`PATTERN: ...`) inside Stage 5 review sections; the Principal harvests these during retro synthesis and can promote them as positive rules to `lessons-learned.md`.

All three leave default behaviour unchanged when the config key is absent.

**What are the four coding principles?**

All build and review agents follow four principles adapted from Karpathy's observations on LLM coding: (1) **Think Before Coding** — record assumptions and surface ambiguities before the first edit; (2) **Simplicity First** — minimum code to satisfy the spec, no speculative features or abstractions; (3) **Surgical Changes** — touch only what the spec requires, note unrelated issues without fixing them; (4) **Goal-Driven Execution** — write a verifiable Plan before coding with a `verify:` check per step tied to an acceptance criterion. Reviewers apply the same rubric and may raise a BLOCKER for violations of any of the four.

**Can I use the pipeline without the agents?**

The pipeline commands invoke agents automatically. If you don't want the full team structure, you can use the audit commands (`/audit`, `/health-check`, `/roadmap`) and skills (`implement`, `pre-pr-review`) independently — they don't depend on the agent system.

**How do I customize the team for my project structure?**

Edit the agent YAML files in `.claude/agents/`. Change file permission scopes (e.g., `src/backend/` → `app/api/`), adjust model assignments, or add MCP server integrations (GitHub, Slack, Jira). The agents are defined in standard Claude Code agent format.

---

## Safety & Trust

**What can Claude do without my approval?**

Claude can read and analyze the codebase, write findings to `docs/audit/` files, generate roadmaps, draft code changes, and run lint/test suites. All of these are reversible and observable.

**What requires my explicit approval?**

Proceeding past any checkpoint (A, B, C in audit; human gates in pipeline), committing or pushing code, approving the implementation plan, accepting roadmap priorities, deploying to any environment, and resolving escalated decisions.

**What if Claude makes a mistake in the audit?**

Every finding includes a confidence rating. LOW confidence findings are flagged as uncertain. The human checkpoint after Phase 2 exists specifically for you to review all findings before the roadmap is built. You can correct, remove, or reprioritize any finding.

**What if the implement skill breaks something?**

The skill runs lint and tests after every change. If tests fail, it stops immediately and reports what happened instead of continuing. It never commits. You can inspect the changes, revert them, or ask Claude to fix the issue.

**Can Claude access external services (databases, APIs, cloud consoles)?**

Only if you explicitly configure MCP server integrations in `.claude/settings.json` or agent frontmatter. By default, Claude has no access to external services — only the local filesystem and shell.

---

## Adoption & Integration

**How do I introduce this to my team?**

Start with `/audit-quick` on your codebase — it takes 10-15 minutes and produces a project context document and architecture map that are immediately useful. Share the output with the team. Then run the full `/audit` and review the roadmap together. This gives the team concrete evidence of what the framework produces before asking them to adopt the full workflow.

**Does this replace our existing CI/CD or code review process?**

No. The `/review` command and `pre-pr-review` skill are complementary to human code review — they catch issues before the PR is created, reducing review burden. The pipeline's deploy stage can integrate with your existing CI/CD through MCP servers or shell commands. Nothing is replaced; layers are added.

**Can multiple people use this on the same codebase?**

Yes. The `docs/audit/` files are regular markdown committed to the repo. Multiple team members can run the `implement` skill against the same roadmap — the status tracking in `status.json` and `[DONE]` prefixes on roadmap items prevent duplicate work.

**How do I keep the framework updated?**

Pull updates from `github.com/mumit/claude-dev-team` and re-run `bootstrap.sh`. The script overwrites `.claude/` and `AGENTS.md` with the latest framework files. Your `CLAUDE.md`, `pipeline/context.md`, `src/`, and all `*.local.*` files are never touched. Use `CLAUDE.md` or `CLAUDE.local.md` for project-specific instructions.

**What's the repo URL?**

[github.com/mumit/claude-dev-team](https://github.com/mumit/claude-dev-team)
