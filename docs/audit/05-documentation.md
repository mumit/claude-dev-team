# 05 — Documentation Health

## Documentation Inventory

| File | Lines | Audience | Purpose |
|---|---|---|---|
| `README.md` | 297 | First-time user | Project pitch, install, "When to Use What", links |
| `CONTRIBUTING.md` | 68 | Framework contributor | Prerequisites, setup, tests, project structure, bootstrap rules |
| `AGENTS.md` | 200 | External tools / humans | Team roster, commands, workflow summary; compatibility shim |
| `CLAUDE.md` | 5 | Claude (this repo) | Project instructions — **near-empty** |
| `docs/lifecycle.md` | 197 | Framework user | End-to-end walkthrough of a pipeline run |
| `docs/faq.md` | 147 | Framework user | Common questions, failure modes |
| `docs/audit/` | N×N | Self-audit | Phase outputs + health-check history |
| `.claude/rules/*.md` | — | Orchestrator (Claude) | Machine-read process definitions (5 files) |
| `.claude/references/audit-phases.md` | — | `/audit` command | Phase definitions |
| `.claude/skills/*/SKILL.md` | — | Claude, task-local | Passive knowledge loaded by skill triggers (6 skills) |
| `.claude/agents/*.md` | — | Claude, per-agent | Role, skills, hooks (5 agents) |
| `.claude/commands/*.md` | — | Claude, per-command | Slash-command prompt templates (18 commands) |

Everything that should be documented is documented, with two exceptions noted below. The main axis of improvement since the prior audit is coverage, not quality.

---

## What's Covered Well

- **README as entry point**: section headers for prerequisites, install, when-to-use-what decision table, pipeline overview with checkpoints, audit workflow, project structure, agent-model rationale, gate system, customisation, known limitations. Reads cold.
- **CONTRIBUTING.md** (new since prior audit): prerequisites (Node 20+, git, rsync, Claude Code), setup, test commands, project structure table, change workflow, test conventions, bootstrap rules. Resolves the prior audit's "how do I test changes to the framework?" gap.
- **Lifecycle walkthrough** (`docs/lifecycle.md`): narrates one feature going through the eight stages with sample gate files. Concrete, not abstract.
- **FAQ** (`docs/faq.md`): covers the common confusions — "does this write code?", "what if a dev fails?", "can I skip stages?", "how do I reset?".
- **Machine-readable rules**: `.claude/rules/gates.md`, `pipeline.md`, `escalation.md`, `compaction.md`, `orchestrator.md` are explicit, schema-like, and read as contracts. Stage duration table added in Batch 4.
- **build-presentation.js** is now JSDoc'd (19 blocks across the public surface). Prior finding resolved.

## Documentation Gaps

### Finding 1 — `CLAUDE.md` is near-empty
- File: `CLAUDE.md` (5 lines)
- Observed: Contains only the bootstrap-generated placeholder comment. No project-specific guidance for Claude when operating on *this* repo.
- Impact: A contributor who opens Claude Code in this repo gets no pinned context about "this is the framework repo, not a target project". The first thing Claude does in an audit or implement session is re-discover this from scratch.
- Suggested fix: 15–30 line `CLAUDE.md` covering: repo is framework-only (no target-project code here), run `npm test` before committing, Conventional Commits required, no new runtime deps, pointer to `CONTRIBUTING.md` for process, pointer to `.claude/references/audit-phases.md` for audit runs.
- Severity: Low

### Finding 2 — No "Concepts" primer distinguishing commands / skills / rules / agents / hooks
- Observed: The README lists them but never defines them as a set. A newcomer has to read multiple files to form the mental model:
  - Agents are named personas with tool allow-lists and preloaded skills.
  - Commands are explicit user-triggered prompts.
  - Skills are passive knowledge packs loaded by context or trigger phrases.
  - Rules are machine-read contracts the orchestrator honors.
  - Hooks are shell commands Claude Code fires on events.
- Impact: Real question asked frequently enough to be in the prior audit's onboarding test. Still unanswered in docs.
- Suggested fix: Add a "Concepts" section to README (or a `docs/concepts.md` linked from README) with a one-sentence definition for each of the five.
- Severity: Low (persistent)

### Finding 3 — `build-presentation.js` dependency pinning still fragile
- Files: `package.json`, `docs/build-presentation.js`
- Observed: devDependencies now pin major/minor: `pptxgenjs ^3.12.0`, `react ^18.3.1`, `sharp ^0.33.5`. Lockfile is committed.
- Assessment: Resolved vs. the prior audit ("no package.json to pin versions"). A future React 19 update would still require coordinated changes; that's normal package-management, not a doc gap.
- Severity: Resolved

