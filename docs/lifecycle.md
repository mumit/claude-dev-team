# Claude Dev Team — Full Software Lifecycle with Claude Code

**From codebase audit to production deployment.**

github.com/mumit/claude-dev-team

---

## The Problem

AI coding tools are powerful. Without structure, they're unreliable.

**Context evaporates.** Every `/compact` or new session loses decisions, findings, and progress. You repeat yourself constantly.

**Ad-hoc prompting.** Everyone writes different prompts for the same task. No consistency, no reuse, no shared learning.

**No guardrails.** AI writes code that ignores your team's conventions, security rules, and architecture decisions.

**No checkpoints.** Long workflows run to completion or fail silently. No pause, no review, no human in the loop.

---

## Before & After

**Without structure**, you copy-paste prompts from a wiki page, re-explain your architecture each session, hope Claude follows your conventions, review 500-line AI diffs with no context, forget what was already audited, and have no way to resume interrupted work.

**With Claude Dev Team**, you type `/audit` and the workflow runs itself. Context persists in `docs/audit/` across sessions. Skills load your rules automatically. Human checkpoints pause before every major step. `status.json` tracks exactly where you left off. `/audit --resume` picks up mid-workflow.

---

## How It Works

Three building blocks, each with a clear purpose.

### Commands — You type, it runs

Deterministic workflows with built-in checkpoints. `/audit` runs a 4-phase analysis. `/pipeline` builds a feature end-to-end. `/review` checks code before merge. Each command writes persistent output to disk so context survives across sessions.

### Skills — Claude loads automatically

Passive knowledge triggered by context. Coding conventions, security checklists, review rubrics. Claude reads them when relevant — you don't have to paste anything. Skills live in `.claude/skills/` and are loaded by natural-language trigger phrases.

### Agents — Scoped AI actors

A virtual team: PM, Principal, Backend Dev, Frontend Dev, Platform Dev. Each has specific file permissions and a defined role. The PM can't write code. Devs can't touch each other's files. The Principal resolves conflicts. Humans own the gates.

---

## When to Use What

| Situation | What to run |
|---|---|
| Just inherited a codebase | `/audit-quick` then `/audit` |
| Want a deep analysis of existing code | `/audit` |
| Working through audit improvements | `implement` skill then `/review` |
| Building a brand-new feature | `/pipeline` |
| About to merge non-pipeline code | `/review` |
| Monthly quality check | `/health-check` |
| Checking roadmap progress | `/roadmap` |

Every command writes persistent output to `docs/` or `pipeline/` — context survives across sessions.

---

## Auditing a Codebase

### /audit — 4 Phases, 3 Checkpoints

The `/audit` command runs a structured analysis of any codebase in four phases, with human checkpoints between major transitions.

**Phase 0: Bootstrap** — Establishes project context, maps the architecture, and scans git history for hotspots, churn patterns, and development velocity. After this phase, Checkpoint A pauses for you to validate that Claude understood the architecture correctly before moving to deeper analysis.

**Phase 1: Health** — Checks convention compliance, test health (coverage, quality, missing markers), and documentation gaps. This is the breadth scan — how consistent is the codebase against its own stated rules?

**Phase 2: Deep Analysis** — Security scan (vulnerabilities, auth gaps, secret handling), performance review (bottlenecks, connection patterns, caching), and code quality analysis (complexity, duplication, dead code). After this phase, Checkpoint B pauses for you to review all findings before the roadmap is built.

**Phase 3: Roadmap** — Synthesizes findings across all phases into cross-cutting themes, then produces a prioritized improvement roadmap organized into Batch 1 (Critical), Batch 2 (High), Batch 3 (Medium), and Batch 4 (Low). Checkpoint C pauses for you to approve the roadmap before any implementation begins.

If your session is interrupted at any point, `/audit --resume` reads `docs/audit/status.json` and picks up from the last completed phase. You can also scope the audit to a subdirectory: `/audit src/backend/`.

### What the Audit Produces

Eleven markdown files plus a status tracker, all written to `docs/audit/`:

`00-project-context.md` — Tech stack, dependencies, patterns. `01-architecture.md` — Component map and data flow. `02-git-analysis.md` — Hotspots, churn, velocity. `03-compliance.md` — Convention violations. `04-test-health.md` — Coverage gaps, quality. `05-documentation.md` — Missing or stale docs. `06-security.md` — Vulnerabilities and risks. `07-performance.md` — Bottlenecks and patterns. `08-code-quality.md` — Complexity, duplication. `09-synthesis.md` — Cross-cutting themes. `10-roadmap.md` — Prioritized improvement plan. `status.json` — Resume tracker.

Each finding includes the violation type, specific file and line number, current code pattern, expected pattern, the rule being violated (referenced by name), and a confidence rating of HIGH, MEDIUM, or LOW.

