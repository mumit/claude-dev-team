# Claude Code Dev Team

A full simulated software development team running inside Claude Code.
Includes a PM, Principal Engineer, and three specialist developers with
peer code review, human checkpoints, deterministic gate validation,
a hotfix path, codebase auditing, a roadmap workflow, and a persistent
retrospective that promotes lessons into future runs.

New here? Start with [**docs/concepts.md**](docs/concepts.md) for
one-sentence definitions of agent, command, skill, rule, and hook.

---

## Prerequisites

- Claude Code v2.1.32 or later (`claude --version`)
- Node.js (for the gate-validator hook)
- Git (worktrees used for parallel dev builds)

## First-time Setup

You can bootstrap a new project, or retrofit an existing one.

```bash
# 1. Clone and bootstrap
cd /path/to/dev-team && bash bootstrap.sh /path/to/my-project
cd /path/to/my-project

# 2. Add project-specific instructions
#    CLAUDE.md — created for you, yours to edit (never overwritten)

# 3. Customise for your stack (takes 5 minutes)
#    .claude/skills/code-conventions/SKILL.md — language/framework specifics
#    .claude/skills/api-conventions/SKILL.md — API style
#    .claude/agents/dev-platform.md — deploy command under "On a Deploy Task"

# 4. Start Claude and go
claude
```

---

## When to Use What

| I want to... | Command / Skill |
|---|---|
| Build a new feature end-to-end | `/pipeline` |
| Make a small contained change (typo, docs, one-file refactor) | `/quick` |
| Change config only (env vars, flag toggles, compose values) | `/config-only` |
| Update a dependency | `/dep-update` |
| Draft requirements before committing to a build | `/pipeline-brief` |
| Fix a production bug urgently | `/hotfix` |
| Understand a codebase I'm new to | `/audit-quick` |
| Deep-audit and build an improvement roadmap | `/audit` |
| Work on a small/medium improvement | `implement` skill |
| Review code before merging (non-pipeline) | `/review` |
| Check monthly codebase health | `/health-check` |
| See improvement roadmap progress | `/roadmap` |
| See pipeline status | `/status` |
| Run a retrospective on a completed run | `/retrospective` |
| Resolve a technical disagreement | `/principal-ruling` |
| Record an architecture decision | `/adr` |

Track reference — when each fits, what they skip, and the safety stoplist —
lives in [**docs/tracks.md**](docs/tracks.md). Use `/pipeline` when in doubt;
the orchestrator will offer a lighter track if the change fits one.

---

## Building Features: The Pipeline

```bash
# Full feature pipeline
/pipeline Add a user authentication system with email + password login

# Draft brief only — review before committing to a full run
/pipeline-brief Add user authentication

# Urgent production fix (skips design stage)
/hotfix Login endpoint returning 500 on valid credentials since deploy #142
```

### Human Checkpoints

The pipeline pauses three times for your review:

| Checkpoint | After Stage | You're reviewing |
|---|---|---|
| **A** | 1 — Requirements | PM's brief and acceptance criteria |
| **B** | 2 — Design | Principal's spec and architecture decisions |
| **C** | 6 — Tests | Test results vs acceptance criteria before deploy |

Type `proceed` to advance. After Stage 8 (Deploy), Stage 9 (Retrospective)
runs automatically — no checkpoint needed. Lessons promoted to
`pipeline/lessons-learned.md` survive `/reset` and influence every future run.

---

## Auditing & Improving a Codebase

### `/audit` — Full codebase audit

Runs four phases with human checkpoints, producing a complete analysis
and prioritized roadmap in `docs/audit/`:

```
Phase 0 — Bootstrap      → architecture map, dependency graph, git history
  ✋ Checkpoint A: review the map
Phase 1 — Health          → convention violations, test gaps, doc gaps
  ✋ Checkpoint B: review findings
Phase 2 — Deep Analysis   → security, performance, code quality
  ✋ Checkpoint C: review before roadmap
Phase 3 — Roadmap         → prioritized backlog, sequenced implementation plan
```

Options:
- `/audit src/backend/` — scope to a subsystem
- `/audit --resume` — pick up from last completed phase

### `/audit-quick` — Orientation + health scan

