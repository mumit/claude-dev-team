# 08 — Code Quality

## Findings

### Q-01 — Duplicate hook scripts with no parity test — MEDIUM × HIGH × HIGH
**Files:** `.claude/hooks/gate-validator.js` ↔ `scripts/gate-validator.js`,
`.claude/hooks/approval-derivation.js` ↔ `scripts/approval-derivation.js`.

This is the same finding as compliance C-01, restated here because
duplication is the canonical code-quality issue. Currently byte-identical;
no test pins them; git history shows past asymmetric edits.

**Fix:** ~10-line `tests/hook-parity.test.js` that hashes both pairs and
asserts equality. Effort: small. Impact: high (closes a real drift
vector). Confidence: HIGH.

### Q-02 — Slash commands and CLI subcommands have no cross-check — MEDIUM × MEDIUM × MEDIUM
**Files:** `.claude/commands/*.md` (23 files), `scripts/claude-team.js`
dispatch table.

Both surfaces purport to do the same things. There is no test that
verifies the set of slash commands and the set of CLI subcommands are
1:1, or that they emit equivalent gates. A new command added to one
surface and not the other ships silently.

**Fix:** Test that lists all `.claude/commands/*.md` files (minus
internal ones like `pipeline-context`, `pipeline-brief`) and asserts
each has a corresponding `claude-team.js` subcommand string. Effort:
small, ~30 LOC. Impact: medium.

### Q-03 — `.claude/rules/pipeline.md` is 22k+ lines — LOW × MEDIUM × MEDIUM
The single largest rule file. Sections cover Stage 0 routing, every
stage's gate semantics, all six lighter tracks, the safety stoplist,
async-friendly checkpoints, and so on. The content is correct and
well-structured but the length makes any single agent's prompt
expensive to load and tedious to debug.

**Fix:** Optionally split into `pipeline-core.md` (stages 1–3 +
checkpoints), `pipeline-build.md` (4–8), `pipeline-tracks.md` (track
routing + stoplist + auto-pass conditions). Each agent loads only the
files it needs. Effort: medium (every reference must be updated, and
agents that "read pipeline.md at startup" must be retargeted). Impact:
medium (faster loads, easier diff review). Confidence: MEDIUM (the
trade-off is also losing single-file canonical answer).

### Q-04 — `claude-team.js` dispatch is a long if-chain — LOW × MEDIUM × MEDIUM
**File:** `scripts/claude-team.js` ~lines 1267–1300+.

Adding a new subcommand requires finding the right spot in a long
sequence of `if (cmd === '…')` branches. There is no single source of
truth for the command list; help text is generated separately.

**Fix:** Object-map dispatch:
```js
const commands = {
  status: () => runNodeScript('status.js', argv),
  next:   () => printNext(argv),
  // ...
};
const fn = commands[argv[0]];
if (!fn) { printUsage(); process.exit(2); }
fn();
```

Effort: small. Impact: medium (self-documenting list, fewer adding-a-
command mistakes). Confidence: MEDIUM.

### Q-05 — Lock-tuning constants lack rationale comments — LOW × LOW × HIGH
**File:** `.claude/hooks/approval-derivation.js` lines ~69–71.

```
const LOCK_RETRIES   = 20;       // why 20?
const LOCK_DELAY_MS  = 30;       // why 30 ms?
const LOCK_STALE_MS  = 5000;     // documented
```

The stale-lock comment is informative; the other two are bare numbers.
A reader must reverse-engineer the 600 ms total wait window.

**Fix:** Add the math in a comment, e.g. `// 20 × 30 ms = 600 ms total
wait before bail` and a one-liner on why 600 ms (longer than typical
hook startup, shorter than human-noticeable). Effort: trivial.

### Q-06 — `docs/build-presentation.js` 934 LOC, no unit tests — LOW × LOW × HIGH
Mirror of T-03. The smoke test does `node --check` and an optional
runtime build but doesn't exercise any of the 23 slide functions
individually.

**Fix:** ~30-LOC unit test that mocks `pptxgenjs` + `sharp` and asserts
each slide function runs without throwing and produces the expected
number of `slide.addText` calls. Effort: small. Impact: low (the script
isn't on the pipeline critical path). Confidence: HIGH.

### Q-07 — Test contracts duplicated in `contract.test.js` and `dogfood.test.js` — LOW × LOW × MEDIUM
Both files independently iterate over the same hard-coded lists of
required files (agents, rules, schemas, skills, commands). Adding an
agent means updating both lists.

**Fix:** Extract to a single `tests/_framework-contract.js` that
exports the lists; both tests `require()` it. Effort: trivial. Impact:
low. Confidence: HIGH.

### Q-08 — `pipeline.md` and agent prompts have tight bilateral coupling — LOW × LOW × LOW
The pipeline rule says "invoke `dev-platform` at Stage 4.5a";
`dev-platform.md` says "I run pre-review checks at Stage 4.5a." If
Stage 4.5a is ever renumbered, both must change. There is no test
asserting they agree.

**Fix:** A schema-lite contract test that parses stage references in
both files and asserts agreement. Effort: small. Impact: low (current
state is correct; this guards against future drift). Confidence: LOW —
might be over-engineering.

## Dead code, dependency hygiene

- **No TODO/FIXME/XXX/HACK** anywhere in the codebase.
- **No commented-out code** observed in any of the high-churn files.
- **No unused imports** — ESLint `no-unused-vars` is on; CI is clean.
- **No unused devDeps**: `pptxgenjs`, `react`, `react-dom`, `sharp`,
  `react-icons` are all imported by `docs/build-presentation.js`.
  `eslint`, `@eslint/js`, `globals` are active linters. Verified with
  `grep -r 'require\|import'`.
- `npm audit` reports 0 vulnerabilities.

## Naming and clarity

- All slash command names follow `kebab-case` consistently.
- All script files use `kebab-case.js`. All test files use
  `kebab-case.test.js`.
- All gate file names follow `stage-NN[-area].json`. Verified in
  `consistency.test.js`.
- Constants are SHOUT_CASE (`LOCK_STALE_MS`, `REVIEW_DIR`, etc.).
  Consistent.
- No misleading names observed.
- No undocumented magic numbers other than Q-05.

## Code that's surprisingly good (preserve)

1. **Approval-derivation atomic write + lock pattern.** Correct
   stale-lock recovery, atomic temp-file rename, finally-block release.
2. **Bespoke schema validation** in `gate-validator.js` is crisp,
   ~50 LOC, no library bloat.
3. **`docs/build-presentation.js` modular slide functions.** 23
   per-slide functions, none over ~70 LOC. Easy to edit one slide
   without touching others; constants for icons and palette at module
   top.
4. **Bootstrap idempotency helpers** (`writeIfMissing`, `.local.*`
   preservation logic) are reusable and well-tested.
5. **Track routing as a readable table** in `pipeline.md` rather than
   computed logic. Anyone can audit which stage a track skips.
6. **All file lists in tests are explicit constants**, not glob
   discoveries — making it obvious when a file is added/removed and
   intentional which test asserts on which file.