### Finding 4 — AGENTS.md and CLAUDE.md drift risk
- Files: `AGENTS.md`, `CLAUDE.md`, `.claude/rules/orchestrator.md`
- Observed: AGENTS.md summarizes the same orchestration model that `.claude/rules/orchestrator.md` specifies. Today they agree. When orchestrator.md changes, AGENTS.md must be updated manually — there's no linkage.
- Suggested fix: Either (a) add a note at the top of AGENTS.md: "Authoritative source is `.claude/rules/orchestrator.md`; this file is a human-readable mirror" (partly done; the shim note exists), or (b) generate the relevant sections of AGENTS.md from the rules files at build time.
- Severity: Low

### Finding 5 — Audit outputs describe outdated state right after health-checks
- Files: `docs/audit/03-compliance.md`, `04-tests.md`, `05-documentation.md` (before this write)
- Observed: Prior audit files were written before the April 2026 health-check landed 15 items. Without re-running `/audit`, readers see findings that are already resolved. This audit re-run fixes the three Phase-1 files; the Phase-2 and Phase-3 files will be rewritten in subsequent phases of this audit.
- Severity: Meta — this audit is the fix.

### Finding 6 — No changelog
- Observed: The repo has 38 commits with Conventional Commit subjects but no `CHANGELOG.md`. Version is `1.0.0` in `package.json` — static across all commits.
- Impact: Low. The project is a single-maintainer framework and is not published. But if it's ever distributed as a template that target projects pin to, version + changelog become necessary.
- Severity: Very low (future concern)

---

## Inline Documentation

### `.claude/hooks/gate-validator.js` (90 LOC)
- Top-of-file block comment explains purpose, trigger point, and exit-code semantics. ✅
- Exit codes 0/1/2/3 are commented at call sites. ✅
- No function-level JSDoc — the file is a linear script with no functions. Appropriate.
- `mtime` sorting (picking latest gate) is not commented. Minor; one line would help.

### `docs/build-presentation.js` (686 LOC)
- JSDoc now on 19 public helpers including `icon()`, `addCard()`, `addBullets()`, `slideBg()`, per-slide functions, and `main()`.
- Layout constants (`SAFE_MARGIN`, palette colors) have descriptive names; design-intent comments are sparse but not missing.

### `bootstrap.sh` (168 LOC)
- Section headers (`# === Step N ===`) demarcate phases.
- Echo statements narrate each step to the user.
- rsync strategy and `*.local.*` preservation are commented.

---

## Onboarding Test

A dev expecting to learn the framework and make a small change:

1. **"Where's the code?"** — README now explains "this is a framework / template" in the opening paragraph. CONTRIBUTING.md restates it. Resolved.
2. **"How do I test changes to the framework?"** — `npm test`, `npm run test:integration`, `npm run lint` are all documented in CONTRIBUTING.md. Resolved.
3. **"What's the difference between commands / skills / rules / agents / hooks?"** — **Still open** (see Finding 2).
4. **"How do I run the presentation builder?"** — `node docs/build-presentation.js` + `npm install` handles it; devDeps are pinned. Resolved.
5. **"Can I modify agent definitions safely?"** — `tests/frontmatter.test.js` catches schema regressions; CONTRIBUTING.md points to it. Resolved.
6. **"Where do I write a new slash command?"** — Still implicit. Adding a one-paragraph "how to add a command/skill/agent" section to CONTRIBUTING.md would close this.

Three of six previously open onboarding gaps remain: concepts primer, how-to-add-a-command, and CLAUDE.md emptiness. All low-severity, all small writes.

---

## Recommendations

- **P2** — Add "Concepts" section to README or a new `docs/concepts.md`. Defines agent / command / skill / rule / hook in one sentence each.
- **P2** — Expand `CLAUDE.md` to ~30 lines of repo-specific guidance.
- **P3** — Extend `CONTRIBUTING.md` with "Adding a new command / skill / agent" how-to (3 short sections, ~40 lines).
- **P3** — Add a header note to `AGENTS.md` clarifying it mirrors `.claude/rules/orchestrator.md` and must be kept in sync.

## Summary

Documentation quality is **above average** and materially better than at the prior audit. Additions of `CONTRIBUTING.md`, JSDoc on `build-presentation.js`, devDep pinning, and the CI/tests/frontmatter-validation infrastructure each close specific prior findings. The remaining gaps are all low-severity, small-fix items — principally the near-empty `CLAUDE.md` and the absence of a "Concepts" primer — neither of which blocks anything.
