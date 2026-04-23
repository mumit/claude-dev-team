# Pipeline tracks

The framework ships five tracks. `/pipeline` is the default; the other four
shave stages off when the change doesn't justify the full ceremony. Track
choice is explicit — the orchestrator never auto-downgrades a full-pipeline
request without asking.

## Track map

| Track | Command | Typical duration | When it fits |
|---|---|---|---|
| **Full** | `/pipeline` | 30–90 min | Feature-sized work: multi-area, API/schema changes, new surfaces, anything on the safety stoplist |
| **Quick** | `/quick` | 5–10 min | Single area, ≤ ~100 LOC, no new dependency/surface/schema, nothing on the safety stoplist |
| **Nano** | `/nano` | 1–3 min | At most two files, zero runtime behaviour change: doc edits, comment typos, dead imports |
| **Config-only** | `/config-only` | 3–8 min | Diff is 100% config (env vars, flag toggles, compose values, `.env.example`) |
| **Dep update** | `/dep-update` | 5–15 min | Package upgrade (npm, pip, gem, etc.) with at most the minimum code changes |
| **Hotfix** | `/hotfix` | 10–20 min | Urgent production bug with a scoped, blast-radius-limited fix |

Durations assume a healthy test suite and small target project. Large
projects scale linearly with build + test time.

## Safety stoplist

The four lighter tracks (`/nano`, `/quick`, `/config-only`, `/dep-update`) must
**not** be used for any change that touches:

- Authentication, authorization, or session handling
- Cryptography, key management, or secrets rotation
- PII, payments, or regulated-data handling
- Schema migrations or destructive data changes
- Feature-flag **introduction** (toggling existing flags is fine in `/config-only`)
- New external **dependencies** (upgrades are fine in `/dep-update`)

The orchestrator enforces this at routing time by asking the user to
confirm the change doesn't cross any stoplist item. If it does, the
request is routed to `/pipeline`, which is where security, architectural,
and migration review belong.

`/hotfix` is exempt from the stoplist because production incidents can
and do touch those areas — but `/hotfix` requires a named blast-radius
constraint in `pipeline/hotfix-spec.md` and PM sign-off before deploy,
which the lighter tracks do not.

## How routing works

When the user invokes `/pipeline <request>`:

1. The orchestrator reads `.claude/rules/pipeline.md` Stage 0.
2. It inspects the request for stoplist keywords and scope signals.
3. If the request clearly fits a lighter track and doesn't cross the
   stoplist, the orchestrator **offers** the lighter track:
   > "This looks like it fits `/quick`. Skips design and the full
   > peer-review matrix, takes ~5–10 minutes instead of ~30–90. Full
   > `/pipeline` still available if you prefer. Which track?"
4. The user answers. No silent downgrade.
5. If the user invokes `/quick`, `/config-only`, `/dep-update`, or
   `/hotfix` directly, the orchestrator honours that choice and does
   not re-propose the full pipeline.

The routing decision is recorded in `pipeline/context.md` under
`## Brief Changes` as `TRACK: <name>` with a one-line rationale, and
every gate file in `pipeline/gates/` includes `"track": "<name>"`.

## Escalating out of a lighter track

Any lighter track can abort to `/pipeline` at any time. Common signals:

- Scope grows beyond the track's limits (more files, new dependency, new
  API surface)
- Tests reveal behaviour the mini-brief didn't cover
- A reviewer's blocker can't be resolved in one round-trip
- A CVE surfaces during a `/dep-update` scan
- The diff lands in a file that wasn't on the declared allowlist
  (`/config-only`)

When this happens, the orchestrator halts the current track and writes
a line to `pipeline/context.md`:

```
TRACK ESCALATION: <quick|config-only|dep-update> → pipeline — <reason>
```

It then re-runs from Stage 1 of the full pipeline, carrying the work
already done forward (the lighter-track's `pr-{area}.md` becomes input
to the full-track's Stage 4).

## House policy

A target project can set default routing preferences in `CLAUDE.md` so
frequent-flyer request patterns don't need to be re-classified every time:

```markdown
## Pipeline routing preferences

- "docs:", "typo:", "copy:" → default to `/quick`, skip the prompt
- "bump", "upgrade", "update <pkg>" → default to `/dep-update`
- Anything naming a file under `config/` or `.env.example` →
  default to `/config-only`
```

`CLAUDE.md` is yours; bootstrap never overwrites it, so project-level
routing policy survives framework updates.

## When in doubt: `/pipeline`

Full pipeline is always safe. If the orchestrator can't tell which track
fits, or the user is uncertain, run `/pipeline`. The cost of a few extra
minutes of ceremony is cheaper than the cost of discovering mid-deploy
that a quick-tracked change needed a design pass.