### Customizing for Your Stack

The generic audit covers roughly 80% of any codebase. For project-specific checks, create a `docs/audit-extensions.md` file. The `/audit` command loads it automatically after each phase.

The file uses a simple section format: "After Phase 1" for your team's coding standards and framework patterns, "After Phase 2" for stack-specific performance checks like database queries, caching, and connection pooling, and "After Phase 3" for deploy sequencing rules like infrastructure dependencies, environment differences, and migration order.

Examples of what goes in extensions: verifying all routes use the shared auth middleware rather than custom decorators (Python/FastAPI), checking that API calls use the centralized fetch wrapper instead of raw `fetch()` (React/Next.js), ensuring gRPC services implement the health check interface (Go), or validating that `@Transactional` boundaries match expected isolation levels (Java/Spring).

A worked example with full format documentation is included in `.claude/references/audit-extensions-example.md`.

---

## Implementing Improvements

### The implement Skill

Say "implement Batch 2 item 3" and Claude reads the roadmap, plans, codes, verifies, and commits — in four stages with stop-and-report checkpoints.

**Plan.** Claude reads the relevant audit findings, identifies files to change, and proposes an approach. It stops and presents the plan for your approval. No code is written until you confirm.

**Execute.** Claude makes the changes, runs lint and tests, and logs what it did to `pipeline/context.md`. If tests fail, it stops immediately and explains what happened instead of pushing through.

**Verify.** Claude confirms all tests pass, marks the roadmap item with a `[DONE]` prefix, and suggests running `/review` before merge.

**Commit.** Claude drafts a conventional commit message and asks for your approval. Each implemented item becomes one atomic commit — keeping history clean and reverts safe. If you start a new item with uncommitted changes from a previous cycle, Claude warns you first.

Three input modes are supported: naming a specific roadmap item ("implement Batch 2 item 3"), providing an inline description ("implement: add rate limiting to /generate"), or asking for the next item ("implement next item") which picks the next pending item from the roadmap.

Claude never commits or pushes without explicit human approval. Every step has a stop-and-report checkpoint. If tests fail, Claude stops and explains what happened. You review the diff, you decide to commit.

### /review — Pre-Merge Check

The `/review` command loads the `pre-pr-review` skill and performs four types of analysis.

**Full-file diff analysis** reads complete changed files, not just diffs. This catches context-dependent bugs that line-by-line review misses.

**Convention compliance** loads your coding standards skill and checks naming, patterns, imports, and error handling against your rules.

**Security scan** loads the security checklist skill and checks for hardcoded secrets, injection risks, auth gaps, and unsafe defaults.

**Regression detection** cross-references known violations from the audit. This ensures old patterns don't creep back in.

You can focus the review on a specific area: `/review security`, `/review performance`, `/review tests`.

---

## Building New Features

### /pipeline — Feature Build in 9 Stages

The pipeline orchestrates a full feature build through nine stages, with human checkpoints at three points.

Stage 1 (Brief) is handled by the PM agent, which writes requirements and acceptance criteria. Stage 2 (Design) is handled by the Principal agent, which drafts the design spec and architecture decision records. Human Checkpoint A pauses for you to review the brief and design before any code is written.

Stage 4 (Build) runs three developer agents in parallel — Backend, Frontend, and Platform — each scoped to their own directory. Before writing a single line of code, each agent records its plan and assumptions. Between Stage 4 and Stage 5, two automated checks run (Stage 4.5): a lint + type-check + SCA gate (`dev-platform` agent), and — when the diff touches auth, crypto, PII, payments, secrets, dependencies, Dockerfiles, or security-relevant infra — a conditional security review by the `security-engineer` agent with veto power. The pipeline does not advance to peer review until both pass. Stage 5 (Review) uses one of two shapes depending on the diff: **scoped** review (one cross-area reviewer when the diff is area-contained) or **matrix** review (each dev reviews the other two when the diff crosses areas). **Reviewers are READ-ONLY during Stage 5 — they may not edit source files.** If a reviewer finds a bug, they write `REVIEW: CHANGES REQUESTED` and the owning dev fixes it separately. Stage 5 approval gates are derived by the `approval-derivation.js` hook — it parses `REVIEW: APPROVED` / `REVIEW: CHANGES REQUESTED` markers from each reviewer's file and writes the gate; agents do not write approval arrays directly. Stage 6 (Test) has the QA dev (`dev-qa`) run the full test suite. Human Checkpoint C pauses for PM and human approval of the test results before deploy. Stage 8 (Deploy) executes the deployment. Stage 8 requires a `pipeline/runbook.md` with `## Rollback` and `## Health signals` sections before deployment begins. The deploy is adapter-driven — select `docker-compose` (default), `kubernetes`, `terraform`, or `custom` in `.claude/config.yml`.

