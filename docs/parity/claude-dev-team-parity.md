# Claude Dev Team Parity Checklist

Last updated: 2026-05-01

This checklist tracks whether `codex-dev-team` is on par with the local
`claude-dev-team` framework. Release notes remain deferred until v1.0.

## Summary

| Area | Status | Notes |
|---|---|---|
| Commands | On par | Claude slash commands have Codex npm/CLI equivalents. |
| Pipeline tracks | Restructured (see Stage Numbering Divergence) | full, quick, nano, config-only, dep-update, and hotfix are represented. |
| Gates | On par | JSON gates, schemas, track contracts, validation, and auto-fold helpers exist. |
| Roles | On par | PM, Principal, Backend, Frontend, Platform, QA, Security, and Reviewer (8 agents) prompts exist. |
| Deployment adapters | Better | Codex has explicit adapter docs for Docker Compose, Kubernetes, Terraform, and custom scripts. |
| Status/roadmap automation | Better | Codex has JSON status, next, and roadmap outputs. |
| Rules | On par | Claude rule set has Codex-native equivalents under `.codex/rules/`. |
| Skills | On par | Claude convention, review, security, implementation, and pre-PR skills are represented under `.codex/skills/`. |

## Command Parity

| Claude command | Codex equivalent | Status |
|---|---|---|
| `/adr` | `npm run adr -- "<title>"` | Ported |
| `/ask-pm` | `npm run ask-pm` | Ported |
| `/audit` | `npm run audit -- "<scope>"` | Ported |
| `/audit-quick` | `npm run audit:quick -- "<scope>"` | Ported |
| `/config-only` | `npm run config-only -- "<change>"` | Ported |
| `/dep-update` | `npm run dep-update -- "<update>"` | Ported |
| `/design` | `npm run design -- "<feature>"` | Ported |
| `/health-check` | `npm run health-check` | Ported |
| `/hotfix` | `npm run hotfix -- "<bug and fix>"` | Ported |
| `/nano` | `npm run nano -- "<change>"` | Ported |
| `/pipeline` | `npm run pipeline -- "<feature>"` | Ported |
| `/pipeline-brief` | `npm run pipeline:brief -- "<feature>"` | Ported |
| `/pipeline-context` | `npm run pipeline:context` | Ported |
| `/pipeline-review` | `npm run pipeline:review` | Ported |
| `/principal-ruling` | `npm run principal-ruling -- "<question>"` | Ported |
| `/quick` | `npm run quick -- "<change>"` | Ported |
| `/reset` | `npm run reset` | Ported |
| `/resume` | `npm run resume -- <stage> "<reason>"` | Ported |
| `/retrospective` | `npm run retrospective` | Ported |
| `/review` | `npm run review:derive` and `pre-pr-review` skill | Ported |
| `/roadmap` | `npm run roadmap` | Ported |
| `/stage` | `npm run stage -- <name>` | Ported |
| `/status` | `npm run status` | Ported |

## Rule Parity

| Claude rule | Codex coverage | Status |
|---|---|---|
| `pipeline.md` | `.codex/rules/pipeline.md` | Ported |
| `gates.md` | `.codex/rules/gates.md` plus schemas | Ported |
| `coding-principles.md` | `.codex/rules/coding-principles.md` | Ported |
| `compaction.md` | `.codex/rules/compaction.md` | Ported |
| `escalation.md` | `.codex/rules/escalation.md` plus `ESCALATE` gates | Ported |
| `orchestrator.md` | `.codex/rules/orchestrator.md`, `scripts/codex-team.js`, and `npm run next` | Ported |
| `retrospective.md` | `.codex/rules/retrospective.md`, retrospective stage, and lessons helper | Ported |

## Skill Parity

| Claude skill | Codex coverage | Status |
|---|---|---|
| `implement` | `.codex/skills/implement/SKILL.md` | Ported |
| `pre-pr-review` | `.codex/skills/pre-pr-review/SKILL.md` | Ported |
| `api-conventions` | `.codex/skills/api-conventions/SKILL.md` | Ported |
| `code-conventions` | `.codex/skills/code-conventions/SKILL.md` | Ported |
| `review-rubric` | `.codex/skills/review-rubric/SKILL.md` | Ported |
| `security-checklist` | `.codex/skills/security-checklist/SKILL.md` plus `security:check` | Ported |

## Codex Improvements Beyond Claude

- npm/CLI shims work in non-Claude environments.
- Bootstrap installs into Node and non-Node projects without forcing package metadata.
- Status, roadmap, and next commands support JSON output for automation.
- Deployment adapters are documented and configured locally.
- Track-aware `next`, `prompt`, and `autofold` helpers reduce manual orchestration.
- Gate schemas and contract tests guard framework drift.

## Stage Numbering Divergence

Codex collapsed claude's two pre-review gates (Stage 4.5a and 4.5b) into a
single codex Stage 5 pre-review step. This shifts all later stage numbers by
one relative to claude's numbering.

| claude stage | codex stage |
|---|---|
| 1 Requirements | 1 Requirements |
| 2 Design | 2 Design |
| 3 Clarification | 3 Clarification |
| 4 Build | 4 Build |
| 4.5a Pre-review | 5 Pre-review (lint/types/SCA) |
| 4.5b Security review (conditional) | 5 Pre-review records `security_review_required` |
| 5 Peer review | 6 Peer review |
| 6 Tests | 7 QA |
| 7 PM sign-off | 8 Sign-off (folded with deploy) |
| 8 Deploy | 8 Deploy |
| 9 Retrospective | 9 Retrospective |

Collapsing 4.5a/b reduces gate count by 1 in the common case (when no security
review is triggered). Security is still fully gated: the pre-review step
records `security_review_required: true` when the `security:check` heuristic
matches, and the pipeline halts for a security review before advancing to peer
review. Projects that always require security review can set
`security.always_required: true` in `.codex/config.yml`; the collapsing only
eliminates one extra JSON gate file, not the security check itself.

## v1.0 Blockers

- None. `npm run parity:check` now fails if any command row, required rule,
  required skill, partial area, or v1.0 gap is present.
