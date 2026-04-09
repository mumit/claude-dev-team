# Audit Phase Definitions

This file defines what each audit phase does. Read by the `/audit` and
`/audit-quick` commands. Do not load this file unless running an audit.

---

## Phase 0: Bootstrap

### 0.1 — Project Context

Read (in this order):
1. AI/editor instruction files (CLAUDE.md, AGENTS.md, .cursorrules, .windsurfrules, .github/copilot-instructions.md)
2. Contributor/process docs (CONTRIBUTING.md, CODE_OF_CONDUCT.md, .github/CODEOWNERS)
3. Top-level README
4. Build/dependency config (package.json, pyproject.toml, Cargo.toml, go.mod, Gemfile, pom.xml, build.gradle, CMakeLists.txt, Makefile, Taskfile, docker-compose.yml, etc.)
5. CI/CD config (.github/workflows/, .gitlab-ci.yml, Jenkinsfile, cloudbuild.yaml, .circleci/, etc.)
6. Linter/formatter config (eslint, prettier, ruff, rubocop, clippy, golangci-lint, editorconfig, etc.)
7. Top-level directory structure (list each major directory)

Produce:
- Languages and frameworks
- Build system and dependency manager
- Exact commands to: install deps, run app, run tests, lint, build
- Deployment target (cloud, container, serverless, etc.)
- Documented vs. undocumented-but-implied conventions
- Codebase size (file count, major directories, number of modules/services)
- Whether this is a monorepo or single app
- Surprises and open questions

Output file: `docs/audit/00-project-context.md`

### 0.2 — Architecture Map

Read `docs/audit/00-project-context.md`, then read source directories, entry points, config, and architecture docs.

Produce:
1. **Component inventory** — every major module/package/service. Purpose, entry point, internal dependencies.
2. **Dependency graph** — internal dependencies. Flag circular deps and high fan-in components.
3. **External integrations** — third-party libraries, APIs, databases, cloud services. Which components use which. Abstracted or direct.
4. **Data flow** — trace primary user-facing flows end to end. Multiple flows if they exist.
5. **Configuration surface** — env vars, config files, secrets, feature flags. Where defined, where consumed.
6. **What's working well** — sound architectural decisions to preserve and extend.

Output file: `docs/audit/01-architecture.md`

### 0.3 — Git History

Read `docs/audit/01-architecture.md`, then analyze git history.

Produce:
1. **Churn hotspots** — files/dirs with most commits in last 6 months. `git log --since="6 months ago" --pretty=format: --name-only | grep -v '^$' | sort | uniq -c | sort -rn | head -30`
2. **Co-change patterns** — files that change together (hidden coupling). `git log --since="6 months ago" --pretty=format:"---" --name-only | grep -v '^$'`
3. **Recent trajectory** — what's actively evolving vs. stable.
4. **Commit quality** — small/focused or large/unfocused. Review discipline.

If git history is shallow or unavailable, note it and skip.

Output file: `docs/audit/02-git-history.md`

---

## Phase 1: Health Assessment

### 1.1 — Convention Compliance

Read `docs/audit/00-project-context.md` and `docs/audit/01-architecture.md`.

Audit codebase for compliance with its own stated rules (READMEs, CONTRIBUTING.md, CLAUDE.md, linter configs, style guides, ADRs).

If no documented conventions: check for internal inconsistency — same thing done multiple ways.

For each finding:
- File and line number
- The convention or dominant pattern
- How this code deviates
- Suggested fix
- **Confidence: HIGH / MEDIUM / LOW**

Group by category (naming, error handling, architecture, logging, dependency usage).

End with "Possibly Intentional Deviations" — code that breaks a pattern but might do so for a good reason.

Output file: `docs/audit/03-compliance.md`

### 1.2 — Test Health

Read `docs/audit/01-architecture.md`.

Produce:
1. **Coverage map** — table: component | test count | test types | notes
2. **Untested critical paths** — business logic, error handling, integrations with no coverage
3. **Test quality issues** — empty assertions, implementation coupling, overbroad mocks, external service calls, missing edge cases, order dependencies
4. **Test infrastructure** — runner configured? CI runs tests? Currently passing? Coverage tool?
5. **What's well-tested** — positive examples to replicate

Output file: `docs/audit/04-tests.md`

### 1.3 — Documentation Gaps

Read `docs/audit/01-architecture.md`.