Runs Phases 0-1 only. Good for onboarding or a quick checkup.
Run `/audit --resume` later to continue with deep analysis.

### `/health-check` — Monthly delta scan

Compares current codebase against prior audit findings. Reports new
violations, stale docs, untested new code, and roadmap progress.

### `/roadmap` — Progress dashboard

Shows roadmap status: what's done, what's next, what's stalled.

### `implement` skill — Work on roadmap items

For small-to-medium changes that don't need a full pipeline. Say
"implement [item]" or "next item from the roadmap". Follows plan →
execute → verify with human approval between steps.

### `/review` — Pre-merge review

For changes made outside the pipeline. Checks conventions, tests,
security, and audit anti-patterns. Also available as a skill via
"review my changes".

---

## Project-Specific Audit Extensions

If your project has conventions beyond what generic analysis covers,
create `docs/audit-extensions.md`. The `/audit` command reads it
automatically and runs your checks after each phase.

See `.claude/references/audit-extensions-example.md` for the format
and a worked example.

---

## Project Structure

```
your-project/
├── CLAUDE.md                          # Orchestrator instructions
├── AGENTS.md                          # Agent summary (multi-tool compat)
├── .claude/
│   ├── agents/
│   │   ├── pm.md                      # PM — requirements, sign-off
│   │   ├── principal.md               # Principal — architecture, reviews
│   │   ├── dev-backend.md             # Backend dev — APIs, services
│   │   ├── dev-frontend.md            # Frontend dev — UI, client
│   │   ├── dev-platform.md            # Platform dev — CI, infra, deploy, pre-review
│   │   ├── dev-qa.md                  # QA dev — test authoring + Stage 6 (v2.3+)
│   │   └── security-engineer.md       # Security — threat model + veto (v2.3+)
│   ├── commands/
│   │   ├── pipeline.md                # /pipeline — full feature build
│   │   ├── pipeline-brief.md          # /pipeline-brief — draft brief only
│   │   ├── pipeline-review.md         # /pipeline-review — Stage 5 re-run
│   │   ├── pipeline-context.md        # /pipeline-context — compact context dump
│   │   ├── retrospective.md           # /retrospective — run Stage 9 standalone
│   │   ├── status.md                  # /status — pipeline dashboard
│   │   ├── hotfix.md                  # /hotfix — urgent production fix
│   │   ├── audit.md                   # /audit — full codebase audit
│   │   ├── audit-quick.md             # /audit-quick — Phases 0–1 only
│   │   ├── health-check.md            # /health-check — monthly delta scan
│   │   ├── review.md                  # /review — pre-merge review
│   │   ├── roadmap.md                 # /roadmap — improvement dashboard
│   │   ├── design.md                  # /design — requirements + design
│   │   ├── adr.md                     # /adr — architecture decision record
│   │   ├── principal-ruling.md        # /principal-ruling — binding ruling
│   │   └── ...                        # ask-pm, reset, resume, stage
│   ├── hooks/
│   │   └── gate-validator.js          # Deterministic gate checking
│   ├── references/
│   │   ├── audit-phases.md            # Detailed audit phase definitions
│   │   └── audit-extensions-example.md
│   ├── rules/
│   │   ├── pipeline.md                # Stage-by-stage definition (9 stages)
│   │   ├── gates.md                   # Gate JSON schema
│   │   ├── escalation.md              # Escalation rules
│   │   ├── coding-principles.md       # Four dev principles (binding on all agents)
│   │   ├── retrospective.md           # Stage 9 protocol and lessons-learned format
│   │   └── compaction.md              # Context compaction instructions
│   ├── skills/
│   │   ├── implement/SKILL.md         # Plan/execute/verify for focused changes
│   │   ├── pre-pr-review/SKILL.md     # Pre-merge review
│   │   ├── code-conventions/SKILL.md  # Shared coding standards
│   │   ├── review-rubric/SKILL.md     # Pipeline Stage 5 review checklist
│   │   ├── security-checklist/SKILL.md
│   │   └── api-conventions/SKILL.md
│   └── settings.json
├── pipeline/                          # Created by bootstrap, populated by /pipeline
│   ├── context.md
│   ├── lessons-learned.md             # Persistent across /reset — promoted lessons
│   ├── gates/
│   ├── adr/
│   └── ...
└── src/
```

