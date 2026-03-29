# Adapter: GitHub Copilot

This adapter is executed during Phase 7, Step 10 of `/crewkit-setup`.
You are the AI. Follow every instruction in this file to generate GitHub Copilot-compatible context files.

**Input:** Read `.crewkit/last-scan.md` for the project profile. The Claude Code files generated in Steps 1-9 are your source of truth.
**Output:** Files under `.github/` that mirror the Claude Code setup for GitHub Copilot.

---

## Rules for this adapter

1. All generated files MUST be in **English**.
2. Do NOT duplicate `.ai/memory/` — it is shared between all IDEs. No transformation needed.
3. `model:` frontmatter from `.claude/agents/*.md` is Claude Code-only — strip it.
4. Skills are lossy when converted to Copilot prompts — extract workflow intent only, drop multi-agent orchestration mechanics.
5. Create `.github/` subdirectories if they do not exist.

---

## Step C1 — `.github/copilot-instructions.md`

**Source:** `CLAUDE.md`
**Transformation:** Reformat for Copilot. Remove the Agent Discipline, Skills (slash commands), Architect Decision Gate, and Test Safety Loop sections — these are Claude Code-specific orchestration mechanics that do not apply to Copilot. Keep the hard rules, overview, memory loading instructions, and output format.

**Expected output format:**
```markdown
# [PROJECT NAME] — Copilot Instructions

## Overview
[1-2 sentences from CLAUDE.md overview — what the project is, main stack]
[Business domain: what it does, core entities, risk profile]

**Stack:** [stacks]
**Architecture:** [key patterns]

---

## Hard rules (apply to every response)

[Numbered list — copy from CLAUDE.md hard rules verbatim. These are non-negotiable.]

1. [Rule 1]
2. [Rule 2]
...

Details for each rule → `.ai/memory/conventions.md`

---

## Project Memory (`.ai/memory/`)

Load context on demand — do not load all files every time:

| File | When to load |
|------|-------------|
| `architecture.md` | Always — modules, layers, dependencies |
| `conventions.md` | Always — naming, patterns, anti-patterns |
| `commands.md` | When running build/test/deploy |
| `testing.md` | When creating or running tests |
| `lessons-{domain}.md` | When working on that domain |

---

## Output Format

Always return:
- **Summary** — what was done
- **Files changed** — list with brief description
- **Tests** — pass/fail count (if tests were run)
- **Risks / Next steps** — if any
```

**What to REMOVE from CLAUDE.md:**
- `## Agent Discipline` section (orchestrator/worker model is Claude Code-only)
- `## Skills (slash commands)` section (slash commands are Claude Code-only)
- `## Architect Decision Gate` section
- `## Test Safety Loop` section (keep the intent as a single sentence in the output format instead)

**What to ADD:**
- At the top, after the title: `> These instructions apply to all GitHub Copilot interactions in this repository.`
- In the output format section: `> Always think step by step. Never report success with failing tests.`

---

## Step C2 — `.github/instructions/*.instructions.md`

**Source:** `.claude/rules/*.md`
**Transformation:** Convert frontmatter to Copilot format. Keep glob patterns and all rule content unchanged.

Claude Code frontmatter format:
```markdown
---
description: "Node.js coding rules — applied when editing src/**/*.{js,ts}"
globs: "src/**/*.{js,ts}"
---
```

Copilot instructions format:
```markdown
---
applyTo: "src/**/*.{js,ts}"
---
# Node.js Rules

[rule content unchanged]
```

**Mapping:**
- `globs:` → `applyTo:`
- `description:` → remove from frontmatter, use as the first `# heading` in the body instead
- All rule content (body): copy verbatim

**File naming:** `.claude/rules/dotnet.md` → `.github/instructions/dotnet.instructions.md`
Strip any existing `.md` suffix and append `.instructions.md`.

**Example — source `.claude/rules/node.md`:**
```markdown
---
description: "Node.js coding rules — applied when editing src/**/*.{js,ts}"
globs: "src/**/*.{js,ts}"
---

# Node.js Rules

- Use async/await, not .then() chains
- Validate all external input at the handler boundary
```

