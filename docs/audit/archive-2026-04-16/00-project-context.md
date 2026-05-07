# 00 — Project Context

## What this project is

`claude-dev-team` is a **framework / template**, not a runtime application. It packages a structured software-development workflow that runs *inside* Claude Code: a simulated PM, Principal Engineer, and three specialist developers, plus slash commands, skills, gates, and hooks that orchestrate them. Users install it into a target project via `bootstrap.sh` and then invoke commands like `/pipeline`, `/audit`, or the `implement` skill.

The repo itself contains no `src/` — that directory is created inside target projects by `bootstrap.sh`. What lives in this repo is the framework definition (markdown + a little Node.js).

## Languages and frameworks

| Role | Language / Tool | Where |
|---|---|---|
| Agent / command / skill definitions | Markdown + YAML frontmatter | `.claude/agents/`, `.claude/commands/`, `.claude/skills/`, `.claude/rules/`, `.claude/references/` |
| Gate validation hook | Node.js (CommonJS) | `.claude/hooks/gate-validator.js` |
| Tests | Node.js `node:test` + `node:assert/strict` | `tests/` |
| Presentation builder | Node.js (CommonJS) + `pptxgenjs` + React SSR + `sharp` | `docs/build-presentation.js` |
| Bootstrap installer | Bash | `bootstrap.sh` |
| CI | GitHub Actions | `.github/workflows/test.yml` |
| Lint | ESLint 9 (flat config) | `eslint.config.js` |

Node engine: CI matrix runs **Node 20 and 22**. `package.json` has `"private": true` and no `engines` field.

## Build system and dependency manager

- **npm** is the package manager (`package-lock.json` committed).
- `package.json` is thin: no runtime deps — all seven packages are `devDependencies` (`eslint`, `@eslint/js`, `globals`, `pptxgenjs`, `react`, `react-dom`, `react-icons`, `sharp`).
- There is no build step for the framework itself. The only script with a build nature is `docs/build-presentation.js`, which emits `claude-dev-team-lifecycle.pptx` and is excluded from git.

## Exact commands

| Purpose | Command |
|---|---|
| Install deps | `npm install` |
| Run all tests | `npm test` (runs `node --test 'tests/**/*.test.js'`) |
| Run bootstrap integration tests only | `npm run test:integration` |
| Run frontmatter validation only | `npm run lint:frontmatter` |
| Lint JS | `npm run lint` (runs `eslint .`) |
| Install into a target project | `bash bootstrap.sh /path/to/target` |
| Build presentation deck | `node docs/build-presentation.js` |
| Run framework (end user) | `claude` in a target project, then `/pipeline`, `/audit`, etc. |

System prerequisites for running the bootstrap / tests: **Node.js 20+, git, rsync, bash**. Tests shell out to `bash bootstrap.sh`, which invokes `rsync`; without rsync, 15 integration tests fail. The CI workflow installs rsync explicitly (`sudo apt-get install -y rsync`).

## Deployment target

Not applicable — the framework is not deployed. Users install it locally via `bootstrap.sh`. The simulated `dev-platform` agent's deploy stage targets `docker compose` inside the *user's* project; nothing here runs in production.

## Conventions — documented vs. implied

**Documented** (checked into repo):
- `CONTRIBUTING.md`: branch → `npm test` → add tests in `tests/*.test.js` → PR.
- `.claude/skills/code-conventions/SKILL.md`: kebab-case filenames, camelCase JS identifiers, no magic numbers, tests next to source, parameterised SQL, no secrets. Aimed at generated code in target projects, not at this repo's own JS — but the framework's own JS mostly follows it.
- `.claude/skills/api-conventions/SKILL.md`, `security-checklist/SKILL.md`, `review-rubric/SKILL.md`: apply to generated code.
- `.claude/rules/pipeline.md`, `gates.md`, `escalation.md`, `orchestrator.md`, `compaction.md`: hard rules for agent orchestration.
- `.claude/references/audit-phases.md`: formal audit phase definition.

**Implied / undocumented**:
- Every agent `.md` has YAML frontmatter with `name, description, tools, model, permissionMode` — enforced by `tests/frontmatter.test.js`.
- Skills live in `.claude/skills/<name>/SKILL.md`.
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`) — 100% adherence across 38 commits.
- PRs are squash-merged via GitHub (`Merge pull request #N from <branch>`).
- Test files use `node:test` (`describe`, `it`) + `node:assert/strict`, no external runner — codified in `CONTRIBUTING.md`.
- Line-ending / editor config: none (no `.editorconfig`).
- Emoji in shell output (`🤖`, `✅`, `❌`, `✋`) is common throughout bootstrap + command definitions.

## Codebase size

- **70 tracked files** (excluding `node_modules`, `.git`).
- **~8.6k total lines** across markdown + JS + JSON + YAML + shell. `docs/build-presentation.js` alone is 686 lines (~8% of total).
- Markdown dominates: agent/command/skill definitions, rules, audit output, docs.
- JS surface area is tiny:
  - `gate-validator.js` — 90 lines
  - `docs/build-presentation.js` — 686 lines
  - `eslint.config.js` — 19 lines
  - 4 test files — ~660 lines total
- Shell: `bootstrap.sh` — 168 lines.

**Module/service count**: one top-level framework. Logically it has three internal planes — `.claude/` (the framework), `tests/` (Node tests), `docs/` (lifecycle docs + presentation + audit output).

## Monorepo?

**No.** Single framework repo. The `src/backend`, `src/frontend`, `src/infra` split lives inside *target* projects, not here.

## Surprises & open questions

1. **`docs/build-presentation.js` is a large, stack-heavy subsystem** (686 lines, pulls React + sharp + pptxgenjs into devDeps) that only produces a marketing deck. Its only test is a `node --check` syntax smoke test. It's an outlier in scope relative to the rest of the repo.
2. **ESLint 9 flat config, but no rules beyond `js.configs.recommended`.** Effectively a stub lint config.
3. **`npm run lint:frontmatter` script exists** but is just an alias to run one test file — it doesn't add a dedicated "lint" role. Could be confusing.
4. **`tests/bootstrap.test.js` requires `rsync`** at runtime and has no platform guard. On a machine without rsync, 15 tests fail with non-obvious errors (the failure mode is stderr from `bash bootstrap.sh` being swallowed into the assertion trace).
5. **`package-lock.json` is committed (64 KB) but `node_modules/` is not** — normal, but means `bash bootstrap.sh` alone can't make the tests runnable; you need `npm install` first. This isn't documented in `README.md`'s "First-time Setup".
6. **`CLAUDE.md` is nearly empty** (5 lines of comments). Project-specific instructions for this repo itself aren't captured; the framework rules live under `.claude/rules/`, which is the framework's own territory.
7. **Two prior audits are already on disk** (`docs/audit/*.md` + `health-check-2026-04.md`). This audit is a re-run after the April 2026 health-check changes.
