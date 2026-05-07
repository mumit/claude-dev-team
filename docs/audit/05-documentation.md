# 05 — Documentation Gaps

## README quality — complete

`README.md` covers prerequisites, install, customisation, the slash-command
table (26 use cases), the automation CLI, project layout with version
markers, and an agent/model table. The known-limitations section is honest.
Two small gaps:

- Does not link `EXAMPLE.md` as the recommended first-read after install.
  A user running `bash bootstrap.sh` then opening Claude doesn't
  necessarily know where to look next; sending them through `EXAMPLE.md`
  would smooth that hand-off. (Finding D-04.)
- Does not mention `.claude/config.example.yml` or that the user must pick
  a `deploy.adapter` value before Stage 8. The first user who runs
  `/pipeline` end-to-end discovers this only at deploy time. (D-04 same
  fix.)

## Component documentation

| Component | Where documented | Quality |
|---|---|---|
| 8 agents | `AGENTS.md`, `.claude/agents/*.md` (frontmatter), README table | good |
| 23 slash commands | README table, each command's frontmatter, `docs/tracks.md` | good |
| 6 skills | `.claude/skills/*/SKILL.md`, mentioned in CONTRIBUTING.md | partial — no master list anywhere |
| 4 deploy adapters | `.claude/adapters/README.md` + per-adapter `.md` | good |
| 7 rules | `.claude/rules/*.md`, cross-linked from commands | good |
| 2 hooks | dense JSDoc in source | good but no `.claude/hooks/README.md` |
| 11 templates | `templates/*.md` files exist on disk; **no list, no purpose-per-template anywhere** | partial |
| 11 JSON schemas | `schemas/*.schema.json` carry no `description` fields | partial |

## API documentation

The framework exposes four de-facto APIs:

1. **Slash commands** — fully documented (frontmatter + README + tracks.md).
2. **Gate JSON contract** — base shape documented in
   `.claude/rules/gates.md`; per-stage extras documented inline. Schemas
   themselves carry no `description` fields. Authors of new gates have to
   reverse-engineer from existing examples.
3. **Agent frontmatter contract** — fully documented (CONTRIBUTING.md +
   tested by `tests/frontmatter.test.js`).
4. **Hook event contract** — explained only in source comments. There is
   no `.claude/hooks/README.md` describing which events fire, what stdin
   they receive, or what exit codes mean for which events. (Finding D-02.)

## Inline documentation

**Dense / good:**
- `.claude/hooks/gate-validator.js` — 27-line top-of-file JSDoc covering
  exit codes, the v2.1 escalation-bypass sweep, lessons-learned format
  validation.
- `.claude/hooks/approval-derivation.js` — ~50 lines of header explaining
  the trigger, REVIEW marker grammar, file-locking model.
- `.claude/rules/pipeline.md` — exhaustive per-stage breakdown with
  read-first / allowed-writes / artefact / template / gate shape.

**Sparse:**
- `schemas/*.schema.json` — zero `description` fields. Anyone writing a
  custom gate must read both the relevant `.claude/rules/*.md` and one or
  two existing gate files in `pipeline/gates/`. (D-01.)
- `templates/*.md` — files exist but no `templates/README.md`. A
  contributor must `ls templates/` and infer purpose from filename.
  (D-03.)

**No three-read code paths observed.** `claude-team.js`, both hooks, and
`bootstrap.js` all read linearly.

## Stale docs

The version matrix is **consistent** (`VERSION` = `2.6.0`,
`package.json.version` = `2.6.0`, README references match). The v2.3 split
of `dev-platform` into `dev-qa` + `security-engineer` is correctly
reflected in every doc file checked. No "v1 commands that no longer exist"
references remain.

One mild anachronism noted in compliance check (C-X), already corrected:
`docs/audit/01-architecture.md` says "invoked by dev-platform at Stage 8"
which is correct (deploy stays with platform after the v2.3 split) but
could mislead a quick reader into thinking QA still runs deploy.

The prior audit at `docs/audit/archive-2026-04-16/` is now stale by
construction; that's expected, and the archive label makes it obvious.

## Onboarding test (new TELUS engineer, 30 minutes, Day 1)

| Time | Action | Friction |
|---|---|---|
| 0–2 min | Clone, read README | Smooth. Version, prereqs, install path clear. |
| 2–5 min | `bash bootstrap.sh ../my-project` | Smooth. Idempotency note in README is reassuring. |
| 5–10 min | Customise stack (skills, agents, deploy) | Mild — README §Customization names the three files but does not link a worked example. |
| 10–15 min | Run `/pipeline "Add login"` | **Friction:** doesn't know what to expect at each checkpoint. README mentions checkpoints but the experience is best understood by reading EXAMPLE.md, which README does not foreground. |
| 15–25 min | Pipeline reaches Stage 5 | **Friction:** the reviewer agent writes a review file; the gate magically updates. The user wants to write their own reviewer feedback but doesn't know that the `REVIEW: APPROVED` / `REVIEW: CHANGES REQUESTED` markers are required. The contract is in `.claude/rules/pipeline.md` Stage 5 and in `templates/review.md`, but not on the path the user is travelling. |
| 25–30 min | Pipeline reaches Stage 8 | **Friction:** if the user did not edit `.claude/config.yml` to choose a `deploy.adapter`, Stage 8 escalates. README mentions adapters but does not show the YAML one-liner the user needs. |

### Recommended fixes for onboarding

- README: add a "First 30 minutes" section pointing the reader at
  `EXAMPLE.md` and at the adapter config one-liner. (D-04.)
- New `.claude/hooks/README.md` so a contributor adding a hook has a
  reference point. (D-02.)
- New `templates/README.md` listing the 11 templates and their
  one-line purposes. (D-03.)
- Add `description` fields to `schemas/*.schema.json` so a gate-author
  sees field purpose in their editor's schema-aware tooling. (D-01.)

## Doc strengths (preserve)

- **Version markers throughout** (`(v2.3+)`, `(v2.4+)`, `(v2.6+)`) keep
  doc files honest about when features arrived.
- **Per-release deep-dives** (`docs/releases/v2.x.md`) give upgrade-time
  readers exactly the right granularity.
- **Migration guide** at `docs/migration/v1-to-v2.md` exists and is
  accurate.
- **Hooks self-document via JSDoc** rather than relying on external
  prose; the source is the source of truth.
- **Conventions enforced by tests** (frontmatter, parity, gate JSON)
  prevent docs from drifting into fiction.
