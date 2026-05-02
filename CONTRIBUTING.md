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
npm test                    # all tests (265 pass — unit, integration, frontmatter, CLI, schemas, release, status)
npm run test:integration    # integration tests (bootstrap.sh)
npm run test:frontmatter    # YAML frontmatter schema tests for agents/skills
npm run doctor              # verify all framework files are present (PASS/FAIL per file)
npm run validate            # validate all pipeline gate files against JSON schemas
npm run parity:check        # deep parity check — commands, rules, skills, reviewer, schemas, helpers
```

All tests use Node's built-in `node:test` runner — no external test framework needed.

> Note: `npm run lint:frontmatter` is a historical alias for `test:frontmatter` —
> both run the same frontmatter schema test file. The `lint:` prefix predates
> the test-runner rename; prefer `test:frontmatter` in new docs.

## Project Structure

This is a **framework/template**, not an application. There is no `src/` directory in the repo itself — `src/` is created by `bootstrap.sh` (or `node scripts/bootstrap.js`) when installing into a target project.

The key components:

| Path | Purpose |
|------|---------|
| `.claude/agents/` | 8 agent definitions (PM, Principal, 5 devs, reviewer) |
| `.claude/commands/` | 23 slash commands (`/pipeline`, `/status`, etc.) |
| `.claude/skills/` | 6 shared skill definitions (conventions, checklists) |
| `.claude/rules/` | 7 rule files: pipeline, gates, escalation, coding-principles, retrospective, compaction, orchestrator |
| `.claude/hooks/` | `gate-validator.js`, `approval-derivation.js` |
| `scripts/` | `claude-team.js` CLI + 15 helper scripts (status, gate-validator, approval-derivation, security-heuristic, etc.) |
| `schemas/` | JSON Schema for every pipeline gate (`gate.schema.json` + `stage-01` through `stage-09`) |
| `templates/` | 11 canonical pipeline artifact templates (brief, design-spec, runbook, adr, review, etc.) |
| `examples/tiny-app/` | Minimal Node project for dogfooding bootstrap and pipeline commands |
| `pipeline/` | Runtime pipeline state (gates, context, artifacts) — created in target projects |
| `bootstrap.sh` / `scripts/bootstrap.js` | Installs the framework into an existing project |

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

Both `bootstrap.sh` and `scripts/bootstrap.js` copy the framework into an
existing project. They produce identical output. If you modify either:

- Test with `npm run test:integration`
- Verify it runs on both macOS and Linux (CI covers both)
- It must be idempotent — running twice should not break anything
- `.claude/` is overwritten on every run (framework-owned)
- `CLAUDE.md` is created only if missing (project-owned)
- `*.local.*` files and `settings.local.json` are always preserved

## Adding a New Command, Skill, or Agent

See [`docs/concepts.md`](docs/concepts.md) for what each of these means.
Frontmatter is validated by `tests/frontmatter.test.js` — run
`npm run test:frontmatter` after adding or editing any of them.

### Add a new slash command

1. Create `.claude/commands/<name>.md`.
2. Frontmatter requires a `description`:
   ```yaml
   ---
   description: >
     One or two sentences describing what the command does and when to
     use it. Shown in Claude Code's command picker.
   ---
   ```
3. The body is markdown instructions the orchestrator executes. Reference
   rule files (`.claude/rules/*.md`) rather than duplicating definitions.
4. If the command should update `AGENTS.md`'s command table, add a row.
5. Test: `npm test` must pass. Invoke the command locally (`claude`, then
   `/<name>`) before committing.

**Common pitfalls**: forgetting the `description` field (frontmatter
test will fail); hard-coding stage semantics instead of pointing at
`.claude/rules/pipeline.md`; writing shell commands in the body without
noting the agent is expected to run them.

### Add a new skill

1. Create `.claude/skills/<name>/SKILL.md`.
2. Frontmatter requires `name` and `description`:
   ```yaml
   ---
   name: my-skill
   description: "One long sentence that includes the trigger phrases a user might say. Skills are selected by description match, so list the aliases ('fix the bug', 'resolve this issue', etc.) explicitly."
   ---
   ```
3. The body is the procedure itself — phases, checklists, examples.
4. If the skill is meant for a specific agent, reference it by name in
   that agent's `skills:` frontmatter list.
5. Test: `npm run test:frontmatter` must pass.

**Common pitfalls**: terse `description` that misses the trigger
phrases a user would actually say (skills won't match); putting
executable instructions in the skill that belong in a command instead
(skills are read by agents, commands are invoked by users).

### Add a new agent

1. Create `.claude/agents/<name>.md`.
2. Frontmatter requires `name`, `description`, `tools`, and `model`:
   ```yaml
   ---
   name: dev-example
   description: >
     Use for X. Also use for Y during stage Z.
   tools: Read, Write, Edit, Glob, Grep, Bash
   model: sonnet
   permissionMode: acceptEdits
   skills:
     - code-conventions
     - review-rubric
   ---
   ```
3. The body is the agent's system prompt: role, working rules, output
   format, any area-specific gates.
4. If the agent is part of the core team referenced by the pipeline,
   update `.claude/rules/orchestrator.md`, `AGENTS.md`, and `README.md`.
   Also run `npm run parity:check` — it verifies the reviewer agent is
   present and agent prompts meet minimum line counts.
5. Test: `npm run test:frontmatter` must pass. A full pipeline run is
   the end-to-end smoke test.

**Common pitfalls**: choosing `opus` by default — prefer `sonnet` for
execution agents and reserve `opus` for judgment roles (PM, Principal);
forgetting the `tools:` allowlist (agent falls back to no tools);
duplicating content between dev agents — Claude Code does not yet
support `imports:` / `extends:`, so keep the shared surface minimal.
