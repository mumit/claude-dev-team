# Presentation Speaker Notes

Companion to `scripts/build-presentation.js`. One section per slide, in slide order.
These are talking points — not a script. Adjust the depth based on your audience's
technical level and how much time you have per section.

Generate the deck: `npm install pptxgenjs react-icons react react-dom sharp && node scripts/build-presentation.js`

---

## Slide 1 — Title

Open with a question, not a statement. Something like: "How many of you have had a
Claude session go sideways — context resets, it forgets your architecture, you're
re-pasting the same rules for the third time?" Let that sit. That's the problem this
addresses.

The subtitle tells you what it does: structured dev pipeline. The byline tells you
what that means: from feature brief to production deploy, with gates and checkpoints.
This isn't a better prompt — it's a framework that gives Claude the same structure a
real dev team already has.

**Transition:** "Let's name the actual problem first."

---

## Slide 2 — The Problem

Walk through the four cards left to right, top to bottom, but don't rush. Each one
should land before you move on.

- **Context evaporates** — this is the universal pain. Every person in the room has
  re-explained their architecture to Claude. The framework writes everything to disk so
  it survives compaction and new sessions.
- **No roles, no boundaries** — one Claude instance touching backend, infra, tests, and
  config simultaneously with no ownership model is chaos. Real teams don't work that way.
- **No gates or guardrails** — AI that ignores your conventions isn't helping, it's
  creating review debt. There's no checkpoint before a 500-line diff lands.
- **No learning loop** — every run starts from zero. Same mistakes, same re-explanations.
  The framework's retrospective loop fixes this explicitly.

**Transition:** "Here's what that looks like in practice — before and after."

---

## Slide 3 — Before & After

Read the "before" column out loud, quickly — let the audience recognize themselves in
it. Then pause before switching to "after."

The key insight in the right column: the structural changes, not the prompt changes.
"7 scoped agents with file-area ownership" is a constraint, not a feature. "3 human
checkpoints" means Claude cannot deploy without you having approved the brief, the
design, and the test results.

Don't dwell here — the rest of the deck unpacks each row.

**Transition:** "Before I explain the mechanism, let me show you exactly what you see on
screen when you run this."

---

## Slide 4 — What You'll Actually See

This is the "trust but verify" slide. Audiences trust demos more than diagrams. Walk
through each artefact:

- **Checkpoint A** (top left): Claude halts. Prints a plain-English summary of what the
  PM agent produced. Waits for "proceed". Nothing happens until you type it.
- **Stage 5 reviewer blocker** (bottom left): This is what a genuine disagreement looks
  like. The reviewer found that the implementation contradicted the approved design spec.
  It wrote CHANGES REQUESTED and halted — no silent fix, no guessing. The owning dev
  addresses it separately.
- **Gate JSON** (right): Machine-readable. Every stage writes one. The hook reads it
  deterministically — no natural language parsing. If status is FAIL, the pipeline retries
  the owning agent. If ESCALATE, it surfaces to you.

Everything in these screenshots is in `pipeline/` on disk — grep it, version it, audit it.

**Transition:** "A question I always get at this point: how does this fit into what we
already do?"

---

## Slide 5 — How It Fits Your Existing Workflow

This is the most important slide for skeptics. The horizontal flow at the top is
deliberate: pipeline fits *between* ticket and PR. It doesn't replace anything to the
right of it.

Walk the two-column table explicitly:

- "The pipeline writes code to a worktree and opens a PR — it doesn't merge."
- "It runs lint and tests internally, before the PR. Your GitHub Actions CI still runs
  on the PR as normal."
- "Staging deploy is optional and adapter-driven. Production is still yours."
- "Stage 5 is structural review — conventions, spec adherence, cross-area consistency.
  It doesn't replace the domain review your engineers bring."
- "Decisions go into pipeline/context.md and ADRs. Your Jira ticket is not touched."

The footer callout is worth saying explicitly: "The full pipeline is 30–90 minutes.
/quick is 5–10. /nano is 1–3. The ceremony is proportional to the change size."

**Transition:** "Let me show you the five building blocks everything is built from."

---

