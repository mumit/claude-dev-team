# Claude Dev Team

A full simulated software development team running inside Claude Code.
Includes a PM, Principal Engineer, five specialist developers
(backend, frontend, platform, QA, security-engineer), and a dedicated
peer-reviewer agent, with peer code review, human checkpoints,
deterministic gate validation, a hotfix path, lightweight tracks for
small changes, pluggable deploy adapters, codebase auditing, a roadmap
workflow, a persistent retrospective that promotes lessons into future
runs, and a Node CLI (`scripts/claude-team.js`) for automation, CI
integration, and non-Claude environments.

**Current version**: see [`VERSION`](VERSION) (repo root) or
`cat .claude/VERSION` in an installed project. Release history in
[`CHANGELOG.md`](CHANGELOG.md).

New here? Start with the **[user guide](docs/user-guide.md)** for a journey-based walk-through, or the **[adoption guide](docs/adoption-guide.md)** to make the case to your team. Contributing to the framework itself? See **[docs/concepts.md](docs/concepts.md)** for one-sentence definitions of each primitive.

---

## Prerequisites

- Claude Code v2.1.32 or later (`claude --version`)
- Node.js 20+ (for hooks, the gate-validator, and the CLI)
- Git (worktrees used for parallel dev builds)

## First-time Setup

You can bootstrap a new project, or retrofit an existing one.

```bash
# 1. Clone and bootstrap (bash or Node — both are equivalent)
cd /path/to/dev-team && bash bootstrap.sh /path/to/my-project
# or: node scripts/bootstrap.js /path/to/my-project
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

## First 30 Minutes

After bootstrap, do these three things before kicking off your first
`/pipeline` run. Each is a one-paragraph step; the whole sequence takes
under thirty minutes including reading time.

### 1. Read [`EXAMPLE.md`](EXAMPLE.md)

A walkthrough of one real pipeline run end-to-end — what you'll see at
each of the nine stages, what the gate files look like, what the three
human checkpoints feel like, and how an escalation surfaces. This is
the single best way to understand what's about to happen on your
project before it happens.

### 2. Pick a deploy adapter

Stage 8 (Deploy) reads `.claude/config.yml` for the adapter name. The
default is `docker-compose`; change it now if you'll deploy via
Kubernetes, Terraform, or a custom script:

```yaml
# .claude/config.yml
deploy:
  adapter: kubernetes   # or: docker-compose, terraform, custom
```

If you forget, Stage 8 will ESCALATE with a clear message — no silent
failure — but fixing it before the first run keeps the pipeline moving.
Per-adapter configuration (compose file path, k8s strategy, terraform
workspace, custom script) lives in the same file under
`deploy.<adapter>:`. See [`.claude/adapters/`](.claude/adapters/) for
each adapter's contract.

### 3. If you'll be reviewing code, learn the marker grammar

Stage 5 reviewers write a single Markdown file at
`pipeline/code-review/by-<reviewer>.md` with one section per area, each
ending in one of two literal markers:

```markdown
## Review of backend
<comments, BLOCKER / SUGGESTION / QUESTION entries>

REVIEW: APPROVED

## Review of platform
<comments>

