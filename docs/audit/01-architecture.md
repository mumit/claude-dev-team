# Architecture Map

## Component Inventory

### 1. Orchestrator (`CLAUDE.md`)
- **Purpose**: Top-level coordinator. Routes work to agents, enforces gates, manages human checkpoints.
- **Entry point**: Read by Claude Code on session start.
- **Internal deps**: `.claude/rules/pipeline.md`, `.claude/rules/gates.md`, `.claude/rules/escalation.md`, `.claude/rules/compaction.md`, `pipeline/context.md`

### 2. Agent Definitions (`.claude/agents/`)
- **Purpose**: Define the 5-member virtual dev team with role-scoped permissions.
- **Components**:
  - `pm.md` — Product Manager (Opus, Read/Write/Glob, pipeline/ only)
  - `principal.md` — Principal Engineer (Opus, Read/Write/Glob/Grep/Bash)
  - `dev-backend.md` — Backend Dev (Sonnet, full toolset, `src/backend/`)
  - `dev-frontend.md` — Frontend Dev (Sonnet, full toolset, `src/frontend/`)
  - `dev-platform.md` — Platform Dev (Sonnet, full toolset, `src/infra/`)
- **Internal deps**: Skills (loaded via `skills:` frontmatter), hooks (PostToolUse lint)

### 3. Commands (`.claude/commands/`)
- **Purpose**: Slash-command workflows loaded by Claude Code.
- **Components** (18 commands):
  - Pipeline: `pipeline.md`, `pipeline-brief.md`, `pipeline-review.md`, `pipeline-status.md`, `status.md`, `stage.md`, `resume.md`, `reset.md`
  - Audit: `audit.md`, `audit-quick.md`, `health-check.md`, `roadmap.md`
  - Review: `review.md`
  - Design: `design.md`
  - Hotfix: `hotfix.md`
  - Governance: `adr.md`, `principal-ruling.md`, `ask-pm.md`
- **Internal deps**: Rules files, agent definitions, pipeline/ and docs/audit/ output

### 4. Skills (`.claude/skills/`)
- **Purpose**: Passive knowledge loaded by context or trigger phrases.
- **Components** (6 skills):
  - `code-conventions/SKILL.md` — Language-agnostic coding standards
  - `api-conventions/SKILL.md` — REST API patterns
  - `security-checklist/SKILL.md` — Security review checklist
  - `review-rubric/SKILL.md` — Pipeline Stage 5 review rubric
  - `implement/SKILL.md` — Plan/execute/verify workflow for focused changes
  - `pre-pr-review/SKILL.md` — Pre-merge code review
- **Internal deps**: Skills reference each other (e.g., pre-pr-review loads security-checklist)

### 5. Rules (`.claude/rules/`)
- **Purpose**: Machine-readable process definitions read by the orchestrator.
- **Components**:
  - `pipeline.md` — 8-stage pipeline definition
  - `gates.md` — JSON gate schema with stage-specific fields
  - `escalation.md` — When/how to escalate, format, orchestrator behavior
  - `compaction.md` — What to preserve/discard on context compaction
- **Internal deps**: Referenced by CLAUDE.md, commands, and agents

### 6. Gate Validator Hook (`.claude/hooks/gate-validator.js`)
- **Purpose**: Deterministic gate checking after every subagent stop. Reads latest gate JSON, validates structure, exits with status code (0=PASS, 2=FAIL, 3=ESCALATE).
- **Entry point**: Triggered by `SubagentStop` and `Stop` hooks in settings.json.
- **Internal deps**: `pipeline/gates/*.json`

### 7. Bootstrap Script (`bootstrap.sh`)
- **Purpose**: Install the framework into a target project.
- **Entry point**: `bash bootstrap.sh /path/to/target`
- **Internal deps**: All `.claude/` files, root markdown files, `pipeline/context.md`

### 8. Documentation (`docs/`)
- **Components**:
  - `lifecycle.md` — Full written guide for the framework
  - `faq.md` — FAQ for technical teams evaluating the framework
  - `build-presentation.js` — Node script generating 18-slide .pptx deck
- **Internal deps**: None (standalone documentation)

### 9. Cross-Tool Compatibility (`AGENTS.md`)
- **Purpose**: Human-readable agent summary and compatibility shim for Cursor, GitHub Copilot, etc.
- **Internal deps**: Mirrors `.claude/agents/` content

### 10. Pipeline Scaffolding (`pipeline/`)
- **Purpose**: Runtime state directory for pipeline execution.
- **Components**: `context.md` (template with empty sections)
- **Internal deps**: Written to by agents, read by orchestrator and gate-validator

## Dependency Graph

```
CLAUDE.md (orchestrator)
  ├── .claude/rules/pipeline.md
  ├── .claude/rules/gates.md
  ├── .claude/rules/escalation.md
  ├── .claude/rules/compaction.md
  └── pipeline/context.md

.claude/agents/*
  ├── .claude/skills/* (via frontmatter)
  └── .claude/hooks/gate-validator.js (via PostToolUse)

.claude/commands/*
  ├── .claude/agents/* (invoke agents)
  ├── .claude/rules/* (read rules)
  ├── .claude/references/* (read phase defs)
  └── pipeline/ + docs/audit/ (write output)

.claude/hooks/gate-validator.js
  └── pipeline/gates/*.json (read/validate)

bootstrap.sh
  └── ALL .claude/*, CLAUDE.md, AGENTS.md, EXAMPLE.md, pipeline/context.md (copy to target)

.claude/settings.json
  ├── .claude/hooks/gate-validator.js (hook config)
  └── env: CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS (feature flag)
```

