# Design-spec template

Canonical shape for `pipeline/design-spec.md`. The Principal agent
writes to this shape on the full pipeline and `/design`. Lighter tracks
(`/quick`, `/config-only`, `/dep-update`) skip Stage 2 and do not
produce a design-spec.

```markdown
# <Feature name> — Design Spec

## 1. System design
<architecture diagram in text/ASCII + component boundaries>

## 2. Data models
<schemas with field types and constraints>

## 3. API contracts
<endpoints, request/response shapes, auth requirements>

## 4. Component ownership
| Area | Owner |
|---|---|
| `src/backend/` | dev-backend |
| `src/frontend/` | dev-frontend |
| `src/infra/` | dev-platform |

## 5. Non-functional requirements
<performance targets, security constraints, scalability>

## 6. Observability instrumentation
<one subsection per acceptance criterion from the brief — each naming
specific metric/log/trace primitives and thresholds>

## 7. Open technical questions
<QUESTION: ... @PM lines>

STATUS: DRAFT
```

## Why §6 is required (v2.2+)

The brief's §9 "Observability requirements" names *what* signals the
feature needs to emit. The spec's §6 names *where in the code* those
signals live: which function emits the metric, which log line carries
the context, which span wraps the critical path.

Without §6, instrumentation is an afterthought the devs improvise
during Stage 4 and reviewers catch inconsistently in Stage 5. With §6,
the dev work is "wire up the instrumentation named in the spec" — a
concrete deliverable, easy to review.

## Worked example — §6 for the magic-link feature

```markdown
## 6. Observability instrumentation

### AC1 — POST /auth/magic-link returns 202 and triggers send

- **Metric** (counter): `auth_magic_link_requested_total{email_domain}`
  - Incremented in `src/backend/auth/magic_link.ts:handleRequest()`
    at the start of the handler.
- **Metric** (counter): `auth_magic_link_sent_total{result=ok|bounced|rate_limited}`
  - Incremented in `src/backend/auth/magic_link.ts:sendLink()` on
    each branch of the send outcome.
- **Log** (INFO): `"magic link requested"` with fields `email_domain`,
  `rate_limited`, `request_id`. In `handleRequest()`.
- **Span**: `auth.magic_link.request` wrapping `handleRequest()`.

### AC3 — GET /auth/magic-link/verify redeems a valid token

- **Metric** (counter): `auth_magic_link_verify_total{result=ok|expired|reused|invalid}`
  - Incremented in `src/backend/auth/magic_link.ts:verify()` before
    returning.
- **Log** (INFO for ok, WARN for expired/reused, ERROR for invalid):
  `"magic link verify"` with fields `result`, `age_seconds`, `request_id`.
- **Span**: `auth.magic_link.verify` wrapping `verify()`.
- **Alert**: `auth_magic_link_verify_total{result=invalid}` > 10/min
  sustained for 5 min — paging alert (could indicate token enumeration).

### AC4 — Redeemed or expired links return 410

Same instrumentation as AC3 — the `result=expired` and `result=reused`
labels cover the negative paths.

### AC5 — Rate limit: 3 per email per hour, 429 on the 4th

- **Metric** (counter): `auth_magic_link_sent_total{result=rate_limited}`
  — already declared in AC1. Its `rate_limited` label drives AC5
  visibility; no additional primitive needed.
- **Log** (INFO): `"magic link rate limited"` with fields `email_domain`,
  `attempt_number`. In the rate-limit middleware.
```

## Validation

The Principal agent self-checks §6 against the brief before moving the
spec status from `DRAFT` to `APPROVED`:

- Every acceptance criterion in the brief has at least one named
  instrumentation primitive in §6.
- Every SLO named in brief §10 has at least one corresponding SLI in §6
  (metric or trace that feeds the SLO's calculation).

Reviewers in Stage 2b should flag any acceptance criterion that lacks
an instrumentation footprint as a BLOCKER concern on
`pipeline/design-review-notes.md`.
