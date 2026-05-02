# Project Instructions

This repository is the **`claude-dev-team` framework** itself, not a target
project that consumes it. Rules for working on *this* codebase live here;
framework orchestrator rules live in `.claude/rules/orchestrator.md`.

## What this repo is

A framework/template packaging a simulated dev team (PM, Principal, 5 devs,
security engineer, and a dedicated peer reviewer — 8 agents total) plus slash
commands, skills, gates, hooks, a Node CLI (`scripts/claude-team.js`), JSON
schemas for every gate, and 11 pipeline artifact templates. Users install it into
their projects via `bootstrap.sh` or `node scripts/bootstrap.js`. There is no
`src/` in this repo — `src/` is created inside target projects.

## Commands

| Purpose | Command |
|---|---|
| Install dev deps | `npm install` |
| Run all tests (265 tests) | `npm test` |
| Run bootstrap integration tests | `npm run test:integration` |
| Run frontmatter schema tests | `npm run lint:frontmatter` (alias: `npm run test:frontmatter`) |
| Lint JS | `npm run lint` |
| Verify framework health | `npm run doctor` |
| Validate gate schemas | `npm run validate` |
| Parity check | `npm run parity:check` |

CI runs on Node 20 and 22. Bootstrap tests require `rsync` on PATH.

## Key Directories

| Path | Purpose |
|---|---|
| `.claude/agents/` | 8 agent definitions (PM, Principal, 5 devs, reviewer) |
| `.claude/commands/` | 23 slash commands |
| `.claude/skills/` | 6 skill definitions |
| `.claude/rules/` | Pipeline, gate, escalation, coding-principles, retrospective, compaction, orchestrator |
| `.claude/hooks/` | `gate-validator.js`, `approval-derivation.js` |
| `scripts/` | `claude-team.js` CLI + 15 helper scripts |
| `schemas/` | JSON Schema for every pipeline gate (10 files) |
| `templates/` | Canonical pipeline artifact templates (11 files) |
| `examples/tiny-app/` | Minimal Node project for dogfooding bootstrap |
| `tests/` | 265 tests across unit, integration, frontmatter, and CLI suites |

## Conventions

- Commit messages follow Conventional Commits (`feat:`, `fix:`, `refactor:`,
  `docs:`, `chore:`, `test:`).
- Agent/skill markdown files require YAML frontmatter validated by
  `tests/frontmatter.test.js`.
- Tests use `node:test` + `node:assert/strict` — no external runners.
- See `CONTRIBUTING.md` for the full contributor guide.
