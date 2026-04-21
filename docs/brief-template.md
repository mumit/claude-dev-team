# Brief template

Canonical shape for `pipeline/brief.md`. The PM agent writes to this
shape. Sections 1–5 are required on every track; sections 6–11 are
required on `/pipeline` and `/hotfix`, condensable to a single `## Risk
notes` line on `/quick`, `/config-only`, and `/dep-update` when every
dimension is genuinely trivial.

```markdown
# <Feature name>

## 1. Problem statement
<one paragraph — what user need does this address?>

## 2. User stories
- As a <user>, I want <action> so that <outcome>
- ...

## 3. Acceptance criteria
1. <observable behaviour, state, or response shape>
2. ...

## 4. Out of scope
- <thing nearby that could be mistaken for in-scope>
- ...

## 5. Open questions
- QUESTION: <text> @PM
- ...

---

## 6. Rollback plan
<one or two sentences. "Redeploy previous image tag" is a valid answer
if that's genuinely the plan.>

## 7. Feature flag / rollout strategy
<gated behind a flag? canary %? full rollout? "no flag" requires a
reason: small blast radius, reversible, etc. Flag introduction
requires a Principal ruling; flag toggle does not.>

## 8. Data migration safety
<any schema change, backfill, destructive migration? If yes: ordering
with deploy, window behaviour, reversibility. Otherwise: "None — no
data layer changes.">

## 9. Observability requirements
<one observable signal per acceptance criterion that could catch
regressions. Metric/log/trace name and threshold.>

## 10. SLO / error-budget impact
<direction and magnitude, or "None expected.">

## 11. Cost impact
<one-line estimate, or "None.">
```

## Example — feature-sized (full pipeline)

```markdown
# Email magic-link login

## 1. Problem statement
Users forget passwords frequently and the reset flow takes 3 clicks + an
email round-trip. A magic-link option reduces the "lost password" churn
we see at ~8% of weekly sign-ins.

## 2. User stories
- As a returning user, I want to sign in with just my email so that I
  don't have to remember a password.
- As a privacy-minded user, I want the link to expire so that email
  exposure doesn't become a persistent risk.

## 3. Acceptance criteria
1. POST /auth/magic-link with `{email}` returns 202 and triggers send
2. The email contains a link with a single-use token that expires 10
   minutes after issue
3. GET /auth/magic-link/verify?token=<t> returns 302 to /dashboard with
   a session cookie when the token is valid and unused
4. The same link returns 410 Gone when redeemed a second time or past
   expiry
5. Rate limit: max 3 link requests per email per hour, returns 429 on
   the 4th with a Retry-After header

## 4. Out of scope
- SMS or authenticator-app auth
- Social login providers
- Passwordless account *creation* (this is sign-in only)

## 5. Open questions
- QUESTION: what's the branding on the email template? @PM
- QUESTION: do we pre-populate the "sign in with password" form if the
  user clicks the link on a different device? @PM

## 6. Rollback plan
Feature is flag-gated (§7). If the flag is off, magic-link endpoints
return 404 and the UI hides the "email me a link" button. Rollback is
flipping the flag; no data cleanup needed because tokens auto-expire.

## 7. Feature flag / rollout strategy
New flag `auth.magic_link` (introduces a new flag — needs Principal
ruling per `/pipeline` rules). 10% canary for 48h, then 50%, then 100%.

## 8. Data migration safety
One new table `magic_link_tokens (id, email, token_hash, issued_at,
expires_at, redeemed_at)`. Migration is additive only; no changes to
existing tables. The migration runs before the app deploy; app reads
via the new repository only when the flag is on, so the data layer can
be quiet until rollout begins.

## 9. Observability requirements
- Counter `auth_magic_link_requested_total{email_domain}` for AC1
- Counter `auth_magic_link_sent_total{result=ok|bounced|rate_limited}` for AC1, AC5
- Counter `auth_magic_link_verify_total{result=ok|expired|reused|invalid}` for AC3, AC4
- Log level INFO for each state transition, ERROR for bounced sends
- Span `auth.magic_link.verify` around the verify handler

## 10. SLO / error-budget impact
Expected to reduce `auth_success_latency_p50` by ~1200ms (no password
typing). Might shift `auth_error_rate` slightly up during 10% canary
until email deliverability is tuned; alert threshold on
`auth_magic_link_sent_total{result=bounced}` > 2% should fire within
5 minutes of a deliverability issue.

## 11. Cost impact
One new SES sending domain (~$0/month, already in SES quota). One new
table on existing RDS (~negligible). Net: negligible.
```

## Condensed form — `/quick` or `/config-only` or `/dep-update`

```markdown
# Fix typo in onboarding copy

## 1. Problem statement
"Your acount" → "Your account" on /onboarding/welcome. Three user
reports this week.

## 2. User stories
- As a new user, I want correctly spelled onboarding copy so the product
  feels credible.

## 3. Acceptance criteria
1. /onboarding/welcome shows "Your account" (not "acount")

## 4. Out of scope
- No other copy changes

## 5. Open questions
- (none)

## Risk notes
Rollback: revert the commit. No flag, no migration, no new observability,
no SLO impact, no cost impact. Covered by the existing snapshot test
for /onboarding/welcome copy.
```

The condensed form is only valid when **every** risk dimension is
genuinely trivial. If any one of them would require more than a short
sentence, write the full sections.
