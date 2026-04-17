# Project Instructions

This repository is the **`claude-dev-team` framework** itself, not a target
project that consumes it. Rules for working on *this* codebase live here;
framework orchestrator rules live in `.claude/rules/orchestrator.md`.

## What this repo is

A framework/template packaging a simulated dev team (PM, Principal, 3 devs)
plus slash commands, skills, gates, and hooks. Users install it into their
projects via `bootstrap.sh`. There is no `src/` in this repo — `src/` is
created inside target projects.

## Commands

| Purpose | Command |
|---|---|
| Install dev deps | `npm install` |
| Run all tests | `npm test` |
| Run bootstrap integration tests | `npm run test:integration` |
| Run frontmatter schema tests | `npm run lint:frontmatter` (alias: `npm run test:frontmatter`) |
| Lint JS | `npm run lint` |

CI runs on Node 20 and 22. Bootstrap tests require `rsync` on PATH.

## Conventions

- Commit messages follow Conventional Commits (`feat:`, `fix:`, `refactor:`,
  `docs:`, `chore:`, `test:`).
- Agent/skill markdown files require YAML frontmatter validated by
  `tests/frontmatter.test.js`.
- Tests use `node:test` + `node:assert/strict` — no external runners.
- See `CONTRIBUTING.md` for the full contributor guide.