## Slide 6 — Five Building Blocks

Brief slide — it's context for the mechanism slides that follow. Don't spend more than
90 seconds here.

The five columns are the five primitives everything else composes from:
- **Agents** are the people. Scoped, constrained, model-matched to their role.
- **Commands** are what you type. `/pipeline`, `/quick`, `/nano` are all commands.
- **Skills** are passive knowledge — coding standards, security checklists — loaded
  automatically when relevant, not pasted in manually.
- **Rules** are the contracts the orchestrator must follow — pipeline stages, gate schema,
  coding principles.
- **Hooks** are deterministic code that fires on events. The safety layer that doesn't
  ask the LLM's opinion.

**Transition:** "Before we walk the pipeline, one decision point: which track to use."

---

## Slide 7 — Track Selection

The table answers "which command do I run?" but the safety stoplist at the bottom is
the real message. Read it: "auth, crypto, PII, payments, schema migrations, new
external deps, feature-flag introduction — these are always `/pipeline`."

The lighter tracks exist to save time on genuinely small changes, not to bypass review
on sensitive surfaces. The orchestrator enforces this: if you try to run `/quick` on
something that touches auth, it will tell you to use `/pipeline` instead.

"When in doubt, `/pipeline`. The cost of extra ceremony is cheaper than discovering mid-deploy
that a quick-tracked change needed a design pass."

**Transition:** "Now let's walk the pipeline itself."

---

## Slide 8 — Section: The Pipeline

Section divider. Use this as a breath.

"Nine stages. Seven agents. Three human checkpoints. From the feature brief you write
to the deploy log and retrospective. Let's walk through it."

---

## Slide 9 — Pipeline Stages + Checkpoints

Don't read every box. Walk the shape:

- Stages 1–3: requirements, design, clarification — the work that happens before a line
  of code is written. The PM writes acceptance criteria. The Principal writes the design.
  Devs annotate. Principal chairs the review.
- **Checkpoint A** (after Stage 1) and **Checkpoint B** (after Stage 2): you've approved
  the brief and the design before build starts.
- Stage 4: three devs build in parallel, each in their own git worktree.
- Stage 4.5: automated checks before anyone reviews. More on that in two slides.
- Stage 5: cross-area peer review. More on that in three slides.
- **Checkpoint C** (after Stage 6): you've seen the test results before deploy.
- Stages 7–9: PM sign-off, deploy, retrospective.

The gate rule at the bottom: every stage writes a JSON file. The pipeline cannot advance
without it.

**Transition:** "Let's talk about the team that runs each of those stages."

---

## Slide 10 — The Virtual Team

Seven rows. What matters in each:

- The **Stage(s)** column tells you who does what and when.
- The **Boundaries** column tells you what each agent cannot do. dev-backend cannot touch
  `src/frontend/` — ever. If it needs to, it writes a CONCERN to pipeline/context.md
  and waits for the orchestrator.
- The **READ-ONLY during Stage 5** note is load-bearing. During peer review, developer
  agents write only to their review file. Never to source files. Silent inline fixes
  are prohibited. We'll come back to why.
- **dev-qa** owns Stage 6. Not dev-platform. That split happened in v2.3.
- **security-engineer** participates only when the security heuristic fires. When it does,
  it has veto power. No peer-review approval can override a veto.

**Transition:** "The gate system is what keeps all of this honest."

---

## Slide 11 — The Gate System

Three statuses. Walk them:

- **PASS**: pipeline advances automatically.
- **FAIL**: clear fix exists. Owning dev is re-invoked. Same failure twice → auto-escalate.
- **ESCALATE**: agent hit something it can't resolve without you. Pipeline halts. You
  get a plain-English summary of what's needed and options to choose from.

The gate schema on the left: required fields on every gate. The validator checks these
after every agent stop. Missing a field → validator exits non-zero → pipeline halts.

The two hooks on the right are worth naming:
- `gate-validator.js`: deterministic gate enforcement. No LLM judgment, just code.
- `approval-derivation.js`: parses REVIEW: APPROVED / CHANGES REQUESTED markers from
  review files and writes the approval arrays. Agents cannot write their own approvals.
  This closes the self-approval hole introduced in earlier versions.

