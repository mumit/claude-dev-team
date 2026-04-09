---
description: >
  Run a monthly codebase health check. Compares current state against
  prior audit findings, checks for new violations, stale docs, untested
  new code, and roadmap progress. Use on a regular cadence (monthly) or
  whenever you want a quick pulse check on codebase health.
---

# /health-check

You are running a codebase health check.

## Startup

1. Read CLAUDE.md if it exists
2. List files in `docs/audit/` and read each one for prior findings
3. Check for `docs/audit-extensions.md`

If `docs/audit/` doesn't exist or has no files: this project hasn't been
audited yet. Tell the user: "No prior audit found. Run `/audit` or
`/audit-quick` first to establish a baseline, or I can run a lightweight
first-pass check now." If they want the lightweight check, proceed with
the "No Prior Audit" section below.

## With Prior Audit

Compare the current codebase against the prior findings:

1. **New convention violations** — re-scan against `docs/audit/03-compliance.md`. Any new violations introduced since the last check?

2. **New untested components** — check for new modules, packages, or services added since the last audit. Do they have tests? Documentation?

3. **Dependency changes** — look at recent changes to dependency files (package.json, pyproject.toml, etc.). New dependencies justified?

4. **Stale documentation** — check if READMEs and docs reference things no longer in the code.

5. **TODO/FIXME/HACK age** — search for these markers. Use `git blame` to estimate age. Flag any over 30 days old.

6. **Roadmap progress** — if `docs/audit/10-roadmap.md` exists, check which items have been completed (look for `[DONE]` markers and recent git history). Which are stalled?

If extensions exist in `docs/audit-extensions.md`, run those checks too.

## No Prior Audit (lightweight)

Run a quick first-pass:
1. Read top-level README, CLAUDE.md, CONTRIBUTING.md
2. Count modules/packages/services, check which have tests
3. Look for obvious issues: hardcoded secrets, missing .gitignore, print statements
4. Check for linter config and whether it passes

## Output

Write the report to `docs/audit/health-check-YYYY-MM.md` using the current
year and month.

Structure:
```markdown
# Health Check — [Month Year]

## Summary
[3-5 bullet points of most important findings]

## New Issues
[Issues found since last check]

## Resolved Issues
[Issues from prior audit/checks that are now fixed]

## Roadmap Progress
[Items completed, items stalled, re-prioritization needed]

## Recommended Actions This Month
[Top 3-5 things to focus on]
```

Print the summary section to the conversation as well.