**Circular dependencies**: None detected.

**High fan-in components**:
- `pipeline/context.md` — read by all agents, written to by all agents, checked by orchestrator
- `.claude/rules/pipeline.md` — read by orchestrator, all commands, and indirectly all agents
- `.claude/skills/code-conventions/SKILL.md` — loaded by all 3 dev agents
- `.claude/skills/security-checklist/SKILL.md` — loaded by all 3 dev agents + principal

## External Integrations

| Integration | Type | Used By | Abstracted? |
|---|---|---|---|
| Claude Code CLI | Runtime host | All components | N/A — this IS Claude Code config |
| Node.js | Runtime | gate-validator.js, build-presentation.js | Direct |
| Git | VCS | bootstrap.sh, dev agents (worktrees) | Direct |
| Docker Compose | Deploy | dev-platform agent | Direct (in agent instructions) |
| pptxgenjs | Lib | build-presentation.js | Direct |
| React/ReactDOM | Lib | build-presentation.js (SSR for icons) | Direct |
| sharp | Lib | build-presentation.js (SVG→PNG) | Direct |
| MCP Servers | Optional | Agent frontmatter (GitHub, Slack, Jira) | Documented but not configured |

## Data Flow

### Primary Flow: Feature Pipeline

```
User → /pipeline command
  → PM agent writes brief.md + stage-01 gate
  → [Checkpoint A — human review]
  → Principal drafts design-spec.md
  → 3 devs annotate design-review-notes.md (parallel)
  → Principal chairs review, writes ADRs, stage-02 gate
  → PM confirms scope fit
  → [Checkpoint B — human review]
  → Check context.md for open questions → PM answers
  → 3 devs build in parallel (git worktrees) → stage-04 gates
  → 3 devs cross-review → stage-05 gates
  → Platform dev runs tests → stage-06 gate
  → [Checkpoint C — human review]
  → PM signs off → stage-07 gate
  → Platform dev deploys → stage-08 gate
  → PM writes stakeholder summary
```

### Secondary Flow: Codebase Audit

```
User → /audit command
  → Phase 0: Bootstrap (context, architecture, git history)
  → [Checkpoint A]
  → Phase 1: Health (compliance, tests, docs)
  → [Checkpoint B]
  → Phase 2: Deep analysis (security, performance, quality)
  → [Checkpoint C]
  → Phase 3: Roadmap (backlog, sequenced plan)
```

### Secondary Flow: Implement Skill

```
User → "implement [item]"
  → Read audit context + roadmap
  → Plan (present to user, wait for approval)
  → Execute (lint after each file, stop on surprise)
  → Verify (full test suite, convention check)
  → Mark roadmap item [DONE]
```

## Configuration Surface

| Config | Location | Purpose |
|---|---|---|
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | `.claude/settings.json` env | Enable Agent Teams feature |
| Permission allowlist | `.claude/settings.json` permissions.allow | Bash, Write, tool permissions |
| Permission denylist | `.claude/settings.json` permissions.deny | Dangerous git operations |
| SubagentStop hook | `.claude/settings.json` hooks | Gate validation trigger |
| Stop hook | `.claude/settings.json` hooks | Gate validation trigger |
| Agent model selection | `.claude/agents/*.md` frontmatter | Opus vs Sonnet per role |
| Agent tool scoping | `.claude/agents/*.md` frontmatter | Which tools each agent can use |
| Agent skill loading | `.claude/agents/*.md` frontmatter | Which skills are auto-loaded |
| PostToolUse lint hook | `.claude/agents/*.md` frontmatter | Lint on Write/Edit |

**Env vars**: Only `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`. No secrets in the repo.
**Feature flags**: The experimental agent teams flag.
**Secrets**: None in the repo. The bootstrap script appends `.env` patterns to target `.gitignore`.

## What's Working Well

1. **Clear separation of concerns** — Agents, commands, skills, and rules each have a distinct purpose and directory. No blending.
2. **Machine-readable gates** — Using JSON gate files with a deterministic validator hook is excellent. No ambiguous prose parsing.
3. **Human-in-the-loop design** — Checkpoints at meaningful transitions (after requirements, after design, after tests) give the user real control.
4. **Escalation protocol** — Well-defined escalation format with specific decision-needed questions and options. Not just "something went wrong."
5. **Context persistence** — `pipeline/context.md` as an append-only shared memory across agents is a good pattern for multi-agent coordination.
6. **Role-based permissions** — PM can't write code, devs can't touch each other's directories, Principal has read-only Bash. Prevents scope creep.
7. **Comprehensive documentation** — README, EXAMPLE.md, lifecycle.md, and faq.md cover different audiences (quick start, walkthrough, deep dive, evaluators).
8. **Bootstrap script** — Clean installation path with backup of existing CLAUDE.md, merge-not-overwrite for .claude/, and clear next-steps output.