REVIEW: CHANGES REQUESTED
BLOCKER: missing input validation in handler
```

The `approval-derivation` hook reads only the `REVIEW:` marker;
everything above it is human-readable context for the author. Optional
`PATTERN:` lines flag practices worth promoting in the retrospective.
Full grammar in [`templates/review-template.md`](templates/review-template.md)
and [`.claude/rules/pipeline.md`](.claude/rules/pipeline.md) §Stage 5.

---

## When to Use What

| I want to... | Command / Skill |
|---|---|
| Build a new feature end-to-end | `/pipeline` |
| Fix a doc typo, dead import, or comment (no runtime change) | `/nano` |
| Make a small contained code change (≤ ~100 LOC, one area) | `/quick` |
| Change config only (env vars, flag toggles, compose values) | `/config-only` |
| Update a dependency | `/dep-update` |
| Draft requirements before committing to a build | `/pipeline-brief` |
| Run Stages 1–2 only (brief + design, no build) | `/design` |
| Fix a production bug urgently | `/hotfix` |
| Understand a codebase I'm new to | `/audit-quick` |
| Deep-audit and build an improvement roadmap | `/audit` |
| Work on a small/medium improvement | `implement` skill |
| Review code before merging (non-pipeline) | `/review` |
| Re-run Stage 5 peer review on current `src/` | `/pipeline-review` |
| Check monthly codebase health | `/health-check` |
| See improvement roadmap progress | `/roadmap` |
| See pipeline status | `/status` |
| Run a retrospective on a completed run | `/retrospective` |
| Ask the PM a question mid-pipeline | `/ask-pm` |
| Re-run a single pipeline stage | `/stage` |
| Resume pipeline from a specific stage | `/resume` |
| Archive current pipeline run, start fresh | `/reset` |
| Resolve a technical disagreement | `/principal-ruling` |
| Record an architecture decision | `/adr` |

Track reference — when each fits, what they skip, and the safety stoplist —
lives in [**docs/tracks.md**](docs/tracks.md). Use `/pipeline` when in doubt;
the orchestrator will offer a lighter track if the change fits one.

---

## Automation CLI (v2.6+)

`scripts/claude-team.js` is a Node CLI that mirrors every slash command, prints
prompts for non-Claude environments, and adds automation helpers that slash
commands can't provide.

```bash
# Status and diagnostics
node scripts/claude-team.js status        # gate summary + run state
node scripts/claude-team.js doctor        # verify framework files are in place
node scripts/claude-team.js validate      # validate all gate files against schemas
node scripts/claude-team.js next          # what stage should run next (and why)

# Pipeline trigger (prints a ready-to-paste Claude prompt)
node scripts/claude-team.js pipeline "Add user authentication"
node scripts/claude-team.js quick  "Fix pagination cursor reset"
node scripts/claude-team.js nano   "Fix typo in README"

# Automation helpers
node scripts/claude-team.js autofold      # fold Stage 7 when criteria are 1:1
node scripts/claude-team.js roadmap       # roadmap status from pipeline/
node scripts/claude-team.js lessons       # summarize lessons-learned.md
node scripts/claude-team.js summary       # human-readable run summary
node scripts/claude-team.js review        # derive Stage 5 approval gates
node scripts/claude-team.js security      # run Stage 4.5b security heuristic
node scripts/claude-team.js runbook       # check pipeline/runbook.md completeness