---

## Agent Models

| Agent | Model | Why |
|---|---|---|
| PM | opus | Judgment: requirements, sign-off |
| Principal | opus | Judgment: architecture, rulings |
| dev-backend | sonnet | Execution: build, review |
| dev-frontend | sonnet | Execution: build, review |
| dev-platform | sonnet | Execution: infra, deploy, review, pre-review checks |
| dev-qa | sonnet | Execution: test authoring + Stage 6 run *(v2.3+)* |
| security-engineer | opus | Judgment: threat modelling, veto on security-relevant diffs *(v2.3+)* |

---

## How Gates Work

Every stage writes a JSON gate file to `pipeline/gates/`. The
`gate-validator.js` hook runs after every subagent stop and reads these
files — not prose. It exits with:

- `0` — PASS, continue
- `2` — FAIL, retry with owning agent
- `3` — ESCALATE, halt and surface to user

Your decision on any escalation is recorded in `pipeline/context.md`.

---

## Customization & Updates

### Ownership model

Bootstrap divides files into two categories:

| Category | Owned by | Updated by bootstrap? |
|---|---|---|
| **Framework files** — everything under `.claude/`, `AGENTS.md` | Framework | Yes — overwritten on every run |
| **Project files** — `CLAUDE.md`, `pipeline/context.md`, `src/` | You | No — created once, never touched again |

### How to customize without losing changes on update

| What you want to change | Where to put it |
|---|---|
| Project-specific instructions | `CLAUDE.md` (yours, never overwritten) |
| Local-only instructions | `CLAUDE.local.md` (gitignored, loaded automatically) |
| Settings overrides | `.claude/settings.local.json` (gitignored, merged automatically) |

All `*.local.*` files under `.claude/` and `CLAUDE.local.md` are gitignored
and excluded from bootstrap's overwrite.

### Customizing for your stack

1. Edit `.claude/skills/code-conventions/SKILL.md` for your language/framework
2. Edit `.claude/skills/api-conventions/SKILL.md` for your API patterns
3. Add deploy steps to `dev-platform.md` under "On a Deploy Task"
4. Add MCP servers to agent frontmatter (GitHub, Slack, Jira, etc.)
5. Swap `sonnet` → `haiku` on dev agents to reduce cost on simpler features
6. Create `docs/audit-extensions.md` for project-specific audit checks

> **Note:** Edits to `.claude/` files will be overwritten on the next
> bootstrap run. If you need a permanent override, use `CLAUDE.md`
> or `CLAUDE.local.md` to add instructions that supplement or override
> the framework defaults.

### Updating the framework

```bash
# Pull the latest framework and re-run bootstrap
cd /path/to/dev-team && git pull
bash bootstrap.sh /path/to/your-project
```

This overwrites `.claude/` and `AGENTS.md` with the latest versions.
Your `CLAUDE.md`, `pipeline/context.md`, `src/`, and all `*.local.*`
files are untouched.

---

## Documentation

The `docs/` directory includes materials for presenting and sharing the framework:

- **[docs/concepts.md](docs/concepts.md)** — One-page primer: what an agent, command, skill, rule, and hook each are (and how they compose)
- **[docs/lifecycle.md](docs/lifecycle.md)** — Full written guide covering audit, implement, review, pipeline, safety model, and maintenance
- **[docs/faq.md](docs/faq.md)** — Frequently asked questions from technical teams evaluating the framework
- **[docs/build-presentation.js](docs/build-presentation.js)** — Node script to generate an 18-slide `.pptx` deck (`npm install pptxgenjs react-icons react react-dom sharp && node docs/build-presentation.js`)

---

## Known Limitations

- **Agent Teams is experimental** (requires v2.1.32+). On failure, review
  falls back to sequential: each reviewer reads the others' output files.
- **Subagents cannot spawn subagents.** The main session invokes all agents.
- **Parallel builds use git worktrees.** Merge conflicts need manual resolution
  before Stage 5.
- **Token costs scale quickly.** Use `/pipeline-brief` before committing to a
  full run on a large feature. Use `/audit-quick` before committing to a full
  `/audit`.
