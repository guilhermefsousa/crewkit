---
name: crewkit-setup
description: "Scan your codebase and generate a complete context engineering setup: agents, skills, hooks, rules, memory, CLAUDE.md, settings.json, .mcp.json. One command, fully calibrated to your project."
---

Set up context engineering for this project.

---

# crewkit-setup

This skill scans the current project's codebase and generates a complete, calibrated context engineering setup. It produces agents, skills, hooks, rules, memory files, CLAUDE.md, settings.json, napkin.md, QUICKSTART.md, and .mcp.json — all tailored to the actual code, not generic boilerplate.

**You are the AI executing this skill.** Follow each phase in order. Do not skip phases. This is a fully autonomous flow — do NOT ask the user questions. Scan, generate, validate, report.

### Critical rules (read before starting)
1. **Language:** All generated files MUST be in **English**. User-facing output (reports during execution) matches the user's language.
2. **Zero questions:** Do not pause for user input except for re-run detection ([R]/[M]/[C]).
3. **Validate everything:** After all files are generated, run the completion checklist at the bottom of this document before reporting done.
4. **Persist to disk:** Write scan results to `.crewkit/` files at each phase. Read them back before generating. This survives context compaction.

---

## Pre-flight

### 1. Model check
- Opus or Sonnet: proceed normally.
- Haiku or unknown: log a warning in the report ("Shallow scan — Haiku model detected") and proceed. Do not ask.

### 2. Re-run detection
Check if `.crewkit/version` exists.

**First run:** proceed to Phase 0 (which handles backup if existing files are found).

**Re-run** (file exists) — present to the user:
> "crewkit setup detected (v[version]). What would you like to do?"
> - **[R] Regenerate** — backup existing setup to `.crewkit-backup/`, regenerate everything
> - **[M] Memory only** — re-scan codebase and update `.ai/memory/` + `CLAUDE.md` + agent context headers, preserve agents/hooks/skills
> - **[C] Cancel**

Wait for user choice. On [R] or [M]: existing `lessons-*.md` files with content are **preserved and merged**, not overwritten — these contain accumulated institutional knowledge.

---

## Phase 0 — Preparation

### Backup (if existing setup found)
If `.claude/` or `CLAUDE.md` or `.ai/memory/` exists:
1. Create `.crewkit-backup/` in project root
2. Copy existing files there with timestamp suffix
3. Report: "Existing setup backed up to `.crewkit-backup/`"

### Create directory structure
```
.claude/
  agents/
  hooks/
  rules/
  skills/
.ai/
  memory/
  plans/
.crewkit/
```

### Version tracking
Write the crewkit version to `.crewkit/version`:
```
0.1.0
```

### Update .gitignore
Append to `.gitignore` (create if missing, skip lines that already exist):
```gitignore
# crewkit — context engineering
.claude/settings.local.json
.crewkit/
.crewkit-backup/
```

Report: "Phase 0 complete. Directory structure created."

---

## Phase 1 — Reconnaissance (~30s)

Detect the project's technology stack and infrastructure. Use glob patterns and file reads — no deep code analysis yet.

### Stack detection
Scan for manifest files to identify stacks:

| Manifest | Stack |
|----------|-------|
| `*.csproj`, `*.sln`, `*.fsproj` | .NET |
| `package.json` (with framework deps) | Node.js (+ detect Express, Next.js, Nest, etc.) |
| `go.mod` | Go |
| `Cargo.toml` | Rust |
| `pyproject.toml`, `requirements.txt`, `setup.py` | Python (+ detect Django, FastAPI, Flask, etc.) |
| `pom.xml`, `build.gradle` | Java/Kotlin |
| `Gemfile` | Ruby |
| `mix.exs` | Elixir |
| `composer.json` | PHP |
| `pubspec.yaml` | Dart/Flutter |

For each detected stack, note the framework and version when available.

### Git analysis
- Recent contributors (last 30 days): `git shortlog -sn --since="30 days ago"`
- Commit message style: read last 10 commits, detect pattern (conventional commits, ticket refs, freeform)
- Code language: detect predominant natural language from commit messages and comments (EN, PT-BR, ES, etc.)
- Hotspot files: `git log --since="30 days ago" --name-only --pretty=format: | sort | uniq -c | sort -rn | head -20`

### CI/CD detection
Glob for:
- `.github/workflows/*.yml` → GitHub Actions
- `.gitlab-ci.yml` → GitLab CI
- `Jenkinsfile` → Jenkins
- `.circleci/config.yml` → CircleCI
- `azure-pipelines.yml` → Azure DevOps
- `bitbucket-pipelines.yml` → Bitbucket

### Infrastructure detection
Scan `docker-compose*.yml`, env files, config files for:
- **Databases:** PostgreSQL, MySQL, MongoDB, Redis, SQLite, Supabase
- **Message brokers:** RabbitMQ, Kafka, Azure Service Bus, SQS
- **Cloud services:** AWS, Azure, GCP (from SDK deps or config)
- **Monitoring:** Sentry, Grafana, Datadog, New Relic (from deps)

