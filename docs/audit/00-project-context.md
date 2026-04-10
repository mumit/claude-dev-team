# Project Context

## Overview

**Claude Dev Team** is a framework/scaffold that installs into any project to provide a structured software development lifecycle powered by Claude Code. It is **not an application** — it contains no runtime source code (`src/` is not present in the repo itself). Instead, it provides Claude Code configuration: agents, commands, skills, rules, hooks, and documentation.

The project bootstraps into target codebases via `bootstrap.sh`, installing `.claude/` directory structure, pipeline scaffolding, and orchestrator instructions.

## Languages and Frameworks

| Layer | Technology |
|---|---|
| Primary language | Markdown (agent definitions, commands, skills, rules, docs) |
| Hook/validation | JavaScript (Node.js) — `gate-validator.js` |
| Bootstrap | Bash — `bootstrap.sh` |
| Presentation | JavaScript (Node.js) — `docs/build-presentation.js` (pptxgenjs + React SSR + sharp) |

This is a **configuration-as-code** project. The "product" is the `.claude/` directory and its supporting files.

## Build System and Dependency Manager

- **No package.json or dependency manifest.** The project has no `npm install` step.
- `gate-validator.js` uses only Node.js built-ins (`fs`, `path`).
- `build-presentation.js` requires external deps (`pptxgenjs`, `react`, `react-dom`, `sharp`, `react-icons`) but these are noted in README as ad-hoc install, not managed.

## Commands

| Action | Command |
|---|---|
| Install deps | N/A (no dependency manager) |
| Run app | N/A (not an application) |
| Run tests | N/A (no test suite) |
| Lint | N/A (no linter configured) |
| Build | N/A |
| Bootstrap into a project | `bash bootstrap.sh /path/to/target` |
| Generate presentation | `npm install pptxgenjs react-icons react react-dom sharp && node docs/build-presentation.js` |

## Deployment Target

Not deployed independently. Installed into target projects via bootstrap script. Target projects may deploy via Docker Compose (as defined in the `dev-platform` agent's deploy task).

## Conventions (Documented)

1. **Pipeline rules** (`.claude/rules/pipeline.md`) — 8-stage pipeline with gates
2. **Gate schema** (`.claude/rules/gates.md`) — JSON gate format with required fields
3. **Escalation rules** (`.claude/rules/escalation.md`) — when/how to escalate
4. **Code conventions** (`.claude/skills/code-conventions/SKILL.md`) — naming, error handling, security, testing, git
5. **API conventions** (`.claude/skills/api-conventions/SKILL.md`) — REST patterns, response shapes, pagination
6. **Security checklist** (`.claude/skills/security-checklist/SKILL.md`) — input validation, auth, secrets, deps
7. **Review rubric** (`.claude/skills/review-rubric/SKILL.md`) — spec compliance, correctness, security, tests, readability

## Conventions (Undocumented but Implied)

1. Agent files use YAML frontmatter with specific keys: `name`, `description`, `tools`, `model`, `permissionMode`, `skills`, `hooks`
2. Command files are plain markdown loaded as slash commands
3. Skill files use YAML frontmatter with `name` and `description` (trigger phrases)
4. All pipeline artifacts go to `pipeline/` directory
5. All audit artifacts go to `docs/audit/` directory
6. Gate files are the single source of truth for pipeline state — not prose

## Codebase Size

| Metric | Count |
|---|---|
| Total files (non-.git) | 46 |
| Agent definitions | 5 |
| Command definitions | 18 |
| Skill definitions | 6 |
| Rule files | 4 |
| Reference files | 2 |
| Documentation files | 3 (lifecycle.md, faq.md, build-presentation.js) |
| Root config/docs | 5 (CLAUDE.md, AGENTS.md, EXAMPLE.md, README.md, bootstrap.sh) |
| Pipeline scaffolding | 1 (context.md template) |
| Hooks | 1 (gate-validator.js) |

## Monorepo vs Single App

**Single project** — not a monorepo. It's a framework/template that installs into other projects.

## Surprises and Open Questions

1. **No `package.json`** — `gate-validator.js` and `build-presentation.js` use Node.js but there's no dependency manifest. The hook uses only builtins, but the presentation script requires 4 external packages installed ad-hoc.
2. **No `.gitignore`** — The repo itself has no `.gitignore`. The bootstrap script appends entries to the *target* project's `.gitignore`, but the framework repo doesn't ignore anything.
3. **No tests** — A framework that enforces testing conventions on target projects has zero tests of its own. The gate-validator hook is the most critical runtime component and is untested.
4. **No linter** — Code conventions are documented but not enforced by tooling within this repo.
5. **`EXAMPLE.md` references `src/` paths** — The example walkthrough describes files in `src/backend/`, `src/frontend/`, `src/infra/` but these directories don't exist in the framework repo.
6. **`docs/build-presentation.js` is 684 lines** — Largest file in the repo by far. Contains a full slide deck generator with inline content, layout logic, and icon rendering. Feels like it belongs in a separate tool or at minimum should have its own README.
7. **Settings.json enables experimental features** — `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is set to `"1"`. This is noted as experimental in the README but could break on Claude Code updates.
