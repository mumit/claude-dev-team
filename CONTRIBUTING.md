# Contributing

## Prerequisites

- Node.js 20+
- Git
- rsync (for bootstrap.sh)
- [Claude Code](https://claude.ai/code) (to run the agent team)

## Setup

```bash
git clone https://github.com/mumit/claude-dev-team.git
cd claude-dev-team
npm install
```

## Running Tests

```bash
npm test                    # unit tests (gate-validator, etc.)
npm run test:integration    # integration tests (bootstrap.sh)
```

All tests use Node's built-in `node:test` runner — no external test framework needed.

## Project Structure

This is a **framework/template**, not an application. There is no `src/` directory in the repo itself — `src/` is created by `bootstrap.sh` when installing into a target project.

The key components:

| Path | Purpose |
|------|---------|
| `.claude/agents/` | Agent definitions (PM, Principal, 3 devs) |
| `.claude/commands/` | Slash commands (`/pipeline`, `/status`, etc.) |
| `.claude/skills/` | Shared skill definitions (conventions, checklists) |
| `.claude/rules/` | Pipeline rules, gate schema, escalation, orchestrator |
| `.claude/hooks/` | Git/tool hooks (gate-validator.js) |
| `pipeline/` | Runtime pipeline state (gates, context, artifacts) |
| `bootstrap.sh` | Installs the framework into an existing project |

See `AGENTS.md` for the full team and command reference.

## Making Changes

1. Make your changes on a feature branch
2. Run `npm test` to verify existing tests pass
3. Add tests for new functionality in `tests/`
4. Open a PR against `main`

## Testing Conventions

- Tests live in `tests/` with the naming pattern `*.test.js`
- Use `node:test` (`describe`, `it`) and `node:assert/strict`
- No external test dependencies
- For hooks and scripts, spawn them as child processes and assert on exit codes and stdout

## Bootstrap Script

`bootstrap.sh` copies the framework into an existing project. If you modify it:

- Test with `npm run test:integration`
- Verify it runs on both macOS and Linux (CI covers Ubuntu)
- It must be idempotent — running twice should not break anything
- `.claude/` is overwritten on every run (framework-owned)
- `CLAUDE.md` is created only if missing (project-owned)
- `*.local.*` files and `settings.local.json` are always preserved