### Build & test command detection
For each stack, detect the build and test commands:

| Stack | Build command | Test command |
|-------|--------------|-------------|
| .NET | `dotnet build [sln-path]` | `dotnet test [test-project-path]` |
| Node.js | `npm run build` or `npx tsc` | `npm test` |
| Go | `go build ./...` | `go test ./...` |
| Rust | `cargo build` | `cargo test` |
| Python | N/A or `python -m build` | `pytest` or `python -m pytest` |
| Java (Maven) | `mvn compile` | `mvn test` |
| Java (Gradle) | `./gradlew build` | `./gradlew test` |
| Ruby | `bundle exec rake build` | `bundle exec rspec` |

Read `package.json` scripts, CI configs, or Makefiles to find the actual commands used in this project. Prefer project-specific over generic.

**Store results as: `ReconProfile`** — write to `.crewkit/scan-phase1-recon.md` for persistence.

Report: "Phase 1 complete. Detected: [stacks], [CI], [DBs], [build/test commands]."

---

## Phase 2 — Documentation scan (~1min)

Read existing human-written documentation to understand project context, conventions, and team norms.

### Files to scan

**Project documentation:**
- `README.md` (or `README.rst`, `readme.md`)
- `CONTRIBUTING.md`
- `docs/` directory (scan filenames, read key files)
- `ARCHITECTURE.md` or `docs/ARCHITECTURE.md`

