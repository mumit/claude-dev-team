# Concepts

Five building blocks make up the framework. New contributors and users
frequently ask what the difference is between them — this page is the
one-stop answer.

| Concept | Lives in | Invoked by | Purpose |
|---------|----------|------------|---------|
| **Agent** | `.claude/agents/*.md` | The orchestrator (main session) spawns it via the `Agent` tool | A specialist (PM, Principal, dev-backend, dev-frontend, dev-platform, dev-qa, security-engineer, reviewer — 8 total) with a focused system prompt, its own tool allowlist, and — optionally — its own model. |
| **Command** | `.claude/commands/*.md` | User types `/command-name` | A slash command. Drives a multi-step workflow from the user's side of the transcript (e.g. `/pipeline`, `/audit`, `/status`). |
| **Skill** | `.claude/skills/<name>/SKILL.md` | An agent or the orchestrator reads and follows it | Reusable procedural knowledge or checklist (e.g. `implement`, `code-conventions`, `review-rubric`). Skills are instructions, not executors. |
| **Rule** | `.claude/rules/*.md` | Loaded by the orchestrator at startup | Canonical, machine-and-human-readable definitions of pipeline stages, gate schema, escalation, and compaction behavior. Rules are what the orchestrator must obey. |
| **Hook** | `.claude/hooks/*.js` + `.claude/settings.json` | Claude Code runs them on configured events | Deterministic code that runs outside the LLM — e.g. `gate-validator.js` enforces gate-file schema after each subagent stop; `approval-derivation.js` parses Stage 5 review files and derives approval gates after each write. Hooks are the non-negotiable safety layer. |

## How they compose

A typical `/pipeline` run touches all five:

1. The user types **`/pipeline add login`** — a **command**.
2. The command's markdown file tells the orchestrator to read the
   **rules** in `.claude/rules/pipeline.md` and follow the stage order.
   The orchestrator also reads `pipeline/lessons-learned.md` (if it exists)
   — durable lessons promoted from past retrospectives that shape every stage.
3. Stage 1 spawns the **PM agent**. The PM's frontmatter points it at the
   `code-conventions` **skill** to align on terminology.
4. When the PM agent stops, Claude Code fires the configured **hook**
   (`gate-validator.js`) which reads the newest gate file and exits
   non-zero if it's malformed or FAIL — halting the pipeline.
5. After Stage 8 (Deploy), Stage 9 (Retrospective) runs automatically:
   all agents (seven to eight, depending on whether Stage 4.5b fired) contribute
   lessons to `pipeline/retrospective.md`, and the Principal promotes up to two
   to `pipeline/lessons-learned.md` so the next run starts smarter.

## Rules of thumb

- **Writing a new workflow the user triggers?** Add a command.
- **Writing a new specialist role?** Add an agent.
- **Writing a checklist or procedure that multiple agents should follow the same way?** Add a skill.
- **Writing a pipeline-level contract (stage definition, gate shape)?** Edit a rule.
- **Writing something that must run deterministically without the LLM's judgment?** Write a hook.

## See also

- `CONTRIBUTING.md` — how to add a new command, skill, or agent (with frontmatter requirements)
- `.claude/rules/orchestrator.md` — the orchestrator's startup procedure
- `.claude/rules/gates.md` — gate JSON schema
- `AGENTS.md` — full list of agents, commands, and skills with one-line summaries