**Transition:** "Between build and review, two more automated gates."

---

## Slide 12 — Stage 4.5 — Automated Pre-Review Checks

"This is the layer most teams are missing — and it's the one that makes Stage 5 review
worth something."

The idea: catch what tooling already knows before human (or agent) review tokens are
spent on it. Two sub-stages:

- **4.5a** (always): dev-platform runs lint, type-check, and SCA. No HIGH or CRITICAL
  vulnerability findings allowed. Stage 5 doesn't start until this passes.
- **4.5b** (conditional): fires when the diff touches any of the listed surfaces —
  auth paths, crypto, new dependencies, Dockerfiles with network changes, IAM/RBAC infra,
  database migrations. When it fires, the security-engineer (Opus) does a threat model.

The red callout at the bottom: `veto: true` is a hard stop. No peer-review approval
overrides it. The security-engineer must personally re-review the fix and flip the flag.
The rationale: peer reviewers are area specialists, not threat modellers. Their "approved"
doesn't speak to the threat model.

**Transition:** "Now Stage 5 — where the team reads each other's code."

---

## Slide 13 — Stage 5 — Peer Code Review

Two review shapes:

- **Scoped** (one reviewer, one approval required): used when the diff is area-contained.
  One cross-area reviewer is enough.
- **Matrix** (three reviewers, two approvals per area): used when the diff crosses areas.
  Each dev reviews the other two areas' code.

The bottom banner is the non-negotiable part. **READ-ONLY reviewer rule**: reviewers
write only to their review file. If they find a bug, they write REVIEW: CHANGES REQUESTED
and list the BLOCKER. They halt. The owning dev fixes it. No inline fix-forwards, no
"I'll just fix this one line" — because that one line doesn't get re-reviewed, leaves
no audit trail, and if it has a second bug, nobody catches it.

`approval-derivation.js` parses the REVIEW: APPROVED / CHANGES REQUESTED markers and
derives the approval gate. Agents cannot write approvals directly. Any manual edit to
the approval array is overwritten on the next reviewer save. The hook is authoritative.

**Transition:** "What if you lose context mid-run, or hit an escalation at 11pm?"

---

## Slide 14 — Pipeline Observability

Four commands for when the pipeline is in flight:

- `/status`: gate dashboard. Fastest check — which stages passed, failed, or are still
  pending.
- `/pipeline-context`: full state dump including open QUESTION: entries. Run this before
  compacting the context window.
- `/resume <N>`: verifies prior gates, picks up at stage N. Used after resolving an
  escalation or returning to an interrupted run.
- `/stage <name>`: re-run a single stage explicitly without restarting the pipeline.

The footer callout lists the partial-pipeline commands: `/design` (Stages 1–2 only),
`/pipeline-brief` (Stage 1 only), `/pipeline-review` (Stage 5 on current `src/`).

**Transition:** "After every run — success or failure — Stage 9 runs automatically."

---

## Slide 15 — The Learning Loop

"This is the slide that separates this from a one-off tool."

Stage 9 runs after every deploy — pass or fail. More value from failures than successes.

Step 9a: all agents contribute in parallel. Each gets four prompts: what worked, what
I got wrong, where the pipeline slowed me down, one lesson worth carrying forward. The
one lesson is required — there's no opting out.

Step 9b: the Principal reads all contributions and the current `lessons-learned.md`, then
promotes at most two new rules. Retires rules proven wrong or reinforced ≥5 times
without incident (internalised — no longer needs to be written down). Auto-ages out rules
that haven't been reinforced in 10 runs.

`lessons-learned.md` survives `/reset` — it's the one file that persists across features.
Every agent reads it at the start of their work. PM reads it before Stage 1. Every dev
reads it before Stage 4. Reviewers read it before Stage 5.

