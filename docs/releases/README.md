# Release notes

Consumer-facing release notes, one file per tagged release. These are the
source of truth for what each release contains — GitHub Releases on the
repo mirror the same text.

## Why these exist separately from CHANGELOG.md

`CHANGELOG.md` is the technical log — every addition, change, and breaking
change across every release, in one scrollable file, for engineers doing
audit diffs. Good for `git log v2.1.0..v2.3.0 -- CHANGELOG.md`.

The files here are the **per-release narrative**: what the release does,
what it breaks, where to go for migration detail. Each is tight enough to
paste into a GitHub Release body, a Slack announcement, or an email to
stakeholders. They reference `CHANGELOG.md` and
`docs/migration/v1-to-v2.md` for the long form.

When the two drift, `CHANGELOG.md` is authoritative for technical detail;
the files here are authoritative for framing.

## Index

| Release | Date | One-line scope |
|---|---|---|
| [v2.6.0](v2.6.0.md) | 2026-05-01 | Automation layer: `scripts/claude-team.js` CLI + 15 helpers, JSON schemas, templates, `examples/tiny-app`, reviewer agent, 265-test suite |
| [v2.5.1](v2.5.1.md) | 2026-04-23 | `/nano` track + 4 correctness fixes (Stage 9 retro, Stage 5 scoped gate pre-creation, security heuristic, compaction) + perf |
| [v2.5.0](v2.5.0.md) | 2026-04-21 | Budget gate + PATTERN review tag + lesson auto age-out + async checkpoints — v2.x stack complete |
| [v2.4.0](v2.4.0.md) | 2026-04-21 | Deployment-adapter seam (`.claude/adapters/`) + runbook requirement at Stage 8 |
| [v2.3.1](v2.3.1.md) | 2026-04-21 | Scoped peer review + approval-derivation hook (closes self-approval hole) |
| [v2.3.0](v2.3.0.md) | 2026-04-21 | `dev-qa` split from `dev-platform`; `security-engineer` with Stage 4.5b veto; Stage 4.5a pre-review gate |
| [v2.2.0](v2.2.0.md) | 2026-04-21 | Brief/spec template expansion (rollback, FF, migration, observability, SLO, cost) + Stage 7 auto-fold |
| [v2.1.0](v2.1.0.md) | 2026-04-21 | Gate-validator hardening (bypassed escalations, retry integrity, track advisory, lessons-learned format validation) |
| [v2.0.0](v2.0.0.md) | 2026-04-21 | Lightweight tracks (`/quick`, `/config-only`, `/dep-update`) + scope routing |
| [v1.0.0](v1.0.0.md) | 2026-04-17 | Pre-v2 baseline — 9-stage pipeline, gate validator, retrospective, lessons-learned |

## Conventions

Each release-notes file follows the same shape:

1. **Lead paragraph** — one sentence naming what the release does
2. **Highlights** — 2–5 bullets, concrete
3. **Breaking** — what existing consumers must change, explicit
4. **Migration pointer** — one-line link to the right section of
   `docs/migration/v1-to-v2.md`
5. **Tests / footnote** — test counts or other meta as a quick trust signal

Release files do not get updated after publishing. If a change corrects a
release note, that correction lives in `CHANGELOG.md` under a later
release's entry — the file here stays as-shipped for historical audit.

## Posting to GitHub Releases

```bash
for v in v1.0.0 v2.0.0 v2.1.0 v2.2.0 v2.3.0 v2.3.1 v2.4.0 v2.5.0; do
  gh release create "$v" \
    --repo mumit/claude-dev-team \
    --title "$v" \
    --notes-file "docs/releases/$v.md"
done

# Flag v2.5.0 as the "Latest release" badge on the repo homepage
gh release edit v2.5.0 --repo mumit/claude-dev-team --latest
```

## Drafting a new release file

For the next release:

1. Create `docs/releases/vX.Y.Z.md` following the conventions above
2. Add a row to the Index table above (keep in reverse chronological order)
3. Include the release under `## [X.Y.Z] - YYYY-MM-DD` in `CHANGELOG.md`
4. Bump `VERSION` at repo root
5. Bump `framework.version` in `.claude/config.yml` (should match `VERSION`)
6. Tag the merge commit and publish the GitHub Release using the file as
   `--notes-file`
