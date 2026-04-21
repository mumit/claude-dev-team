# Runbook template

Every feature that reaches Stage 8 must ship with a `pipeline/runbook.md`
that names, at minimum, the rollback procedure and the health signals
an on-call engineer should watch. From v2.4 forward, the Stage 8 gate
fails if this file is absent.

The runbook is not documentation for the happy path — that's what the
feature's README is for. The runbook is what to do when the feature
breaks in production: who to page, what to roll back to, what "healthy"
looks like, what the escalation path is when the rollback itself
fails.

## Template

```markdown
# Runbook — <feature name>

**Deployed**: <ISO timestamp> (from pipeline/deploy-log.md)
**Owner**: <team or rotation>
**Paging channel**: <e.g. #oncall-payments, PagerDuty service ID>

## Summary
<one paragraph — what this feature does, why it can break, what
typical failure modes look like>

## Health signals

The feature is healthy when:
- <metric 1 from brief §9> is within expected range of <X–Y>
- <log signal 2> appears at least N times per minute during business hours
- <trace / span 3> completes in < P95 ms

Dashboards:
- <dashboard URL or name, if one exists>
- Alert rules: <alert name 1>, <alert name 2>

If these signals degrade, escalate per §Escalation below.

## Rollback

### Trigger conditions
- <explicit threshold that indicates "roll back now"> — e.g.
  "HTTP 5xx rate > 1% sustained for 5 min"
- <explicit symptom> — e.g. "user reports of login failures"

### Procedure
<Adapter-specific. Examples:>

**docker-compose adapter:**
```bash
# 1. Revert to prior image tag
docker compose down
git checkout <previous-sha>
docker compose up -d --wait

# 2. Verify health
curl -sf https://localhost:8000/health
```

**kubernetes adapter:**
```bash
kubectl --context=<context> --namespace=<ns> \
  rollout undo deployment/<name>
kubectl --context=<context> --namespace=<ns> \
  rollout status deployment/<name>
```

**terraform adapter:**
```bash
git checkout <known-good-state-sha>
terraform -chdir=<working_dir> apply <var_files...>
```

### Post-rollback verification
- Confirm health signals from §Health signals are back in range
- Announce in <channel> with start/end timestamps

## Feature flag / kill switch

<If brief §7 specified a flag, name it here and the exact toggle
procedure. If no flag, state "No flag — rollback is the only
mitigation.">

```bash
# Example: disable the feature via the flag service
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://flags.example.com/flags/auth.magic_link \
  -d '{"enabled": false}'
```

## Data migration recovery

<If brief §8 named a migration, name the rollback order here. If the
migration is destructive, explicitly state what cannot be recovered
and where backups live.>

## Known failure modes

| Symptom | Likely cause | First action |
|---|---|---|
| <e.g. 401 on every request> | <token signing key rotated> | <consult §Rollback then page key-mgmt rotation owner> |
| <e.g. queue depth growing> | <worker not scaled> | <kubectl scale or docker compose scale; if persistent, rollback> |

## Escalation

Tier 1 (0–15 min): <on-call engineer for the owning team>
Tier 2 (15–60 min): <team lead or on-call manager>
Tier 3 (>60 min or failed rollback): <incident commander / IC channel>

If the rollback procedure in §Rollback itself fails, skip tier 1 and
page tier 2 directly.

## Reference links

- Design spec: `pipeline/design-spec.md` (or archive link)
- ADRs: `pipeline/adr/`
- Observability dashboards: <URLs>
- Related prior incidents: <ticket IDs>
```

## How much detail is enough?

The runbook is a forcing function, not a novel. A complete runbook for
a simple feature might be 30 lines — rollback is two commands, health
signals are one metric, escalation is one name. Don't pad.

The test is: "if I'm paged at 3am with no context, can I use this page
to get the system back to healthy?" If yes, it's long enough.

## What goes in the brief vs the runbook

The brief (§6 Rollback plan, §9 Observability, §10 SLO) names **what
exists**. The runbook names **how to use it** when things break.

A brief might say: "Rollback = redeploy previous image tag."
The runbook says: "The commands to redeploy the previous image tag are
`docker compose down && ... && docker compose up -d --wait`. The prior
tag is in the deploy log. Verify health by watching `http_5xx_rate`
on the main dashboard drop below 0.5% within 3 minutes."
