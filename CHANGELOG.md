# Changelog

All notable changes to the `claude-dev-team` framework are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
the project follows [Semantic Versioning](https://semver.org/).

Per-release detail lives in [`docs/releases/`](docs/releases/). This file
is the index and the rolling `[Unreleased]` pointer — it stays thin so
`git log` diffs between tags are readable. Consumer-facing narrative,
GitHub Release bodies, and breaking-change detail live in the release
files.

## v2.x release map

| Release | Date | Release notes | Scope |
|---|---|---|---|
| v2.5.0 | 2026-04-21 | [docs/releases/v2.5.0.md](docs/releases/v2.5.0.md) | Budget gate + PATTERN review tag + lesson auto age-out + async-friendly checkpoints — v2.x stack complete |
| v2.4.0 | 2026-04-21 | [docs/releases/v2.4.0.md](docs/releases/v2.4.0.md) | Deployment-adapter seam (`.claude/adapters/`) + runbook requirement at Stage 8 |
| v2.3.1 | 2026-04-21 | [docs/releases/v2.3.1.md](docs/releases/v2.3.1.md) | Scoped peer review + approval-derivation hook (closes self-approval hole) |
| v2.3.0 | 2026-04-21 | [docs/releases/v2.3.0.md](docs/releases/v2.3.0.md) | `dev-qa` agent split from `dev-platform`; `security-engineer` with Stage 4.5b veto; Stage 4.5a pre-review gate |
| v2.2.0 | 2026-04-21 | [docs/releases/v2.2.0.md](docs/releases/v2.2.0.md) | Brief/spec template expansion (rollback, FF, migration, observability, SLO, cost) + Stage 7 auto-fold |
| v2.1.0 | 2026-04-21 | [docs/releases/v2.1.0.md](docs/releases/v2.1.0.md) | Gate-validator hardening (bypassed escalations, retry integrity, track advisory, lessons-learned format validation) |
| v2.0.0 | 2026-04-21 | [docs/releases/v2.0.0.md](docs/releases/v2.0.0.md) | Lightweight tracks (`/quick`, `/config-only`, `/dep-update`) + scope routing |
| v1.0.0 | 2026-04-17 | [docs/releases/v1.0.0.md](docs/releases/v1.0.0.md) | Pre-v2 baseline — 9-stage pipeline, gate validator, retrospective, lessons-learned |

All seven v2.x releases shipped in one burst — the per-release granularity
exists because each is a reviewable chunk with its own breaking-change
scope, not because they rolled out over time.

Full upgrade guide: [`docs/migration/v1-to-v2.md`](docs/migration/v1-to-v2.md).

---

## [Unreleased]

### Added
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

### Changed
- **CHANGELOG restructured** to a thin index. Per-release detail moved
  to `docs/releases/vX.Y.Z.md` to give one source of truth per
  release. The previous structure had per-release sections here with
  substantial overlap with the new release files — drift risk — so
  this file now just points at them.

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

[Unreleased]: https://github.com/mumit/claude-dev-team/compare/v2.5.0...HEAD
[2.5.0]: https://github.com/mumit/claude-dev-team/compare/v2.4.0...v2.5.0
[2.4.0]: https://github.com/mumit/claude-dev-team/compare/v2.3.1...v2.4.0
[2.3.1]: https://github.com/mumit/claude-dev-team/compare/v2.3.0...v2.3.1
[2.3.0]: https://github.com/mumit/claude-dev-team/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/mumit/claude-dev-team/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/mumit/claude-dev-team/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/mumit/claude-dev-team/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/mumit/claude-dev-team/releases/tag/v1.0.0