**Existing AI context (from any IDE — preserve, don't discard):**
- Existing `CLAUDE.md` (if backed up from a previous setup)
- Existing `.ai/memory/` files (if backed up)
- `.cursorrules` or `.cursor/rules/*.md` (Cursor)
- `.github/copilot-instructions.md` or `.github/instructions/*.md` (GitHub Copilot)
- `.github/agents/*.agent.md` (Copilot agents)
- `AGENTS.md` (Cursor agents)

If any of these exist, read them and extract rules, conventions, and patterns to incorporate into the generated setup. This preserves context engineering work done in other IDEs.

### Extract
- Project description and purpose
- **Business domain** (what the product does, core entities, risk profile — e.g., "WhatsApp customer service platform, manages conversations, worst case = message loss or cross-tenant data leak")
- Setup instructions (how to run locally)
- Contribution guidelines
- Architecture overview (if documented)
- Naming conventions mentioned
- Any AI-specific instructions already in place (from any IDE)
- Predominant documentation language (EN, PT-BR, ES, etc.)

**Store results as: `DocsProfile`** — append to `.crewkit/scan-phase2-docs.md` for persistence.

Report: "Phase 2 complete. Found: [list of docs read]."

---

## Phase 3 — Structural map (~2min)

Map the project structure to understand modules, entry points, and test setup.

### Directory tree
Generate a depth-3 tree of the project, ignoring noise directories:
- Ignore: `node_modules`, `bin`, `obj`, `.git`, `dist`, `build`, `__pycache__`, `.next`, `target`, `vendor`, `.venv`

### Entry points
For each detected stack, find the main entry point(s):
- .NET: `Program.cs`, `Startup.cs`, or `*.Api` project
- Node.js: `package.json` → `main` or `scripts.start`
- Go: `main.go` or `cmd/` directory
- Python: `manage.py`, `app.py`, `main.py`, or `__main__.py`
- Rust: `src/main.rs` or `src/lib.rs`
- Java: class with `main()` method

### Module boundaries
Identify distinct modules/packages/projects and their relationships:
- .NET: each `.csproj` is a module; read `ProjectReference` for dependencies
- Node.js monorepo: `workspaces` in `package.json`, or `packages/` directory
- Go: module paths in `go.mod`
- Python: top-level directories with `__init__.py`

### Test setup
- Test framework: detect from deps (xUnit, NUnit, Jest, Vitest, pytest, Go testing, etc.)
- Test directories: where tests live
- Test naming convention: from existing test files
- Test infrastructure: builders, fakes, fixtures, helpers

### Migrations
- EF Core: count files in `Migrations/` directory, note latest
- Prisma: `prisma/migrations/`
- Alembic: `alembic/versions/`
- Rails: `db/migrate/`
- Other ORMs: detect from file patterns

**Store results as: `StructureProfile`** — write to `.crewkit/scan-phase3-structure.md` for persistence.

Report: "Phase 3 complete. [N] modules mapped, [M] test files found, [K] entry points identified."

---

## Phase 4 — Deep read (~5-15min)

This is the most important phase. Read representative source files to understand the project's actual patterns, conventions, and anti-patterns.

### File selection strategy
For each module detected in Phase 3, select up to 5 representative files:

1. **Most modified** in last 30 days (from git hotspot data in Phase 1)
2. **Most imported/depended on** (hub file — has the most reverse dependencies)
3. **Has corresponding test** (file with a matching test file)
4. **Entry point** of the module
5. **Largest file** (if not already covered — often contains the most complex logic)

**Limit:** max 25 files total across all modules. For large monorepos, focus on the 5 most active modules.

### What to read
Read each selected file **completely**. For each file, extract:

- **Architecture patterns:** DDD, Clean Architecture, MVC, hexagonal, event-driven, CQRS, microservices
- **Code patterns:** dependency injection, factory methods, builder pattern, repository pattern, middleware chain
- **Auth patterns:** JWT, session-based, OAuth, API keys, multi-tenant isolation
- **Error handling:** exceptions, Result types, error codes, try/catch patterns
- **Data access:** ORM patterns, raw SQL, repository interfaces, unit of work
- **Real-time:** WebSocket, SignalR, SSE, polling
- **Background processing:** queues, workers, cron jobs, hosted services
- **Caching:** Redis, in-memory, CDN
- **Entity conventions:** public/private constructors, factory methods, immutability
- **Naming conventions:** PascalCase, camelCase, snake_case, prefix/suffix patterns
- **Anti-patterns found:** files >500 lines, hardcoded secrets, SQL injection risks, missing input validation, no tests for module, god classes

### Targeted extractions (MANDATORY — these close specific quality gaps)

These are high-value extractions that generic pattern detection misses. Do ALL that apply:

**1. Constructor/DI signatures** — For every handler, service, or controller class that uses dependency injection, extract the constructor parameter list with types. Store as a table in the architecture output:
```
| Class | Constructor params |
|-------|------------------|
| SendMessageHandler | IConversationRepo, ITenantContext, IGatewayClient, ILogger<> |
```
This is critical for writing tests with hand-crafted fakes.

**2. Test infrastructure inventory** — Glob test directories for all classes matching `Fake*`, `Stub*`, `Mock*`, `*TestHelper*`, `*Builder*`, `*TestBase*`, `*Fixture*`. List each with its interface/purpose:
```
| Fake class | Implements | Location |
|-----------|-----------|----------|
| FakeConversationRepo | IConversationRepo | Tests.Unit/Fakes.cs |
```

**3. UI component library / Design system** — If the project has a frontend:
- Scan CSS files for `@layer components`, custom component classes, design tokens
- Scan component directories for reusable UI components (buttons, modals, inputs, icons)
- Extract the component contract (props/parameters, variants, rules)
- Store in conventions output as "Design System" section

**4. State machines** — Look for enums with `Status` or `State` in the name, classes with state transition methods, or files with explicit state machine patterns. Document:
- States and valid transitions
- Guard conditions
- Files involved

**5. Large files (>500 lines)** — These deserve extra attention. Read them fully and document:
- Why they're large (god class? complex domain logic? generated code?)
- Key internal patterns (closures, event handlers, timers, state management)
- Risks for modification (tight coupling, side effects, concurrency)
- For files with `setInterval`/`setTimeout`/timers: document timer lifecycle (create, clear, leak risks)

**6. Raw SQL / query patterns** — Find any raw SQL strings (not ORM-generated). Document:
- Whether they use parameterized queries or string interpolation (flag injection risks)
- Complex queries that future developers need to understand

### Confidence scoring
For each detected pattern, assign a confidence level:

| Confidence | Criteria | Action |
|------------|----------|--------|
| **HIGH** | 5+ files follow this pattern consistently | Generate as HARD rule in CLAUDE.md |
| **MEDIUM** | 2-4 files follow this pattern | Generate as rule with note "detected in N files" |
| **LOW** | 1 file or ambiguous | Observation only, do not generate rule |

### Parallel execution
If the project has 3+ distinct modules, use **parallel subagents** (explorer agents) to read files from different modules simultaneously. Each subagent reads its assigned files and returns a structured summary. Do NOT have each subagent read the entire codebase.

**Store results as: `DeepProfile`** — write to `.crewkit/scan-phase4-deep.md` for persistence.

**Context management:** Phase 4 is the most context-heavy phase. After completing it, if your context usage is high, use `/compact` before proceeding. The scan results are persisted in `.crewkit/` files — they survive compaction.

Report: "Phase 4 complete. [N] files analyzed across [M] modules. [K] patterns detected."

---

## Phase 5 — Health check (OPTIONAL)

**Only run if the user passed `--check-health` as an argument**, or if the user explicitly asked for health checking.

If not requested, skip entirely and proceed to Phase 6.

### Steps
1. Run the detected build command(s)
2. Run the detected test command(s)
3. Count: tests passed, tests failed, build warnings

**Store results as: `HealthProfile`** — write to `.crewkit/scan-phase5-health.md` for persistence.

Report: "Phase 5 complete. Build: [pass/fail]. Tests: [X passed, Y failed]."

---

## Phase 6 — Project Profile (present to user)

Compile all profiles into a single summary and present it to the user.

### Profile format

```markdown
# Project Profile — [project name]

## Domain
- **What it does:** [1-2 sentences from README/docs — e.g., "Multi-tenant WhatsApp customer service platform"]
- **Core entities:** [main business objects — e.g., "Conversations, Messages, Tickets, Operators"]
- **Risk profile:** [worst-case scenario — e.g., "Cross-tenant data leak, message loss, billing errors"]

## Stacks
- [stack 1] — [framework] [version]
- [stack 2] — [framework] [version]

## Architecture
- [detected patterns with confidence level]
- Module count: [N]
- Key modules: [list with brief descriptions]

## Conventions
- Language: [code language] | Docs: [doc language]
- Naming: [detected conventions]
- Entity pattern: [e.g., "private setters, factory methods" or "public constructors"]
- Test pattern: [framework, naming, structure]

## Infrastructure
- CI: [detected CI]
- DB: [databases]
- Monitoring: [tools]
- MCPs recommended: [list]

## Patterns (HIGH confidence — will become rules)
- [pattern 1]
- [pattern 2]

## Patterns (MEDIUM confidence — will become rules with note)
- [pattern 1] (seen in N files)

## Observations (LOW confidence — noted but no rules generated)
- [observation 1]

## Anti-patterns found
- [anti-pattern 1]
- [anti-pattern 2]

## Health (if checked)
- Build: [status]
- Tests: [X passed, Y failed]

## Commands
- Build: `[command]`
- Test: `[command]`
- Dev server: `[command]` (if detected)
```

### Save profile
Write the profile to `.crewkit/last-scan.md` for future reference.

### Present and proceed
Show the profile to the user as an informational report. Do NOT ask for confirmation — proceed directly to Phase 7. The user can adjust the generated files afterwards.

---

## Phase 7 — Generation

### MANDATORY: Reload scan data before generating

Before generating ANY file, re-read the persisted scan results to ensure they survive context compaction:
1. Read `.crewkit/last-scan.md` — the consolidated project profile
2. If `last-scan.md` is missing or incomplete, read the individual phase files:
   - `.crewkit/scan-phase1-recon.md` (stacks, commands, CI, infra)
   - `.crewkit/scan-phase2-docs.md` (documentation, language)
   - `.crewkit/scan-phase3-structure.md` (modules, tests, entry points)
   - `.crewkit/scan-phase4-deep.md` (patterns, confidence, anti-patterns)

This step is critical for large projects where context compaction may have evicted scan data.

---

Generate all files in order. This order is designed for **graceful failure** — if the process is interrupted, the user has the most valuable files first.

**If the user chose [M] (memory only):** generate steps 1-2 (memory + CLAUDE.md), then update the `<!-- crewkit:context-start -->` headers in existing agents (Step 3, header-only — do not overwrite agent body). Stop after that.

### Templates directory
Templates are located at `~/.claude/skills/crewkit-setup/templates/`. Read them from disk.
On Windows, `~` expands to `%USERPROFILE%` (typically `C:\Users\<username>`). Use the home directory path.

---

### Step 1 — `.ai/memory/` (AI-generated from scan)

Generate these files from the scan results. These are factual descriptions of the codebase — not opinions, not templates.

#### `architecture.md`
```markdown
# Architecture

## Overview
[1-2 paragraphs describing the project architecture, derived from Phase 3-4 analysis]

## Modules
| Module | Role | Key files |
|--------|------|-----------|
[one row per module detected]

## Layer rules
[dependency rules between modules — what can reference what]

## Key patterns
[patterns detected with HIGH confidence]

## Entry points
[main entry points per stack]

## Constructor/DI Signatures
[from targeted extraction #1 — table of handler/service classes with their constructor params]
| Class | Constructor params |
|-------|------------------|
[one row per DI class found]

## State Machines
[from targeted extraction #4 — states, transitions, guard conditions, files]

## High-Risk Files
[from targeted extraction #5 — files >500 lines with detailed analysis]
For each large file:
- File path and line count
- Why it's large (domain complexity, god class, generated)
- Internal patterns (closures, event handlers, timers, state management)
- Modification risks (coupling, side effects, concurrency)
- Timer lifecycle if applicable (create, clear, leak risks)
```

#### `conventions.md`
```markdown
# Conventions

## Naming
[detected naming conventions per stack]

## Code style
[patterns detected: entity construction, error handling, DI, etc.]

## Anti-patterns to avoid
[anti-patterns found during scan + universal ones]

## Design System
[from targeted extraction #3 — if frontend detected: component library, CSS tokens, component contracts]
[if no frontend: omit this section]

## Security checklist
- [ ] Input validation at system boundaries
- [ ] No hardcoded secrets
- [ ] Auth/authz on every endpoint
- [ ] Multi-tenant isolation (if applicable)
- [ ] No SQL injection (parameterized queries)
```

#### `commands.md`
```markdown
# Commands

## Build
[per-stack build commands]

## Test
[per-stack test commands, including filtered test commands]

## Dev
[dev server commands, if detected]

## Deploy
[deploy commands, if detected from CI]
```

#### `testing.md`
```markdown
# Testing

## Frameworks
[detected test frameworks per stack]

## Structure
[test directory layout, naming conventions]

## Helpers & infrastructure
[detected builders, fakes, fixtures]

## Test Infrastructure Inventory
[from targeted extraction #2 — complete table of fakes/stubs/mocks found]
| Fake/Stub class | Implements | Location |
|----------------|-----------|----------|
[one row per test double found]

## Run commands
[how to run tests per stack, including filtered]
```

#### `lessons.md`
```markdown
# Lessons Index

Domain-specific lessons are stored in separate files to keep context manageable.

| File | Domain |
|------|--------|
[one row per stack — e.g., lessons-dotnet.md, lessons-node.md, lessons-python.md]

## How to add lessons
After completing a task, if a durable lesson was learned, append it to the appropriate domain file:
- Format: `### [YYYY-MM-DD] <title>` followed by root cause, fix, and lesson
- Only add lessons that prevent future mistakes — not every fix is a lesson
```

Create empty `lessons-{stack}.md` files for each detected stack.

#### `state.md`
```markdown
# Project State

## Setup
- crewkit version: 0.1.0
- Setup date: [today's date]
- Stacks: [detected stacks]

## Current phase
[Initial setup — update as project evolves]
```

---

### Step 2 — `CLAUDE.md` (AI-generated from scan)

Generate the project's root `CLAUDE.md`. This is the most important generated file — it defines the AI's behavior for this project.

**Structure:**
```markdown
# [PROJECT NAME] — CLAUDE.md

Global rules for this repository. Subdirectories with CLAUDE.md define local rules (take precedence when more specific).

---

## Overview
[1-2 sentences: what the project is, main stack]
[Business domain from Phase 2: what it does, core entities, risk profile]

**Stack:** [stacks detected]
**Architecture:** [key patterns — e.g., "DDD + CQRS" or "MVC" or "microservices"]

---

## Hard rules (apply to ALL agents and ALL tasks)

[Only include rules with HIGH confidence from Phase 4. Number them.]

1. [Rule 1 — e.g., "Multi-tenant: TenantId always from JWT, never from request body"]
2. [Rule 2 — e.g., "Entities use private setters and Create() factory methods"]
3. [Rule 3]
...

Details for each rule -> `.ai/memory/conventions.md`

---

## Agent Discipline

- You are an **orchestrator**, not a worker. Use subagents for work.
- Never dump large raw logs or code — return structured summaries.

| Task | Subagent |
|------|----------|
| Find files, map dependencies | explorer |
| Implement feature or fix | coder |
| Write or validate tests | tester |
| Architecture decisions | architect |
| Code review | reviewer |

## Skills (slash commands)

`/full-workflow` (implement feature) | `/explore-and-plan` (map + plan) | `/hotfix` (production broken) | `/review-pr` (PR review)

## Architect Decision Gate — MANDATORY

1. Architect **raises options** with pros/cons — does NOT decide
2. Orchestrator **presents to user** and awaits explicit approval
3. With confirmed decisions -> creates the plan
4. Only then the coder is invoked

**Violation = rework.** Always include: recommended option, pros/cons, clear positioning.

## Test Safety Loop

1. Implement -> 2. Create/update tests -> 3. Run -> 4. Fix if FAIL -> 5. Review -> 6. Report success

> **ABSOLUTE BLOCK:** Never report success with failing tests. After 2 correction cycles, STOP and escalate.

---

## Project Memory (`.ai/memory/`)

Versioned context in git. Load **on demand by stack/task**, not everything:

| File | When to load |
|------|-------------|
| `architecture.md` | ALWAYS |
| `conventions.md` | ALWAYS |
| `commands.md` | When running build/test/deploy |
| `testing.md` | When creating or running tests |
| `lessons.md` | Index -> points to domain files |
| `lessons-{domain}.md` | When working on that specific domain |
| `state.md` | When needing context about phases/backlog |

**Memory update rule:** At end of task, if durable lesson -> append to `lessons-{domain}.md`. If state changed -> update `state.md`.

---

## Output Format

Always return:
- **Summary** — what was done
- **Files changed** — list with brief description
- **Tests** — pass/fail count
- **Risks / Next steps** — if any
```

**Customization from scan:**
- Hard rules come from HIGH confidence patterns in Phase 4
- Overview comes from Phase 2 (docs) + Phase 1 (stacks)
- Commands table uses detected build/test commands

---

### Step 3 — `.claude/agents/` (templates + context header injection)

Read all 5 agent templates from `~/.claude/skills/crewkit-setup/templates/agents/`:
- `explorer.md`
- `architect.md`
- `coder.md`
- `tester.md`
- `reviewer.md`

For each agent template, **inject a project context header** between the frontmatter and the body. This header ensures critical project facts are always available inline, even if the AI skips reading `.ai/memory/` files.

**Context header format:**
```markdown
---
name: [agent name]
model: [model]
description: "..."
---

<!-- crewkit:context-start -->
## Project: [project name]
- **Stack:** [detected stacks with versions]
- **Architecture:** [key patterns — e.g., "DDD + CQRS, multi-tenant via TenantId from JWT"]
- **Modules:** [top 5 modules with 1-word role each]
- **Build:** `[build command]` | **Test:** `[test command]`
- **Hard rules:** [3-5 most critical rules from CLAUDE.md, 1 line each]
- **High-risk areas:** [files >500 lines or flagged as complex in Phase 4]
- **Anti-patterns found:** [top 3 from scan]
<!-- crewkit:context-end -->

[rest of agent template unchanged]
```

**Rules for the context header:**
- Keep it under 15 lines — it's a quick-reference summary, not a replacement for `.ai/memory/`
- Only include facts from the scan with HIGH confidence
- The `crewkit:context-start/end` markers allow `crewkit update` to replace only this block without touching agent customizations
- On re-run with [R], regenerate the header. On [M] (memory-only), update headers in existing agents too.

Write calibrated agents to `.claude/agents/`.

---

### Step 4 — `.claude/rules/` (AI-generated per stack)

Generate one rule file per detected stack. Rules are enforced when the AI edits files in the relevant directories.

Each rule file:
```markdown
---
description: "[Stack] coding rules — applied when editing [glob pattern]"
globs: "[glob pattern for this stack's files]"
---

# [Stack] Rules

[Rules derived from HIGH and MEDIUM confidence patterns detected in Phase 4]
[Anti-patterns to avoid, detected from the codebase]
[Stack-specific conventions]
```

**MANDATORY: Convert targeted extractions into rules.** If Phase 4 found any of these, they MUST appear as rules:
- **Raw SQL with string interpolation** (extraction #6) → CRITICAL reviewer rule: "Flag `$"...'{variable}'..."` patterns — always use parameterized queries"
- **State machine transitions** (extraction #4) → rule: "State changes must follow documented transitions in `.ai/memory/architecture.md`"
- **Large files >500 lines** (extraction #5) → rule: "Changes to [file] require extra review — high coupling, document timer/closure lifecycle"
- **Missing input validation** (from anti-patterns) → rule: "Validate all external input at controller/handler boundary"

**Glob examples:**
- .NET: `src/**/*.cs` or `[ProjectName]/**/*.cs`
- Node.js: `src/**/*.{js,ts,jsx,tsx}`
- Python: `**/*.py`
- Go: `**/*.go`

**Generate a rule file for EVERY detected stack, including frontend.** If Blazor, React, Vue, Angular, or Svelte was detected, generate a frontend rule file with Design System enforcement from targeted extraction #3.

---

### Step 5 — `.claude/settings.json` + `.claude/napkin.md`

#### settings.json
Generate dynamically from scan results. The allow list has 3 layers:

**Layer 1 — Universal (always included):**
```json
"Read(*)",
"Edit(*)",
"Write(.ai/memory/*)",
"Write(.ai/plans/*)",
"Write(.claude/napkin.md)",
"Bash(git *)",
"Bash(cat *)",
"Bash(wc *)",
"Bash(mkdir *)",
"Bash(bash .claude/hooks/*)"
```

**Layer 2 — Stack-specific runtime (add per detected stack):**

| Stack | Permissions to add |
|-------|-------------------|
| .NET | `"Bash(dotnet *)"` |
| Node.js | `"Bash(node *)"`, `"Bash(npx *)"`, `"Bash(npm *)"` |
| Python | `"Bash(python *)"`, `"Bash(pip *)"`, `"Bash(pytest *)"` |
| Go | `"Bash(go *)"` |
| Rust | `"Bash(cargo *)"` |
| Java (Maven) | `"Bash(mvn *)"` |
| Java (Gradle) | `"Bash(./gradlew *)"` |
| Ruby | `"Bash(bundle *)"`, `"Bash(rake *)"` |

**Layer 3 — Infrastructure (add if detected):**

| Detected | Permission to add |
|----------|------------------|
| Docker | `"Bash(docker *)"`, `"Bash(docker compose *)"` |
| Makefile | `"Bash(make *)"` |

**Deny list (always):**
```json
"Bash(rm -rf *)",
"Bash(sudo *)"
```

**Hooks (always):**
```json
{
  "hooks": {
    "SessionStart": [
      { "hooks": [{ "type": "command", "command": "bash .claude/hooks/session-start.sh" }] }
    ],
    "PreToolUse": [
      { "matcher": "Edit|Write", "hooks": [{ "type": "command", "command": "bash .claude/hooks/protect-sensitive-files.sh" }] }
    ],
    "PostCompact": [
      { "hooks": [{ "type": "command", "command": "bash .claude/hooks/post-compact-recovery.sh" }] }
    ],
    "Stop": [
      { "hooks": [{ "type": "command", "command": "bash .claude/hooks/stop-quality-gate.sh" }] }
    ]
  }
}
```

Combine all three layers into a single `settings.json`. The result should look like a complete, valid JSON file with permissions + hooks.

**Note:** After Step 9 generates `.mcp.json`, come back and update `settings.json` with Layer 4 (MCP permissions) — see Step 9.

#### napkin.md
```markdown
# Napkin

## Now
- [Initial setup complete — start working]

## Blockers (production)
- [none detected — add as needed]

## Tech debt
- [anti-patterns found during scan, if any]

## Backlog
- [empty — add as needed]
```

---

### Step 6 — `.claude/hooks/` (templates + variable substitution)

Read all 4 hook templates from `~/.claude/skills/crewkit-setup/templates/hooks/`:
- `session-start.sh`
- `protect-sensitive-files.sh`
- `post-compact-recovery.sh`
- `stop-quality-gate.sh`

For each hook template, substitute the placeholders:

1. **`{{project_dir}}`** (session-start.sh, stop-quality-gate.sh) — replace with the project's absolute directory path
2. **`{{hard_rules}}`** (post-compact-recovery.sh) — replace with a numbered list of the hard rules from CLAUDE.md Step 2. These are the 5-15 non-negotiable project rules that MUST survive context compaction. Keep each rule to 1 line. Example:
   ```
   1. MULTI-TENANT: TenantId always from JWT, never from body
   2. ENTITIES: private setters, factory methods Create(...)
   3. TESTS: every feature/fix must have tests. Never report success with failing tests
   ```
3. **`{{build_gate}}`** (stop-quality-gate.sh) — replace with a bash block that:
   - Checks `git diff --name-only HEAD` for modified source files matching the detected stack extensions
   - If modified files exist, runs the detected build command
   - On build failure: echoes errors and `exit 1` (this prevents Claude from stopping with broken code)
   - On success or no modified files: falls through to the lessons check

   Example for a Node.js project:
   ```bash
   SRC_CHANGED=$(git diff --name-only HEAD 2>/dev/null | grep -E '\.(js|ts|jsx|tsx)$' | wc -l | tr -d '[:space:]')
   SRC_STAGED=$(git diff --cached --name-only 2>/dev/null | grep -E '\.(js|ts|jsx|tsx)$' | wc -l | tr -d '[:space:]')
   if [ "${SRC_CHANGED:-0}" -gt 0 ] || [ "${SRC_STAGED:-0}" -gt 0 ]; then
     BUILD_OUTPUT=$(npm run build 2>&1)
     if [ $? -ne 0 ]; then
       echo "QUALITY GATE FAILED — build broken:"
       echo "$BUILD_OUTPUT" | tail -20
       echo ""
       echo "Fix build errors before completing the task."
       exit 1
     fi
   fi
   ```

   For multi-stack projects, generate one check block per stack.

Write calibrated hooks to `.claude/hooks/`.

---

### Step 7 — `.claude/skills/` (templates, copied directly)

Read all 4 core skill templates from `~/.claude/skills/crewkit-setup/templates/skills/`:
- `full-workflow/SKILL.md`
- `hotfix/SKILL.md`
- `explore-and-plan/SKILL.md`
- `review-pr/SKILL.md`

Copy each skill template to `.claude/skills/[name]/SKILL.md`.

These skill templates are **stack-agnostic** by design — they reference `.ai/memory/commands.md` for build/test commands and `.ai/memory/` for project context. No variable substitution needed.

---

### Step 8 — `.claude/QUICKSTART.md` (onboarding guide)

Generate a quick start guide for developers joining the project:

```markdown
# Quick Start — Context Engineering Setup

This project uses crewkit for AI-assisted development. Here's how to use it.

## Day-to-day workflow
- `/full-workflow <task>` — complete flow: explore → code → test → review (features and non-trivial fixes)
- `/hotfix <problem>` — compressed flow for urgent production fixes (max 2 iterations)
- `/explore-and-plan <feature>` — map a module and plan before coding (recommended for LARGE tasks)
- `/review-pr [number]` — review a pull request

## How agents work together
The orchestrator routes work to specialized agents:
- **explorer** (Sonnet) — finds files, maps dependencies — read-only
- **architect** (Opus) — evaluates design options, recommends — read-only
- **coder** (Sonnet) — implements the smallest correct diff
- **tester** (Sonnet) — creates tests, runs full suite
- **reviewer** (Opus) — finds real bugs, high signal, no noise

## Project context lives in `.ai/memory/`
- `architecture.md` — modules, layers, dependencies
- `conventions.md` — naming, patterns, anti-patterns
- `commands.md` — build, test, deploy commands
- `testing.md` — test frameworks, helpers, fakes
- `lessons-{domain}.md` — lessons learned from production

## Enriching the setup over time
- After a production bug → add to `lessons-{domain}.md`
- After a recurring reviewer finding → add to `conventions.md`
- New operational command → add to `commands.md`
- Known security issue → add to reviewer agent's context header (`crewkit:context-start` block)
```

---

### Step 9 — `.mcp.json` (MCP servers)

Generate `.mcp.json` based on detected infrastructure:

**Always include:**
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

**Add based on detection:**

| Detected | MCP to add |
|----------|-----------|
| PostgreSQL | `@modelcontextprotocol/server-postgres` with `{{connection_string}}` placeholder |
| MySQL | `@modelcontextprotocol/server-mysql` with `{{connection_string}}` placeholder |
| MongoDB | `mongodb-mcp-server` with `{{connection_string}}` placeholder |
| Redis | `redis-mcp-server` with `{{connection_string}}` placeholder |
| Supabase | `@supabase/mcp-server` with `{{project_ref}}` and `{{access_token}}` placeholders |
| Sentry | `@sentry/mcp-server` with `{{dsn}}` placeholder |
| Grafana | `@grafana/mcp-server` with `{{url}}` and `{{token}}` placeholders |
| Vercel | `@vercel/mcp-server` with `{{token}}` placeholder |
| Linear | `@linear/mcp-server` with `{{api_key}}` placeholder |
| Atlassian | `@anthropic/mcp-server-atlassian` with `{{url}}` and `{{token}}` placeholders |
| Slack | `@anthropic/mcp-server-slack` with `{{bot_token}}` placeholder |

For any placeholder tokens, add a comment in the profile or tell the user to fill them in.

**After generating .mcp.json, update `settings.json`:**
1. Add `"enableMcpServerCreation": false` to the top-level settings
2. Add MCP tool permissions (Layer 4) to the allow list — for each server in `.mcp.json`, add `"mcp__[server-name]__query"`. Example: if `.mcp.json` has `postgres-dev`, add `"mcp__postgres-dev__query"`

---

## Final Report

After all generation steps, run the **Completion Checklist** (at the bottom of this document). Then present the summary:

```markdown
# crewkit setup complete

## Generated files
- `.ai/memory/` — [N] files (architecture, conventions, commands, testing, lessons, state)
- `CLAUDE.md` — project rules ([N] hard rules)
- `.claude/agents/` — 5 agents (explorer, architect, coder, tester, reviewer)
- `.claude/rules/` — [N] rule files ([list stacks])
- `.claude/settings.json` — permissions + hooks
- `.claude/hooks/` — 4 hooks (session-start, protect-sensitive, post-compact, stop-quality-gate)
- `.claude/skills/` — 4 skills (full-workflow, hotfix, explore-and-plan, review-pr)
- `.claude/napkin.md` — priorities board
- `.claude/QUICKSTART.md` — onboarding guide
- `.mcp.json` — [N] MCP servers
- Validation: [N]/15 checks passed

## Commands detected
- Build: `[command]`
- Test: `[command]`

## Recommended MCPs to configure
[List MCPs with placeholder tokens that need user input]

## Next steps
1. Review `CLAUDE.md` and adjust rules as needed
2. Fill in MCP tokens in `.mcp.json` (if applicable)
3. Commit the setup: `git add .claude/ .ai/ CLAUDE.md .mcp.json && git commit -m "chore: add crewkit context engineering setup"`
4. Run `/full-workflow <your-first-task>` to test the setup
```

---

## Error handling

- If a template file is missing from `~/.claude/skills/crewkit-setup/templates/`, warn the user and skip that file. Do not fail the entire setup.
- If git is not available, skip git-dependent analysis (Phase 1 hotspots, contributors). Proceed with reduced data.
- If the project has no code (empty repo, only docs), generate a minimal setup with TODOs.
- If a build/test command cannot be detected, leave it as `echo "TODO: configure build command"` in settings.json and commands.md.
- If the project is very large (50+ modules), limit Phase 4 deep read to the 5 most active modules and note the limitation.

---

## COMPLETION CHECKLIST (mandatory — verify before reporting done)

Before presenting the Final Report, go through EVERY item. Fix failures before reporting.

### Content checks
- [ ] `.ai/memory/architecture.md` — has constructor/DI signatures table (if project uses DI)
- [ ] `.ai/memory/conventions.md` — has Design System section (if frontend detected)
- [ ] `.ai/memory/testing.md` — has Fakes/Stubs inventory table (if test doubles detected)
- [ ] `.ai/memory/commands.md` — has build + test + dev commands for ALL detected stacks
- [ ] `CLAUDE.md` — hard rules present, all in English
- [ ] `.claude/agents/` — all 5 have `crewkit:context-start` header with real project data
- [ ] `.claude/QUICKSTART.md` — exists with workflow guide

### Validation checks (run these, don't just assume)
- [ ] `.claude/settings.json` — read back, verify valid JSON, has Write(.ai/memory/*), has stack permissions, has MCP permissions (Layer 4)
- [ ] `.mcp.json` — read back, verify valid JSON, has context7
- [ ] `.claude/hooks/*.sh` — run `bash -n` on each, all 4 pass syntax check
- [ ] `.claude/rules/` — at least 1 per detected stack, glob patterns match real files in project
- [ ] `.claude/skills/` — all 4 core skills have SKILL.md

### Integrity checks
- [ ] `.crewkit/last-scan.md` — exists with full profile including Domain section
- [ ] `.crewkit/scan-phase*.md` — all 4 phase files exist with content
- [ ] No Portuguese in any generated file (only in user-facing output)

Report checklist results as: "Validation: X/15 checks passed." If any failed, list which ones and why.