Produce:
1. **README quality** — complete / partial / missing
2. **Component docs** — which sub-modules have docs, which don't
3. **API documentation** — endpoints/interfaces documented? Accurate vs. code?
4. **Inline documentation** — complex logic explained? Places you had to read 3x to understand?
5. **Stale docs** — references to things that no longer exist
6. **Onboarding test** — what would a new developer struggle with?

Output file: `docs/audit/05-documentation.md`

---

## Phase 2: Deep Analysis

### 2.1 — Security Review

Read `docs/audit/00-project-context.md` and `docs/audit/01-architecture.md`.

Produce (adapted to project's language/framework):
1. **Secrets hygiene** — hardcoded keys/tokens/passwords. .gitignore coverage.
2. **Input handling** — validation, injection risks (SQL, command, template, path traversal, XSS, SSRF, deserialization)
3. **Auth & authz** — unprotected endpoints, inconsistent auth
4. **Dependency vulnerabilities** — lockfiles, update tooling, known CVEs
5. **Data exposure** — PII/credentials in logs, error messages, API responses
6. **Cryptography** — current algorithms, hardcoded IVs, weak hashes, homegrown crypto

Rate each: Severity (critical/high/medium/low) + Confidence (HIGH/MEDIUM/LOW)

Output file: `docs/audit/06-security.md`

### 2.2 — Performance & Reliability

Read `docs/audit/01-architecture.md` and `docs/audit/02-git-history.md`.

Focus on highest-churn components and most external integrations:
1. **Resource lifecycle** — connection/client reuse, leaks
2. **Concurrency** — race conditions, blocking in async, unprotected shared state
3. **Error handling quality** — swallowed exceptions, catch-alls, leaked internals, missing retries
4. **Timeout discipline** — missing timeouts on external calls
5. **Scaling concerns** — in-memory state, unbounded queues, O(n²), missing pagination
6. **Observability** — structured logging, metrics, tracing, health checks
7. **Graceful degradation** — what happens when a dependency is down?

Output file: `docs/audit/07-performance.md`

### 2.3 — Code Quality

Read `docs/audit/01-architecture.md` and `docs/audit/02-git-history.md`.

Focus on highest-churn files first:
1. **Duplication** — significant duplicated logic. Shared abstraction potential. Intentional or accidental.
2. **Complexity hotspots** — deep nesting, high cyclomatic complexity, hard to understand
3. **Dead code** — unused imports, unreachable branches, commented-out blocks, orphaned files. Distinguish from dynamic usage.
4. **Abstraction health** — god classes, leaky abstractions, over-abstraction
5. **Naming and clarity** — misleading names, magic numbers, undocumented constants
6. **Dependency health** — unused deps, duplicates, very outdated

Rate each: Effort (small/medium/large) + Impact (high/medium/low) + Confidence (HIGH/MEDIUM/LOW)

Output file: `docs/audit/08-code-quality.md`

---

## Phase 3: Roadmap

### 3.1 — Synthesis & Prioritization

Read all files in `docs/audit/`.

1. Synthesize findings into 3-5 systemic themes.
2. Create prioritized backlog. For each item:
   - Title (action-oriented)
   - Theme
   - Description (2-3 sentences)
   - Affected components
   - Effort: XS / S / M / L / XL
   - Risk of change: low / medium / high
   - Risk of NOT changing: low / medium / high
   - Dependencies
   - Confidence: HIGH / MEDIUM / LOW

Categories: P0 (fix now), P1 (quick wins), P2 (targeted improvements), P3 (strategic investments), Parked (with reasoning).

Output file: `docs/audit/09-backlog.md`

### 3.2 — Sequenced Roadmap

Read `docs/audit/09-backlog.md`.

Sequence into batches:
- Batch 1 (immediate): P0 fixes
- Batch 2 (weeks 1-2): P1 quick wins grouped into logical PRs
- Batch 3 (weeks 3-6): P2 improvements ordered by dependency and risk
- Batch 4 (month 2+): P3 investments with mini-proposals

For each batch: items in order, what can be parallelized, verification criteria, infra changes needed, estimated effort.

End with "Roadmap Risks" — what could go wrong, what would trigger re-sequencing.

Output file: `docs/audit/10-roadmap.md`

---

## Extensions

If `docs/audit-extensions.md` exists, read it after completing each phase.
It contains project-specific checks to run as additions to the generic phases.
Run each extension check and append results to the relevant `docs/audit/` file
under a `## Project-Specific` heading.
