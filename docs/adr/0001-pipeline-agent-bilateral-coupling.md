# ADR 0001 — Pipeline rules and agent prompts are bilaterally coupled

**Status:** Accepted
**Date:** 2026-05-07
**Authors:** Framework maintainers (audit B-27, Q-08)

## Context

Two source-of-truth surfaces talk about the same thing:

- `.claude/rules/pipeline.md` says, for example, "invoke `dev-platform`
  at Stage 4.5a to run lint, type-check, and SCA."
- `.claude/agents/dev-platform.md` says, for example, "On a Pre-Review
  task you run lint, type-check, and SCA at Stage 4.5a."

Each agent's prompt restates the parts of `pipeline.md` it owns. The
two files are intentionally redundant: agents can be invoked without
the orchestrator reading every rule file aloud, and orchestrator rules
must be readable without diving into every agent persona.

The cost is that any rename — Stage 4.5a → 4.5, `dev-platform` → some
other owner, "lint + SCA" → "lint + SCA + license check" — requires
edits in both `pipeline.md` and the relevant agent file. Drift is
silent today; nothing programmatic checks the two agree.

## Decision

We accept the bilateral coupling. We do **not** introduce a single
source of truth (e.g. generating agent prompts from a manifest) for
the following reasons:

1. **Generated prompts lose human-tuned voice.** Agents are LLM
   personas. Their effectiveness depends on how the prompt reads to a
   model, not just on the facts it conveys. A generated prompt would be
   uniform and dry across roles.
2. **Orchestrator rules and agent prompts have different audiences.**
   The orchestrator reads `pipeline.md` to route work and validate
   gates. An agent reads its own prompt to do a job. The same fact
   needs different framing in each place.
3. **The coupling is bounded.** It only exists between
   `pipeline.md` and the agent prompts; gate schemas, templates, and
   hooks are decoupled (gates are JSON, templates are scaffolds,
   hooks read deterministic inputs).
4. **Drift is observable.** When a stage is renumbered or an owner
   changes, agents will reference a stage that does not exist; this
   surfaces at the next pipeline run rather than as a silent bug.

## Mitigations in place

- **Track field on every gate** (`.claude/rules/gates.md`): downstream
  tooling (validator, status, parity) branches on the track string,
  not on per-stage hardcoded names. A renumber that updates `pipeline.md`
  but forgets the agent prompt will produce gates that still validate;
  the symptom is a stage that "didn't run" rather than a corrupt run.
- **Slash↔CLI parity test** (`tests/slash-cli-parity.test.js`, B-9):
  catches drift between the user-facing slash command surface and the
  CLI dispatch table.
- **Helper script parity** (`tests/hook-parity.test.js`, B-1; the
  `parity-check.js` script): catches drift between hook copies and
  between this repo and codex-dev-team.
- **Frontmatter schema** (`tests/frontmatter.test.js`): asserts every
  agent declares its name, model, tools, and permission mode. Renaming
  an agent changes its frontmatter, which the test pins.

## Mitigations not in place (and why)

- **Schema-lite contract test that parses stage references in
  pipeline.md and every agent file and asserts agreement.** The audit's
  Q-08 finding suggested this. It would catch real drift, but it
  requires a small DSL for "this agent owns these stages" embedded in
  agent frontmatter (or parsed out of prose). The leverage is low — a
  single yearly drift event is cheaper to fix on report than the cost
  of maintaining the contract test forever. Revisit if drift events
  become recurrent.

## Consequences

- **Positive:** agent prompts can stay tuned to their role's tone;
  orchestrator rules can stay readable as a single linear document;
  hooks and tooling stay independent of stage naming.
- **Negative:** every stage rename or ownership change is a multi-file
  edit. A future audit will probably notice this again; that's fine
  — the answer will probably be the same.
- **Trigger to revisit:** if drift between `pipeline.md` and the agent
  prompts causes more than one defect within a single quarter, accept
  the cost of the schema-lite contract test and ship it.

## Alternatives considered

- **Generate agent prompts from a manifest.** Rejected: see Decision
  point 1.
- **Move stage references out of agent prompts entirely.** Rejected:
  agents need to know what stage they own; removing the reference
  forces them to consult `pipeline.md` at runtime, which the framework
  intentionally pushes upfront via the orchestrator's
  "include lessons-learned in agent invocation prompts" pattern.
- **Schema-lite contract test (Q-08's recommendation).** Rejected for
  now per Mitigations-not-in-place above; reconsidered if drift
  becomes recurrent.

## Related

- Audit findings B-27, Q-08 (`docs/audit/08-code-quality.md`).
- Audit theme 1 ("drift between dual surfaces"); the in-place
  mitigations B-1, B-9, parity-check are partial coverage.
