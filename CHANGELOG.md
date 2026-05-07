# Changelog

All notable changes to the `claude-dev-team` framework are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
the project follows [Semantic Versioning](https://semver.org/).

Per-release detail lives in [`docs/releases/`](docs/releases/). This file
is the index and the rolling `[Unreleased]` pointer — it stays thin so
`git log` diffs between tags are readable. Consumer-facing narrative,
GitHub Release bodies, and breaking-change detail live in the release
files.

## [Unreleased]

Audit-driven hardening run from 2026-05-07 (refresh of the 2026-04-16
audit; see `docs/audit/`). Twenty-eight commits closing all twenty-seven
roadmap items across Batches 1–4. No backwards-incompatible changes for
projects already on v2.6.0; bootstrap re-run picks up everything safely.

### Added
- `scripts/budget.js` (B-11) and `scripts/visualize.js` (B-12) ported
  from codex-dev-team. New CLI subcommands `budget`, `visualize`, and
  `checkpoint` (B-24, async-checkpoint conditional auto-pass).
- `scripts/stoplist.js` (B-13) — pre-flight regex check that refuses
  `/quick`, `/nano`, `/config-only`, `/dep-update` on stoplist matches
  (auth, crypto, PII, payments, migrations, feature flags). `--force`
  bypasses for false positives.
- Opt-in `LOG_FORMAT=json` structured event mode for both hooks (B-23).
  Schema in `.claude/hooks/README.md` (also new — B-6).
- `templates/README.md` cataloguing the eleven artefact templates (B-5).
- `docs/adr/0001-pipeline-agent-bilateral-coupling.md` (B-27) — first
  framework-level ADR.
- 145 new test assertions (265 → 410): hook byte-parity (B-1), gate-validator
  filesystem error branching (B-3), config.yml version drift (B-19),
  schema descriptions (B-4), stoplist patterns (B-13), budget tracker
  (B-11), concurrency (B-14), security-heuristic table (B-15), slash↔CLI
  parity (B-9), adapter contract (B-18), visualize (B-12), settings hook
  commands (B-20), file-size caps (B-16), checkpoint auto-pass (B-24),
  cross-validator behavioural parity vs codex (B-25), structured-log mode
  (B-23).

### Changed
- `.claude/rules/pipeline.md` (548 lines) split into three sub-files
  (B-21): `pipeline-tracks.md` (Stage 0), `pipeline-core.md` (Stages 1, 2,
  3, 9 + duration), `pipeline-build.md` (Stages 4–8). `pipeline.md` is
  now a thin index. Existing references in agent prompts and command
  files remain conceptually accurate.
- `scripts/claude-team.js` dispatch refactored from a 32-branch if-chain
  to a `COMMANDS` object map (B-17). Behaviour unchanged.
- `tests/_framework-contract.js` extracted as the single source of truth
  for COMMANDS, RULES, SKILLS, ADAPTERS, STAGE_NUMBERS, STAGE_SCHEMAS,
  HELPER_SCRIPTS used by three test files (B-10).
- `Bash(curl *)` permission narrowed to localhost http(s) with optional
  flag prefix (B-2).
- `gate-validator.js` distinguishes filesystem error classes — `EACCES`,
  `EPERM`, `ENOTDIR`, `EISDIR`, `EROFS` exit 1 instead of silent PASS
  (B-3, S-03).
- `release.js check` now also verifies `.claude/config.yml`
  framework.version against the repo `VERSION` file (B-19).
- `approval-derivation.js` lock retry replaced busy-spin with
  `Atomics.wait` (B-22) — no CPU during contention.
- Hook command shim in `.claude/settings.json` upgraded from
  `git rev-parse --show-toplevel` to a three-tier fallback chain
  `${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}`
  (B-20). Hooks now run cleanly in non-git checkouts.
- `docs/build-presentation.js` moved to `scripts/build-presentation.js`
  (B-26). `docs/` now holds prose only.
- README gains a "First 30 Minutes" onboarding section linking
  `EXAMPLE.md`, the adapter one-liner, and the Stage 5 reviewer marker
  grammar (B-7).

### Fixed
- Both hooks now cap untrusted file reads at 1 MB (B-16, S-05) — gate
  files, review markdown, and the embedded gate read in
  approval-derivation. Oversize input no longer OOMs the hook.
- Lock-tuning constants in `approval-derivation.js` carry rationale
  comments (B-8) — 600 ms total wait window explained.
- Schema property descriptions added across all eleven gate schemas
  (B-4, D-01).

### Documentation
- `.claude/hooks/README.md` (new — B-6) documents hook events, exit
  codes, structured-log schema, and the project-root resolution chain.
- `templates/README.md` (new — B-5) catalogues all eleven templates.
- All eleven `schemas/*.schema.json` carry top-level + per-property
  `description` fields (B-4).

## v2.x release map

| Release | Date | Release notes | Scope |
|---|---|---|---|
| v2.6.0 | 2026-05-01 | [docs/releases/v2.6.0.md](docs/releases/v2.6.0.md) | Automation layer: `scripts/claude-team.js` CLI + 15 helpers, 10 JSON schemas, 11 templates, `examples/tiny-app`, reviewer agent, 265-test suite |
| v2.5.1 | 2026-04-23 | [docs/releases/v2.5.1.md](docs/releases/v2.5.1.md) | `/nano` track + correctness fixes (Stage 9 retro, Stage 5 scoped gate, security heuristic, compaction) + perf |
| v2.5.0 | 2026-04-21 | [docs/releases/v2.5.0.md](docs/releases/v2.5.0.md) | Budget gate + PATTERN review tag + lesson auto age-out + async-friendly checkpoints — v2.x stack complete |
| v2.4.0 | 2026-04-21 | [docs/releases/v2.4.0.md](docs/releases/v2.4.0.md) | Deployment-adapter seam (`.claude/adapters/`) + runbook requirement at Stage 8 |
| v2.3.1 | 2026-04-21 | [docs/releases/v2.3.1.md](docs/releases/v2.3.1.md) | Scoped peer review + approval-derivation hook (closes self-approval hole) |
| v2.3.0 | 2026-04-21 | [docs/releases/v2.3.0.md](docs/releases/v2.3.0.md) | `dev-qa` agent split from `dev-platform`; `security-engineer` with Stage 4.5b veto; Stage 4.5a pre-review gate |
| v2.2.0 | 2026-04-21 | [docs/releases/v2.2.0.md](docs/releases/v2.2.0.md) | Brief/spec template expansion (rollback, FF, migration, observability, SLO, cost) + Stage 7 auto-fold |
| v2.1.0 | 2026-04-21 | [docs/releases/v2.1.0.md](docs/releases/v2.1.0.md) | Gate-validator hardening (bypassed escalations, retry integrity, track advisory, lessons-learned format validation) |
| v2.0.0 | 2026-04-21 | [docs/releases/v2.0.0.md](docs/releases/v2.0.0.md) | Lightweight tracks (`/quick`, `/config-only`, `/dep-update`) + scope routing |
| v1.0.0 | 2026-04-17 | [docs/releases/v1.0.0.md](docs/releases/v1.0.0.md) | Pre-v2 baseline — 9-stage pipeline, gate validator, retrospective, lessons-learned |

All v2.x releases shipped in one burst — the per-release granularity
exists because each is a reviewable chunk with its own breaking-change
scope, not because they rolled out over time.

Full upgrade guide: [`docs/migration/v1-to-v2.md`](docs/migration/v1-to-v2.md).
v2.6 migration: see the [v2.6.0 release notes](docs/releases/v2.6.0.md) — no
breaking changes; automation layer is purely additive.

---

## [Unreleased]

No unreleased changes.

---

## v2.6.0 — 2026-05-01

Automation layer — `scripts/claude-team.js` + helper scripts, JSON schemas,
templates, examples, and a dedicated reviewer agent. All additive; no
slash-command behavior changed.

**Version decision:** v2.6.0 (not v3). The automation surface is opt-in — slash
commands remain authoritative for Claude Code users; the CLI is the integration
layer for CI and non-Claude environments. No pipeline stage semantics, gate
schemas, or adapter contracts changed. A major-version bump (v3) is reserved for
a philosophical shift in pipeline operation — this release adds a parallel
surface, not a replacement.

### Added
- `scripts/claude-team.js` — Node CLI dispatcher (mirrors all 23 slash commands
  as subcommands; adds `status`, `doctor`, `validate`, `next`, `autofold`,
  `roadmap`, `lessons`, `summary`, `review`, `security`, `runbook`)
- 15 helper scripts: `approval-derivation.js`, `audit.js`, `bootstrap.js`,
  `consistency.js`, `gate-validator.js`, `lessons.js`, `lint-syntax.js`,
  `parity-check.js`, `pr-pack.js`, `release.js`, `roadmap.js`,
  `runbook-check.js`, `security-heuristic.js`, `status.js`, `summary.js`
- `schemas/` — JSON Schema for every pipeline gate: `gate.schema.json` plus
  `stage-01` through `stage-09`; includes `stage-04a.schema.json` covering
  the Stage 4.5a pre-review gate
- `templates/` — 11 scaffold stubs used by `pipeline:scaffold`: `brief-template.md`,
  `design-spec-template.md`, `runbook-template.md`, `adr-template.md`,
  `build-template.md`, `clarification-template.md`, `pre-review-template.md`,
  `pr-summary-template.md`, `retrospective-template.md`, `review-template.md`,
  `test-report-template.md`. These are thin scaffolds distinct from the
  detailed reference docs in `docs/*-template.md` — both sets are canonical
  and serve different purposes (scaffolding vs. agent guidance).
- `examples/tiny-app/` — minimal Node project for dogfooding `bootstrap.sh`
  and pipeline commands
- `.claude/agents/reviewer.md` — dedicated Stage 5 peer-reviewer agent (READ-ONLY;
  sonnet model; tools: Read, Write, Glob, Grep; writes only to
  `pipeline/code-review/by-<role>.md`). Replaces the ad-hoc review pass
  embedded in dev-* agents
- 50+ npm script shims in `package.json` mapping `npm run <command>` to
  `node scripts/claude-team.js <command>`
- Test suite expanded from 30 to 265 tests: gate schema validation,
  helper-script unit tests, CLI subcommand tests, parity check, status
  readiness, release helper, and presentation builder

### Changed
- `docs/parity/claude-dev-team-parity.md` — updated to reflect Codex automation
  surface and clarify stage-numbering divergence (Claude uses 4.5a/4.5b; Codex
  collapses to a single pre-review step)
- `AGENTS.md`, `README.md`, `CLAUDE.md`, `CONTRIBUTING.md` — all updated to
  document the 8-agent team, CLI surface, and new repo layout

### Breaking

None. Gate schemas, adapter contracts, agent file-permission scopes, and
slash-command behavior are unchanged. The reviewer agent is additive — existing
pipelines that embed review in dev-* agents continue to work.

---

## v2.5.1 — 2026-04-23 (was [Unreleased])

### Added
- `/nano` track — new zero-ceremony command for trivial single-file changes
  (doc edits, comment typos, dead imports). No brief, no review, no deploy.
  Stages 0 → 4 → 6 (regression check) → 7 (auto-fold). Appends to
  `## Fix Log` in `pipeline/context.md`.
- `VERSION` file at the repo root. Bootstrap stamps `.claude/VERSION`
  in target projects so an installed framework can report its version
  via `cat .claude/VERSION`.
- `framework.version` in `.claude/config.yml` kept in sync with
  `VERSION` at every release.
- Per-release narrative files under [`docs/releases/`](docs/releases/).
  Each tagged release has its own file — the source of truth for what
  the release contains, suitable for copy-paste into the GitHub
  Release UI.
- Bootstrap integration tests covering the `.claude/VERSION` stamp,
  stale-VERSION refresh on re-install, and `framework.version`
  consistency with the repo `VERSION` file.
- `/hotfix` Stage 9 section — abbreviated single-dev retro (zero
  promotion limit; parallel contribution pass skipped). The section was
  described in `retrospective.md` but absent from `hotfix.md`.

### Fixed
- **Stage 9 retro contribution** — `pipeline.md` Step 9a was missing
  `dev-qa` and `security-engineer` from the parallel contribution pass.
  Gate schema and `retrospective.md` already listed them; this aligns
  the orchestrator instructions.
- **Stage 5 scoped review** — orchestrator must pre-create
  `pipeline/gates/stage-05-{area}.json` with `required_approvals: 1`
  and `review_shape: "scoped"` before invoking the reviewer.
  `approval-derivation.js` defaults newly-created gates to
  `required_approvals: 2`; without pre-creation, a single scoped
  approval never flips the gate to PASS.
- **Stage 4.5b heuristic narrowed** — condition 3 (Docker/Compose) now
  requires a service image, network, or volume change; condition 4
  (`src/infra/`) replaced the broad path catch-all with specific
  security-relevant patterns. Port-number and healthcheck-interval
  changes no longer trigger a security review.
- **Compaction** — Stage 5 review round counter per area is now listed
  as state to preserve in `compaction.md`. Losing it after compaction
  resets the two-round limit.

### Changed
- **CHANGELOG restructured** to a thin index. Per-release detail moved
  to `docs/releases/vX.Y.Z.md` to give one source of truth per
  release. The previous structure had per-release sections here with
  substantial overlap with the new release files — drift risk — so
  this file now just points at them.

### Performance
- Removed per-write lint hook from `dev-backend`, `dev-frontend`,
  `dev-platform`, and `dev-qa` agent frontmatter. Lint now runs only
  in Stage 4.5a (the correct scope).

---

## Pre-v1 history

Tracked in [`pipeline/context.md`](pipeline/context.md) under `## Fix Log`.
Those entries cover batches through the first four rounds of improvements
(2026-04-09 through 2026-04-17) and remain there for audit. New entries
land in this file and the release notes from `v2.0.0` forward.

---

## How to add a new release entry

1. Create `docs/releases/vX.Y.Z.md` following the shape in
   [`docs/releases/README.md`](docs/releases/README.md).
2. Add a row to the release map table above (reverse chronological).
3. Move the relevant `[Unreleased]` entries into the release file,
   leaving `[Unreleased]` empty or listing only changes not yet
   released.
4. Bump `VERSION` at repo root and `framework.version` in
   `.claude/config.yml` (they must match).
5. Tag the merge commit `vX.Y.Z` and publish the GitHub Release with
   `gh release create vX.Y.Z --notes-file docs/releases/vX.Y.Z.md`.

---

## Version-compare links

[Unreleased]: https://github.com/mumit/claude-dev-team/compare/v2.6.0...HEAD
[2.6.0]: https://github.com/mumit/claude-dev-team/compare/v2.5.1...v2.6.0
[2.5.1]: https://github.com/mumit/claude-dev-team/compare/v2.5.0...v2.5.1
[2.5.0]: https://github.com/mumit/claude-dev-team/compare/v2.4.0...v2.5.0
[2.4.0]: https://github.com/mumit/claude-dev-team/compare/v2.3.1...v2.4.0
[2.3.1]: https://github.com/mumit/claude-dev-team/compare/v2.3.0...v2.3.1
[2.3.0]: https://github.com/mumit/claude-dev-team/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/mumit/claude-dev-team/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/mumit/claude-dev-team/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/mumit/claude-dev-team/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/mumit/claude-dev-team/releases/tag/v1.0.0