The L007 example is real: a concrete rule ("when the brief uses 'notify', clarify email
vs. push vs. inline UI before design starts") with a reinforcement count and the date it
last caught something. That's institutional memory in a file.

**Transition:** "Let's be clear about the boundary between Claude and you."

---

## Slide 16 — Safety & Trust

"The left column is what Claude handles without asking. The right column is always yours."

Read the two lists. The right column is worth pausing on: Claude cannot commit, push,
resolve an escalation, override a security veto, or deploy without your explicit decision.
These aren't defaults that can be overridden by prompt — they're structural constraints.

The footer opt-ins (v2.5): budget gate and async checkpoint auto-pass. Both off by default.
The adoption guide specifically recommends not turning on auto-pass in the first month —
the checkpoints are where you build trust in the pipeline's output.

**Transition:** "So how do you actually get your team onto this?"

---

## Slide 17 — Getting Your Team On Board

Four cards, four weeks:

- **Week 1, /audit-quick**: run it on a codebase the team already knows. Output is
  familiar — architecture map, health findings. The mechanic is new. Skeptics see
  a structured output from their own codebase, not a toy example.
- **Weeks 1–2, /audit**: full 4-phase audit with roadmap. Walk through it together.
  Some teams use it for sprint planning — the brief surfaces scope questions before
  estimates are committed.
- **Weeks 2–3, /pipeline on something boring**: first pipeline run on a health-check
  endpoint or a utility function. Discover the mismatches between framework defaults
  and your project structure on something low-risk.
- **Week 4+, normal workflow**: the signal that adoption is working: the team stops
  saying "let me check what the pipeline produced" and starts saying "where's the
  brief?" before any significant change begins.

Point to the footer: adoption-guide.md has the full Q&A for skeptics — what about
AI-written bugs, what about deskilling, what can it do without approval — and the
complete 6-week adoption timeline with a table.

**Transition:** "One more mode — the codebase health suite, which runs independently of
the pipeline."

---

## Slide 18 — Codebase Health Suite

"This is how you start if your team isn't ready for the full pipeline yet."

Four commands:

- `/audit`: the deep onboarding. Four phases with checkpoints. Produces a complete
  architecture map, health findings, security scan, and prioritized improvement roadmap.
- `/audit-quick`: phases 0 and 1 only. Architecture map and health scan in one pass.
  Good starting point before committing to the full audit.
- `/health-check`: monthly delta scan. Compares current state against the prior audit —
  new violations, stale docs, roadmap progress, dependency changes.
- `/roadmap`: progress dashboard. Reads the roadmap file and shows what's done, what's
  next, and what's stalled.

The audit suite is independent of the pipeline — you don't need to be running `/pipeline`
to use it. Many teams start here, build confidence in the framework's output, and then
add the pipeline for feature work.

**Transition:** "Five steps to get started."

---

## Slide 19 — Getting Started

Walk through the five steps. Steps 1 and 2 are mechanical (clone, bootstrap). Step 3
is the first interesting moment — opening a feature request and typing `/pipeline`.

Step 5 is worth emphasising: Stage 9 runs automatically. You don't need to do anything
extra to get the learning loop — it's built into the pipeline end.

Close with a pointer to resources:
- **EXAMPLE.md** in the repo root: complete end-to-end pipeline walkthrough for a
  password reset feature, with all artefacts shown exactly as they'd appear.
- **docs/user-guide.md**: journey-based guide for new users with Mermaid diagrams.
- **docs/adoption-guide.md**: Q&A for skeptics, what not to do, 6-week adoption timeline.

Leave time for questions. The most common ones — "does this replace my CI?",
"can the AI see my proprietary code?", "what if the security review misses something?"
— all have detailed answers in docs/faq.md and docs/adoption-guide.md.

---

## Timing reference

| Slides | Section | Suggested time |
|--------|---------|----------------|
| 1–3 | Hook + problem | 5 min |
| 4–5 | What you see + workflow fit | 5 min |
| 6–7 | Building blocks + track selection | 3 min |
| 8–13 | Pipeline deep-dive | 12 min |
| 14–16 | Observability + learning + safety | 6 min |
| 17–19 | Adoption + health suite + next steps | 4 min |
| — | Q&A | 10 min |

Total with Q&A: ~45 minutes. For a 30-minute slot, compress slides 6–7 to 1 minute
and skip the gate JSON detail on slide 11 — cover PASS/FAIL/ESCALATE only.
