---
name: crewkit-setup
description: "Scan your codebase and generate a complete context engineering setup: agents, skills, instructions, prompts, memory files, and copilot-instructions.md."
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

**IMPORTANT: No frontmatter. Plain Markdown only.**

```markdown
# [PROJECT NAME] — Copilot Instructions

> These instructions apply to all GitHub Copilot interactions in this repository.

## Overview
[1-2 sentences: what the project is, main stack]

**Stack:** [stacks]
**Architecture:** [key patterns]

---

## Hard rules (apply to every response)

[Numbered list of non-negotiable rules]

Details → `.ai/memory/conventions.md`

---

## Session start

At the start of every conversation:
1. Read `.ai/memory/architecture.md` and `.ai/memory/conventions.md`
2. Check `git log --oneline -5` for recent work context

---

## Quality gate

Before completing any task:
1. Run the build command: `[detected build command]`
2. Run the test command: `[detected test command]`
3. Never report success with failing tests or broken builds

---

## Safety rules

- Never edit sensitive files: `.env`, `.env.*`, `credentials.*`, `secrets.*`, `*.key`, `*.pem`
- Never execute destructive commands: `rm -rf`, `sudo`, `DROP DATABASE`, `git push --force`

---

## Memory

- `.ai/memory/architecture.md` — system design
- `.ai/memory/conventions.md` — coding conventions
- `.ai/memory/commands.md` — build/test commands
- `.ai/memory/testing.md` — test strategy
- `.ai/memory/lessons.md` — known gotchas

---

## Output Format

Always return:
- **Summary** — what was done
- **Files changed** — list with brief description
- **Tests** — pass/fail count (if tests were run)
- **Risks / Next steps** — if any

> Always think step by step. Never report success with failing tests.
```

### Step 3 — `.github/instructions/` (per-stack rules)

For each detected stack, create `[stack].instructions.md`:
```markdown
---
applyTo: "**/*.ts"
---
# [Stack] Rules

[Stack-specific rules: error handling, imports, typing, testing patterns]
```

Also generate a sensitive files guardrail:

**File:** `.github/instructions/sensitive-files.instructions.md`
```markdown
---
applyTo: "**/.env*,**/credentials*,**/secrets*,**/*.key,**/*.pem,**/appsettings.*.json"
---
# Sensitive Files — Do Not Edit

- NEVER modify these files directly
- NEVER write secrets, API keys, or passwords into any file
- Move all secrets to environment variables
```

### Step 4 — `.github/agents/` (agent definitions)

Create one file per agent: `explorer.agent.md`, `architect.agent.md`, `coder.agent.md`, `tester.agent.md`, `reviewer.agent.md`.

Each file:
```yaml
---
name: [agent-name]
description: "[One-line role description]"
model: "Claude Sonnet 4"
tools:
  - read
  - search
---
```

Tool aliases per agent:
- explorer/architect/reviewer → `["read", "search"]`
- coder/tester → `["read", "edit", "search", "execute"]`

Model per agent:
- explorer/coder/tester → `"Claude Sonnet 4"`
- architect/reviewer → `"Claude Opus 4"`

Body includes: Role, Responsibilities, Approach, Output format.
Body max: 30,000 characters.

### Step 5 — `.github/skills/` (native skills)

Copy and adapt each core skill:
- `full-workflow/SKILL.md`
- `hotfix/SKILL.md`
- `explore-and-plan/SKILL.md`
- `review-pr/SKILL.md`

Frontmatter format:
```yaml
---
name: "full-workflow"
description: "Execute the complete development workflow: explore, implement, test, review."
user-invocable: true
---
```

### Step 6 — `.github/prompts/` (IDE fallback)

For each skill, create a simplified prompt file as fallback:
```yaml
---
description: "Complete development workflow: explore, implement, test, and review."
agent: "agent"
tools:
  - read
  - edit
  - search
  - execute
---
# [Skill Name]

[Simplified single-turn workflow steps]
```

---

## Phase 5 — Completion Report

After all files are generated, report to the user:

```
crewkit-setup complete

Generated:
  .ai/memory/                    (6 files)
  .github/copilot-instructions.md
  .github/instructions/          (per-stack rules + sensitive-files guardrail)
  .github/agents/                (5 agents)
  .github/skills/                (4 native skills)
  .github/prompts/               (4 IDE fallback prompts)

Stack detected: [stack]
Architecture:   [pattern]

Next steps:
  1. Review .github/copilot-instructions.md — adjust hard rules if needed
  2. Open Copilot Chat — context is now active
  3. Try: @coder implement [task] or /full-workflow [task]
```
