# Example: Project-Specific Audit Extensions

To add project-specific checks to the audit, create a file called
`docs/audit-extensions.md` in your project. The `/audit` command
automatically reads this file and runs your extensions after each phase.

## Format

Each section names the phase it extends and describes the additional checks
to run. Results are appended to the relevant `docs/audit/` file under a
`## Project-Specific` heading.

## Example (Pegasus GenAI Platform)

```markdown
# Audit Extensions — Pegasus

## After Phase 1 (Convention Compliance)

Read CLAUDE.md (specifically "Coding Standards" and "Platform Compliance").
Audit every file in usecases/ and packages/ against those rules:

- LLM access through LiteLLM proxy only (get_base_chat_llm)
- Logging via safe_logger only (no print, no raw logging)
- Arize tracing at app startup
- BQ audit logging on all endpoints
- Secrets via Config.fetch() only (no os.environ)
- LLM clients in lifespan, not request handlers
- Platform helper reuse (token counting, guardrails, error handling, etc.)
- Test markers (@pytest.mark.unit or @pytest.mark.endpoint)

Append to: docs/audit/03-compliance.md

## After Phase 2 (Performance & Reliability)

Check Pegasus-specific performance patterns:
- LiteLLM proxy usage (no direct provider calls)
- Streaming endpoints using send_response_from_generate_func()
- FastAPI lifespan for initialization (no import-time globals)
- Secret Manager calls at startup vs. per-request
- Turbopuffer collection reuse and pagination
- Firestore read batching

Append to: docs/audit/07-performance.md

## After Phase 3 (Roadmap)

Add deployment sequencing:
- Shared package changes → identify dependent usecases
- New secrets/config → note Terraform PR needed first
- Deployment method → auto-deploy vs. blue/green
- Multi-usecase changes → independent or coordinated deploy
- NP vs. Prod environment differences

Update: docs/audit/10-roadmap.md (inline on each item)
```

## How to Write Your Own

1. Identify what's unique about your project's stack and conventions
2. Write checks that automated linters can't catch
3. Reference your project's CLAUDE.md or convention docs by name
4. Specify which `docs/audit/` file to append results to
5. Keep it focused — the generic phases already cover general concerns