# All commands also available as npm shims:
npm run status | npm run doctor | npm run validate | npm run next
```

For the full command list: `node scripts/claude-team.js help` or `npm run help`.

Slash commands remain the authoritative workflow inside an active Claude Code
session. The CLI is the integration layer for CI, scripting, and environments
where Claude Code is not running.

---

## Project Layout (automation surface)

In addition to the `.claude/` tree installed into target projects, this repo
ships:

| Path | Purpose |
|---|---|
| `scripts/claude-team.js` | Main CLI dispatcher (16 helper modules) |
| `scripts/*.js` | Helper scripts: status, gate-validator, approval-derivation, security-heuristic, runbook-check, parity-check, release, pr-pack, consistency, audit, lessons, roadmap, summary, lint-syntax, bootstrap |
| `schemas/*.schema.json` | JSON Schema files for every pipeline gate (stage-01 through stage-09, plus `gate.schema.json`) |
| `templates/*.md` | Canonical pipeline artifact templates (brief, design-spec, runbook, adr, review, etc.) |
| `examples/tiny-app/` | Minimal Node project for dogfooding bootstrap and pipeline commands |

See [docs/concepts.md](docs/concepts.md) for the five building blocks, and
[CONTRIBUTING.md](CONTRIBUTING.md) for how to add commands, agents, and skills.

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

### Stage 4.5 — Automated pre-review checks (v2.3+)

Between build and peer review, two automated gates run:

- **Stage 4.5a** (always) — `dev-platform` runs lint, type-check, and a software
  composition analysis (SCA) scan. Stage 5 does not start until this passes.
- **Stage 4.5b** (conditional) — `security-engineer` reviews the diff when it touches
  auth, crypto, PII, payments, secrets, new/upgraded dependencies, Dockerfiles with
  network or volume changes, or security-relevant infra. The security-engineer has
  **veto power**: a `veto: true` gate halts the pipeline regardless of peer-review
  approvals. When the heuristic doesn't fire, the skip reason is recorded in
  `pipeline/context.md`.

### Stage 8 — Deploy adapters and runbook (v2.4+)

Before Stage 8 runs, `pipeline/runbook.md` must exist with at minimum `## Rollback`
and `## Health signals` sections — a missing runbook causes an immediate ESCALATE.
Deploy is adapter-driven: set `deploy.adapter` in `.claude/config.yml` to
`docker-compose` (default), `kubernetes`, `terraform`, or `custom`. Each adapter's
instructions live in `.claude/adapters/<adapter>.md`.

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
│   │   ├── security-engineer.md       # Security — threat model + veto (v2.3+)
│   │   └── reviewer.md                # Peer reviewer — Stage 5 READ-ONLY review (v2.6+)
│   ├── adapters/                      # Stage 8 deploy adapters (v2.4+)
│   │   ├── docker-compose.md          # Default adapter
│   │   ├── kubernetes.md
│   │   ├── terraform.md
│   │   ├── custom.md
│   │   └── README.md                  # Adapter contract
│   ├── commands/
│   │   ├── pipeline.md                # /pipeline — full feature build
│   │   ├── nano.md                    # /nano — trivial single-file change (no review)
│   │   ├── quick.md                   # /quick — single-area code change ≤ ~100 LOC
│   │   ├── hotfix.md                  # /hotfix — urgent production fix
│   │   ├── config-only.md             # /config-only — config-values-only change
│   │   ├── dep-update.md              # /dep-update — dependency upgrade
│   │   ├── pipeline-brief.md          # /pipeline-brief — draft brief only
│   │   ├── design.md                  # /design — Stages 1–2 only (brief + spec)
│   │   ├── pipeline-review.md         # /pipeline-review — Stage 5 re-run
│   │   ├── pipeline-context.md        # /pipeline-context — compact context dump
│   │   ├── retrospective.md           # /retrospective — run Stage 9 standalone
│   │   ├── status.md                  # /status — pipeline dashboard
│   │   ├── audit.md                   # /audit — full codebase audit
│   │   ├── audit-quick.md             # /audit-quick — Phases 0–1 only
│   │   ├── health-check.md            # /health-check — monthly delta scan
│   │   ├── review.md                  # /review — pre-merge review
│   │   ├── roadmap.md                 # /roadmap — improvement dashboard
│   │   ├── adr.md                     # /adr — architecture decision record
│   │   ├── principal-ruling.md        # /principal-ruling — binding ruling
│   │   ├── ask-pm.md                  # /ask-pm — PM clarification mid-pipeline
│   │   ├── reset.md                   # /reset — archive + start fresh
│   │   ├── resume.md                  # /resume — resume from a stage
│   │   └── stage.md                   # /stage — re-run one stage explicitly
│   ├── hooks/
│   │   ├── gate-validator.js          # Gate schema + status enforcement
│   │   └── approval-derivation.js     # Derives Stage 5 approvals from review files (v2.3.1+)
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
│   ├── config.yml                     # Opt-in: budget gate, async checkpoints, deploy adapter
│   └── settings.json
├── pipeline/                          # Created by bootstrap, populated by /pipeline
│   ├── context.md
│   ├── lessons-learned.md             # Persistent across /reset — promoted lessons
│   ├── runbook.md                     # Required before Stage 8 — rollback + health signals
│   ├── gates/
│   ├── adr/
│   ├── code-review/                   # Stage 5 reviewer files (by-{agent}.md)
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
| reviewer | sonnet | Execution: Stage 5 READ-ONLY peer review *(v2.6+)* |

---

## How Gates Work

Every stage writes a JSON gate file to `pipeline/gates/`. Two hooks in
`.claude/settings.json` enforce gate integrity:

- **`gate-validator.js`** — runs after every subagent stop; reads gate files
  deterministically and exits 0 (PASS), 2 (FAIL), or 3 (ESCALATE). FAIL retries
  with the owning agent. ESCALATE halts and surfaces to you.
- **`approval-derivation.js`** (v2.3.1+) — runs after every Write/Edit to a Stage 5
  review file; parses `REVIEW: APPROVED` / `REVIEW: CHANGES REQUESTED` markers per
  area section and derives the `approvals` and `changes_requested` arrays in
  `pipeline/gates/stage-05-{area}.json`. Agents do not write to those arrays directly
  — any direct edit is overwritten on the next reviewer file save. This closes the
  self-approval hole: a reviewer cannot approve their own code.

Your decisions on escalations are recorded in `pipeline/context.md`.

---

## Opt-in Features (v2.5+)

Three features in `.claude/config.yml` are disabled by default:

### Budget gate

```yaml
budget:
  enabled: true
  tokens_max: 500000
  wall_clock_max_min: 90
  on_exceed: escalate   # or: warn
```

Tracks token + wall-clock usage per run in `pipeline/budget.md`. On exceed:
`escalate` writes an ESCALATE gate and halts; `warn` logs the breach and
continues. Useful for calibration runs and cost guardrails.

### Async-friendly checkpoints

```yaml
checkpoints:
  c:
    auto_pass_when: all_criteria_passed   # or: no_warnings
```

Supported values: `no_warnings` (auto-pass if the gate has zero warnings),
`all_criteria_passed` (Checkpoint C only — auto-pass if Stage 6 reports
`all_acceptance_criteria_met: true`). Default behaviour (always wait for human)
is unchanged when the key is absent. Security-sensitive work is unaffected —
the Stage 4.5b veto overrides auto-pass.

### PATTERN review tag

No config needed. Reviewers can flag things done especially well with a
`PATTERN:` line inside any Stage 5 review section:

```markdown
PATTERN: dependency injection lifecycle is explicit and testable —
candidate for the team's default pattern

REVIEW: APPROVED
```

The Principal harvests PATTERN entries during Stage 9 synthesis and can promote
recurring ones to `pipeline/lessons-learned.md` as positive rules ("Use X
because…" rather than "Don't do Y because…").

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

- **[docs/user-guide.md](docs/user-guide.md)** — Journey-based user guide: use cases, Mermaid diagrams, "what you'll actually see", workflow fit, and introducing the tool to your team
- **[docs/adoption-guide.md](docs/adoption-guide.md)** — For engineering managers and skeptics: Q&A on trust, process, team dynamics, and tool safety; what not to do; a 6-week adoption timeline
- **[docs/concepts.md](docs/concepts.md)** — One-page primer: what an agent, command, skill, rule, and hook each are (and how they compose)
- **[docs/presentation-notes.md](docs/presentation-notes.md)** — Speaker notes for each of the 19 deck slides: talking points, transitions, and a timing reference
- **[docs/faq.md](docs/faq.md)** — Frequently asked questions from technical teams evaluating the framework
- **[scripts/build-presentation.js](scripts/build-presentation.js)** — Node script to generate a 19-slide `.pptx` deck (`npm install pptxgenjs react-icons react react-dom sharp && node scripts/build-presentation.js`)

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
