# 10 — Sequenced Roadmap

## How this is sequenced

The framework is in a healthy v2.6.0 state with no P0 blockers. The
roadmap orders work to (a) close the highest-leverage drift vectors
first, (b) ship documentation polish that costs nothing and prevents
onboarding pain, and (c) close functional gaps where the framework
documents behaviour it doesn't actually implement.

## Batch 1 — Immediate (this week, half a day total)

**Goal:** close the silent-drift vectors that could cause real bugs, and
tighten the obviously-loose security knob.

| Order | Item | Why this first |
|---|---|---|
| 1 | **B-1 [DONE]** Hook parity test | 10-line test that prevents the most likely future bug class. Trivially safe. |
| 2 | **B-3** `gate-validator` error-class branching | Silent PASS on EACCES is the only place a real bug could hide; cheap to fix. |
| 3 | **B-2** Tighten `Bash(curl *)` allow-list | Single-line edit to `settings.json`. Reduces exfil surface to near-zero. |
| 4 | **B-19** Release-version consistency test | One assertion guarding all future releases. Trivial. |
| 5 | **B-10** Extract `tests/_framework-contract.js` | Removes a duplication that's already biting in two test files. |

Parallelisable: yes — five independent commits, no shared file edits.
Verification: `npm test` after each. Total effort: ~2–3 hours.

## Batch 2 — Documentation polish (next 1–2 weeks, half a day total)

**Goal:** close the four small onboarding-cliff items. Pure docs work,
zero runtime risk.

| Order | Item | Why |
|---|---|---|
| 6 | **B-4** Add `description` fields to `schemas/*.schema.json` | One-time, helps every future gate author. |
| 7 | **B-5** `templates/README.md` | Eleven one-liners. |
| 8 | **B-6** `.claude/hooks/README.md` | Documents hook event contract. |
| 9 | **B-7** README "First 30 minutes" + EXAMPLE.md link + adapter one-liner | Closes the three onboarding frictions in one PR. |
| 10 | **B-8** Lock-tuning rationale comments | Comment-only edit. |

Parallelisable: yes — independent files. Verification: `npm run
lint:frontmatter`; eyeball the rendered docs. Total effort: ~3–4 hours.

## Batch 3 — Targeted improvements (weeks 3–6)

**Goal:** close the documented-but-unimplemented gaps and add the
missing tests.

| Order | Item | Sequencing notes |
|---|---|---|
| 11 | **B-13** Stoplist pre-flight check in `claude-team.js` | Highest-impact safety upgrade. Should ship before B-11 because a working stoplist makes the budget tracker safer. |
| 12 | **B-11** Port `scripts/budget.js` from codex-dev-team | Closes the documented-but-missing budget gate; medium-size port. |
| 13 | **B-14** Concurrency test for `approval-derivation.js` | Validates the v2.5.1 lock model under true parallelism. |
| 14 | **B-15** Table-driven test for `security-heuristic.js` | One file, ~50 LOC; closes T-02. |
| 15 | **B-9** Slash↔CLI cross-check test | Closes the third drift vector (after B-1 and parity-check.js). |
| 16 | **B-18** Adapter-contract test | Cheap insurance for Stage 8 changes. |
| 17 | **B-17** Refactor `claude-team.js` dispatch to object map | Pairs naturally with B-9 since both touch the dispatch table. |
| 18 | **B-12** Port `scripts/visualize.js` from codex-dev-team | Optional QoL, can ship any time. |
| 19 | **B-16** Cap JSON parse size in gate readers | Defence in depth. |
| 20 | **B-20** Hook command `git rev-parse` fallback | Niche but cheap. |

Parallelisable: B-11/B-12 can ship together (both port from codex).
B-13–B-15 are independent. B-17 should land before B-9 to share the
dispatch refactor. Verification: extended `npm test`. Total effort:
~3–4 days, distributable across reviewers.

## Batch 4 — Strategic (month 2+)

**Goal:** evolve the framework where the current shape is fine but
could be better.

- **B-21** Split `pipeline.md` into three files. Run only after B-9 and
  B-11 land so the new files reflect the latest stage list. Mini-
  proposal: each agent's frontmatter declares which subset it loads;
  `tests/contract.test.js` checks the union covers all stages.
- **B-22** Async setTimeout-based lock retry. Keep on the back-burner;
  current busy-spin is invisible at present scale.
- **B-23** Structured log mode for hooks. Driven by demand from any
  external orchestrator integration.
- **B-24** Async-checkpoint conditional auto-pass. The config plumbing
  exists; the hook code does not. Codex sibling has the impl; port
  pattern.
- **B-25** Behavioural parity check vs codex-dev-team. Today's parity
  is file-presence + config-key. Promote to "given the same gate
  inputs, both repos' validators emit the same outputs" — would catch
  semantic drift.
- **B-26** Move `docs/build-presentation.js` into `scripts/`. Pure
  cleanliness; doesn't fix a bug. Park unless contributors keep getting
  confused by its location.
- **B-27** ADR for the bilateral coupling between `pipeline.md` and
  agent prompts.

## Verification gates per batch

- After Batch 1: `npm test`, `npm run lint`, `npm run validate`,
  `npm run parity:check`. All green.
- After Batch 2: doc rendering and a manual run-through of the README
  "First 30 minutes" path.
- After Batch 3: full pipeline dogfood end-to-end, plus a second
  pipeline run that exercises `/quick` on a stoplist-matching path
  (must reject), and a budget-exceeded run (must escalate).
- After Batch 4: parity check vs codex-dev-team and a CHANGELOG note.

## Roadmap risks

- **The hook-parity test (B-1) might catch a current asymmetry not
  visible by `diff`.** Today's diff is empty, but `crypto.createHash`
  on the same content from different OSes (line-ending differences)
  could surface. Mitigation: write the test, run it once, fix any line-
  ending mismatch before committing.
- **Stoplist enforcement (B-13) could over-trigger and frustrate
  users.** Tune the regex on real diffs from past pipelines before
  shipping. Mitigate via a `--force-track` flag for cases where the
  regex misclassifies.
- **Budget tracker port (B-11) depends on the codex script.** If the
  codex sibling has a Codex-specific assumption baked in (it doesn't
  appear to), the port will need adaptation.
- **`pipeline.md` split (B-21) could break agent prompts** that
  hardcode the file path. Mitigation: keep the old path as a redirect
  for one minor version; add a contract test that asserts every agent
  loads what it needs.

## Re-sequencing triggers

- **Any user-reported gate corruption** → bump B-14 (concurrency test)
  and B-3 (error-class) to Batch 1.
- **Any user-reported missed stoplist case** (someone ran `/quick` on
  an auth change and the framework didn't catch it) → bump B-13 to
  Batch 1.
- **Any externally observed drift between claude and codex framework
  outputs** → bump B-25 (behavioural parity) up two batches.

## Status (entry point for `/roadmap`)

- **P0:** none.
- **P1 quick wins:** 10 items, ~half a day total.
- **P2 targeted:** 10 items, ~3–4 dev-days.
- **P3 strategic:** 7 items, sequenced as future work.
- **Parked:** 4 items with explicit reasoning.

Re-run the audit (`/audit`) after Batch 3 lands; expect the theme list
to shrink from 5 to 2–3.