Stage 9 (Retrospective) runs automatically after deploy (pass or fail). All agents (six to seven, depending on whether Stage 4.5b fired) contribute a section to `pipeline/retrospective.md`, then the Principal synthesises and promotes up to two lessons to `pipeline/lessons-learned.md`. This file survives `/reset` and is read at the start of every future run — closing the learning loop across features.

Every stage writes a JSON gate file to `pipeline/gates/` with a status of PASS, FAIL, or ESCALATE. The `gate-validator.js` hook reads these files deterministically after each agent stops — no natural language parsing, no ambiguity.

### The Virtual Team

| Role | Model | Domain | Boundaries |
|---|---|---|---|
| PM | Opus | Requirements, acceptance, sign-off, retro contribution | pipeline/ only — no code access |
| Principal | Opus | Architecture, design review, ADRs, retro synthesis | Read + Bash (read-only) |
| Backend | Sonnet | APIs, services, data layer | src/backend/ only; READ-ONLY during Stage 5 review |
| Frontend | Sonnet | UI components, client logic | src/frontend/ only; READ-ONLY during Stage 5 review |
| Platform | Sonnet | Tests, CI/CD, deployment | src/infra/ only; READ-ONLY during Stage 5 review |
| QA | Sonnet | Test authoring, Stage 6 test run | src/tests/ only; READ-ONLY during Stage 5 review *(v2.3+)* |
| Security Engineer | Opus | Threat modelling, Stage 4.5b veto | Read + Bash (read-only); veto-power halts pipeline *(v2.3+)* |

Opus is used for PM, Principal, and Security Engineer (where threat-modelling judgment is needed). Sonnet is used for the developer roles (Backend, Frontend, Platform, QA) because they're doing focused implementation work where speed matters more.

Role separation prevents scope creep. Devs can't touch each other's code. The PM can't make technical decisions. During Stage 5 peer review, developer agents are READ-ONLY with respect to source files — they write only to their review file and the approval gate. Silent inline fixes bypass the owning dev and break the audit trail. The `security-engineer` agent participates only when a security-relevant diff is detected — it can veto Stage 5 regardless of peer-review approvals.

---

## Safety & Trust Model

Claude is powerful but scoped. Here's the boundary.

**Claude handles:** reading and analyzing the full codebase, writing findings to structured files, generating prioritized roadmaps, drafting code changes with tests, running lint and test suites, and tracking progress in `status.json`.

**Requires your approval:** proceeding past any checkpoint, committing or pushing code, approving the implementation plan, accepting the roadmap priorities, deploying to any environment, and resolving escalated decisions.

Every finding includes a confidence rating. The human checkpoints exist specifically for you to review, correct, or override Claude's work. The `implement` skill stops if tests fail. The pipeline halts on ESCALATE gates. Nothing irreversible happens without a human in the loop.

**Coding principles (applied by all agents during every build):** four behavioural rules adapted from Karpathy's LLM coding observations — Think Before Coding (record assumptions before the first edit), Simplicity First (minimum code that satisfies the spec, no speculative features), Surgical Changes (touch only what the spec requires), and Goal-Driven Execution (write a verifiable Plan before coding, loop until each criterion is checked off). Reviewers apply the same rubric: any BLOCKER finding must trace to one of the four principles.

**Persistent learning:** after every deploy, Stage 9 (Retrospective) runs automatically. The Principal promotes at most two lessons per run to `pipeline/lessons-learned.md` — a file that survives `/reset` and is read by every agent at the start of every future run. Lessons that have been reinforced five times without a related defect are retired. The file grows only when something genuinely new is learned.

---

## Ongoing Maintenance

### /health-check

A monthly delta scan against the last audit. Run it before big releases or on a regular cadence. It checks for new convention violations since the last audit, untested components added recently, dependency changes (new, removed, major version bumps), documentation that's now stale, TODOs older than 30 days, and roadmap progress compared to the last check. Output is written to `docs/audit/health-check-YYYY-MM.md`.

### /roadmap

A progress dashboard that reads `docs/audit/10-roadmap.md` and shows batch progress (how many items done per batch), the next three items to work on, recently completed items, and any stalled items that haven't progressed.

---

## Getting Started

1. Clone the repo into your project
2. Run `bootstrap.sh` to install the `.claude/` structure
3. Add a `docs/audit-extensions.md` for your stack (optional)
4. Run `/audit-quick` to orient, then `/audit` for full analysis
5. Use the `implement` skill to work through the roadmap

**Prerequisites:** Claude Code CLI + a Git repo + 10 minutes.

**Repository:** [github.com/mumit/claude-dev-team](https://github.com/mumit/claude-dev-team)
