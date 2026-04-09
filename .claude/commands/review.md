---
description: >
  Review the current branch before creating a pull request. Checks
  correctness, conventions, tests, security, documentation, and audit
  anti-patterns. Use for changes made outside the /pipeline — direct
  edits, implement skill work, /hotfix runs. For pipeline Stage 5
  peer review, use /pipeline-review instead.
---

# /review

You are running a pre-merge code review.
Load the `pre-pr-review` skill and follow its instructions exactly.

The text after `/review` is optional:
- If a focus area is given (e.g., `/review security` or `/review tests`),
  prioritize that area but still run the full checklist.
- If no argument, run the full review.