**Example — target `.github/instructions/node.instructions.md`:**
```markdown
---
applyTo: "src/**/*.{js,ts}"
---
# Node.js Rules

- Use async/await, not .then() chains
- Validate all external input at the handler boundary
```

---

## Step C3 — `.github/agents/*.agent.md`

**Source:** `.claude/agents/*.md`
**Transformation:** Strip `model:` frontmatter line. Keep `name:` and `description:`. Remove the `<!-- crewkit:context-start -->...<!-- crewkit:context-end -->` block — Copilot agents do not use this inline context injection. Keep the full agent role description and instructions.

**Copilot agent frontmatter format:**
```markdown
---
name: explorer
description: "Read-only reconnaissance agent. Maps files, dependencies, and caller chains."
tools:
  - read_file
  - list_directory
  - search_files
---
```

**`tools:` mapping — add if applicable:**
| Agent | Suggested Copilot tools |
|-------|------------------------|
| explorer | `read_file`, `list_directory`, `search_files` |
| architect | `read_file`, `search_files` |
| coder | `read_file`, `create_file`, `replace_string_in_file` |
| tester | `read_file`, `create_file`, `run_in_terminal` |
| reviewer | `read_file`, `search_files` |

**What to strip:**
- `model:` line
- The entire `<!-- crewkit:context-start -->...<!-- crewkit:context-end -->` block (inclusive)

**File naming:** `.claude/agents/explorer.md` → `.github/agents/explorer.agent.md`

---

## Step C4 — `.github/prompts/*.prompt.md`

**Source:** `.claude/skills/*/SKILL.md`
**Transformation:** LOSSY. Extract the workflow intent as single-shot guidance. Drop multi-agent orchestration, agent routing, fix loops, and exit gates — Copilot prompts are single-turn, not multi-agent pipelines.

**Extract:**
- What the skill is for (description)
- The key steps the user should follow or the AI should perform
- Any output format requirements

**Drop:**
- `→ explorer → architect → coder → tester → reviewer` routing
- Fix loop mechanics (`FAIL → fix → re-run`)
- Exit gate conditions
- Phase breakdown with parallel agents
- Any reference to Claude Code slash commands (`/compact`, `/crewkit-setup`)

**Example — source `full-workflow/SKILL.md` intent:**
```
Routes tasks through explore → implement → test → review agents.
```

**Example — target `.github/prompts/full-workflow.prompt.md`:**
```markdown
---
name: full-workflow
description: "Complete development workflow: explore, implement, test, and review."
---
# Full Workflow

Use this prompt to complete a development task end-to-end.

## Steps
1. **Explore** — Read relevant files. Map dependencies and callers. Do not modify anything.
2. **Implement** — Write the smallest correct diff. Follow all rules in `.ai/memory/conventions.md`.
3. **Test** — Verify tests pass. Add tests if missing. Never report success with failing tests.
4. **Review** — Check for bugs, security issues, and rule violations before finalizing.

## Output
- Summary of changes
- Files changed with brief description
- Test results (pass/fail count)
- Any risks or follow-up needed
```

**File naming:** `full-workflow/SKILL.md` → `.github/prompts/full-workflow.prompt.md`
Use the skill directory name as the prompt file name.

---

## Completion Checklist — Copilot Adapter

Before reporting done, verify each item:

- [ ] `.github/copilot-instructions.md` — exists, contains hard rules, does NOT contain Agent Discipline or slash command sections
- [ ] `.github/instructions/` — one `.instructions.md` file per `.claude/rules/*.md` source file
- [ ] `.github/instructions/*.instructions.md` — each has `applyTo:` frontmatter (not `globs:`)
- [ ] `.github/agents/` — one `.agent.md` per `.claude/agents/*.md` source file
- [ ] `.github/agents/*.agent.md` — no `model:` line, no `crewkit:context-start` block, has `tools:` frontmatter
- [ ] `.github/prompts/` — one `.prompt.md` per `.claude/skills/*/SKILL.md` source file
- [ ] `.github/prompts/*.prompt.md` — each has `name:` and `description:` frontmatter, no multi-agent routing language
- [ ] `.ai/memory/` — NOT duplicated under `.github/` (shared, no copy needed)
- [ ] No Portuguese in any generated file
