---
description: "Context engineering setup — scan codebase and generate AI context files (.cursor/rules, AGENTS.md, .ai/memory)"
alwaysApply: false
---

# crewkit-setup

Scan the current project and generate a complete context engineering setup tailored to this codebase.

**You are the AI executing this.** Follow each phase in order. Do not ask the user questions. Scan, generate, report.

---

## Phase 1 — Reconnaissance

Scan the project to identify:
- **Stack & frameworks**: languages, build tools, test frameworks, package managers
- **Architecture**: monolith/microservices, key directories, entry points
- **Existing AI context**: any `.cursor/`, `.github/`, `.ai/`, `CLAUDE.md`, `AGENTS.md` files

Write findings to `.crewkit/scan-phase1-recon.md`.

---

## Phase 2 — Codebase Mapping

Read representative source files (3-5 per layer: models, services, controllers, tests). Identify:
- Naming conventions, code style
- Core domain concepts and entities
- Test patterns and coverage approach
- CI/CD and build commands

Write findings to `.crewkit/scan-phase2-map.md`.

---

## Phase 3 — Profile Compilation

Synthesize phases 1-2 into a project profile:
- Stack summary
- Architecture summary
- Key commands (build, test, lint)
- Domain concepts
- Hard rules to enforce

Write profile to `.crewkit/last-scan.md`.

---

## Phase 4 — File Generation

Generate all files using the profile from `.crewkit/last-scan.md`.

### Step 1 — `.ai/memory/`

Create these files (all in English):
- `architecture.md` — system design, key components, data flow
- `conventions.md` — naming rules, patterns, anti-patterns
- `commands.md` — build, test, lint, run commands with flags
- `testing.md` — test strategy, frameworks, coverage approach
- `lessons.md` — known gotchas, non-obvious behaviors
- `state.md` — current sprint goal, recent changes, open issues

### Step 2 — `.cursor/rules/project.md`

```
---
description: "Project rules"
alwaysApply: true
---
# [PROJECT NAME] — Project Rules

## Overview
[1-2 sentences: what the project is, main stack]

**Stack:** [stacks]
**Architecture:** [key patterns]

---

## Hard rules

[Numbered list of non-negotiable rules from the profile]

---

## Memory

Reference files in `.ai/memory/` for detailed context:
- `.ai/memory/architecture.md` — system design
- `.ai/memory/conventions.md` — coding conventions
- `.ai/memory/commands.md` — build/test commands
```

### Step 3 — `.cursor/rules/` (per-stack rules)

For each detected stack (e.g., `typescript.md`, `python.md`), generate a rules file with:
```
---
description: "[Stack] coding rules"
globs: ["**/*.ts"] (or appropriate glob)
alwaysApply: false
---
[Stack-specific rules: error handling, imports, typing, testing patterns]
```

### Step 4 — `AGENTS.md`

Create a single `AGENTS.md` at the project root with all agents as `##` sections:

```markdown
# Agents

## Explorer
Role: Codebase reconnaissance and research.
[...]

## Architect
Role: System design and planning.
[...]

## Coder
Role: Implementation.
[...]

## Tester
Role: Test writing and validation.
[...]

## Reviewer
Role: Code review and quality.
[...]
```

Each agent section should include: Role, Responsibilities, Approach, Output format.

---

## Phase 5 — Completion Report

After all files are generated, report to the user:

```
crewkit-setup complete

Generated:
  .ai/memory/          (6 files)
  .cursor/rules/       (project.md + per-stack rules)
  AGENTS.md            (5 agents)

Stack detected: [stack]
Architecture:   [pattern]

Next steps:
  1. Review .cursor/rules/project.md — adjust hard rules if needed
  2. Open Cursor and start coding — context is active
```
