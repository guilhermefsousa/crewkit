---
name: crewkit-setup
description: "Scan your codebase and generate a complete context engineering setup: agents, instructions, memory files, and copilot-instructions.md."
---

# crewkit-setup

Scan the current project and generate a complete context engineering setup tailored to this codebase.

**You are the AI executing this.** Follow each phase in order. Do not ask the user questions. Scan, generate, report.

---

## Phase 1 — Reconnaissance

Scan the project to identify:
- **Stack & frameworks**: languages, build tools, test frameworks, package managers
- **Architecture**: monolith/microservices, key directories, entry points
- **Existing AI context**: any `.github/`, `.ai/`, `CLAUDE.md`, `AGENTS.md` files

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

### Step 2 — `.github/copilot-instructions.md`

```markdown
# [PROJECT NAME] — Copilot Instructions

## Overview
[1-2 sentences: what the project is, main stack]

**Stack:** [stacks]
**Architecture:** [key patterns]

---

## Hard rules (apply to every response)

[Numbered list of non-negotiable rules]

Details → `.ai/memory/conventions.md`

---

## Memory

- `.ai/memory/architecture.md` — system design
- `.ai/memory/conventions.md` — coding conventions
- `.ai/memory/commands.md` — build/test commands
- `.ai/memory/lessons.md` — known gotchas
```

### Step 3 — `.github/instructions/` (per-stack rules)

For each detected stack, create `[stack].instructions.md`:
```markdown
---
applyTo: "**/*.ts"
---
[Stack-specific rules: error handling, imports, typing, testing patterns]
```

### Step 4 — `.github/agents/` (agent definitions)

Create one file per agent: `explorer.agent.md`, `architect.agent.md`, `coder.agent.md`, `tester.agent.md`, `reviewer.agent.md`.

Each file:
```markdown
---
name: [Agent Name]
description: "[One-line role description]"
---
# [Agent Name]

**Role:** [role]
**Responsibilities:** [responsibilities]
**Approach:** [how it works]
**Output:** [what it produces]
```

---

## Phase 5 — Completion Report

After all files are generated, report to the user:

```
crewkit-setup complete

Generated:
  .ai/memory/                    (6 files)
  .github/copilot-instructions.md
  .github/instructions/          (per-stack rules)
  .github/agents/                (5 agents)

Stack detected: [stack]
Architecture:   [pattern]

Next steps:
  1. Review .github/copilot-instructions.md — adjust hard rules if needed
  2. Open Copilot Chat — context is now active
```
