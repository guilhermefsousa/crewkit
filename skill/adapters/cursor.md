# Adapter: Cursor

This adapter is executed during Phase 7, Step 10 of `/crewkit-setup`.
You are the AI. Follow every instruction in this file to generate Cursor-compatible context files.

**Input (two modes):**
- **With Claude files:** If `CLAUDE.md` and `.claude/` exist (Claude Code was also a target), use them as primary source and reformat for Cursor.
- **Standalone:** If Claude files do NOT exist, generate directly from `.crewkit/last-scan.md` (project profile) + `.ai/memory/` (architecture, conventions, commands). This is the primary source of truth.

**Output:** Files under `.cursor/rules/` and `AGENTS.md` at the project root.

---

## Rules for this adapter

1. All generated files MUST be in **English**.
2. Do NOT duplicate `.ai/memory/` — it is shared between all IDEs. No transformation needed.
3. `model:` frontmatter from `.claude/agents/*.md` is Claude Code-only — strip it.
4. Cursor has no equivalent for skills/prompts — skip `.claude/skills/` entirely.
5. Create `.cursor/rules/` directory if it does not exist.

---

## Step U1 — `.cursor/rules/project.md`

**Source:** `CLAUDE.md` if it exists, otherwise `.crewkit/last-scan.md` + `.ai/memory/conventions.md`
**Transformation:** If using CLAUDE.md, reformat for Cursor — add required frontmatter, remove agent/skill/hook sections. If generating from scan data, create the content directly using the project profile and conventions.

**Required Cursor frontmatter:**
```markdown
---
description: "Project rules"
alwaysApply: true
---
```

**Expected output format:**
```markdown
---
description: "Project rules"
alwaysApply: true
---
# [PROJECT NAME] — Project Rules

## Overview
[1-2 sentences from CLAUDE.md overview — what the project is, main stack]
[Business domain: what it does, core entities, risk profile]

**Stack:** [stacks]
**Architecture:** [key patterns]

---

## Hard rules (apply to every response)

[Numbered list — copy from CLAUDE.md hard rules verbatim.]

1. [Rule 1]
2. [Rule 2]
...

Details for each rule → `.ai/memory/conventions.md`

---

## Project Memory (`.ai/memory/`)

Load context on demand:

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
- `## Agent Discipline` section
- `## Skills (slash commands)` section
- `## Architect Decision Gate` section
- `## Test Safety Loop` section

---

## Step U2 — `.cursor/rules/*.md`

**Source:** `.claude/rules/*.md` if they exist, otherwise generate directly from scan data (detected stacks + HIGH/MEDIUM confidence patterns).
**Transformation:** If using Claude rules, convert frontmatter to Cursor format — keep glob patterns and rule content unchanged. If generating from scan data, create one rules file per detected stack with appropriate glob patterns and rules.

Claude Code frontmatter format:
```markdown
---
description: "Node.js coding rules — applied when editing src/**/*.{js,ts}"
globs: "src/**/*.{js,ts}"
---
```

Cursor frontmatter format:
```markdown
---
description: "Node.js coding rules"
globs: "src/**/*.{js,ts}"
---
```

**Mapping:**
- `globs:` → `globs:` (keep as-is — Cursor uses the same key)
- `description:` → keep as-is, but shorten to the rule name without the "applied when editing..." suffix if present
- Body: copy verbatim

**File naming:** `.claude/rules/dotnet.md` → `.cursor/rules/dotnet.md`
Keep the same filename — just place it under `.cursor/rules/`.

**Example — source `.claude/rules/python.md`:**
```markdown
---
description: "Python coding rules — applied when editing **/*.py"
globs: "**/*.py"
---

# Python Rules

- Use type hints on all function signatures
- Validate input with Pydantic models at API boundaries
```

**Example — target `.cursor/rules/python.md`:**
```markdown
---
description: "Python coding rules"
globs: "**/*.py"
---

# Python Rules

- Use type hints on all function signatures
- Validate input with Pydantic models at API boundaries
```

---

## Step U3 — `AGENTS.md` (project root)

**Source:** `.claude/agents/*.md` if they exist, otherwise generate directly from the agent templates at `~/.claude/skills/crewkit-setup/templates/agents/` (or from scan data if templates are unavailable).
**Transformation:** Concatenate all agents into a single markdown file with `##` sections. Strip `model:` frontmatter from each. Remove the `<!-- crewkit:context-start -->...<!-- crewkit:context-end -->` block from each agent. Keep the `name:` and `description:` from frontmatter and all agent instructions. When generating from templates, inject project context from `.crewkit/last-scan.md` into each agent.

**Output format:**
```markdown
# Agents

This file describes the AI agents available in this project.
Each agent has a specific role and scope. Invoke the appropriate agent for each task type.

---

## [Agent Name]

> [description from frontmatter]

[agent body — full instructions, stripped of model: and crewkit context block]

---

## [Agent Name 2]

> [description from frontmatter]

[agent body]

---
```

**Agent order:** explorer, architect, coder, tester, reviewer (same order as in `.claude/agents/`).

**What to strip from each agent:**
- `model:` frontmatter line
- `name:` frontmatter line (becomes the `## heading` instead)
- `description:` frontmatter line (becomes the `> blockquote` instead)
- The entire `<!-- crewkit:context-start -->...<!-- crewkit:context-end -->` block (inclusive)
- The YAML frontmatter delimiters (`---`) — the content moves to the `##` section body

**File location:** `AGENTS.md` at the project root (not under `.cursor/`).

---

## Step U4 — Skills

**Source:** `.claude/skills/`
**Action:** Skip entirely. Cursor has no equivalent concept for skills or prompts.

Do NOT generate any file for this step. Log: "Cursor adapter: skills skipped (no Cursor equivalent)."

---

## Completion Checklist — Cursor Adapter

Before reporting done, verify each item:

- [ ] `.cursor/rules/project.md` — exists, has `alwaysApply: true` frontmatter, contains hard rules, does NOT contain Agent Discipline or slash command sections
- [ ] `.cursor/rules/` — one `.md` file per `.claude/rules/*.md` source file (plus `project.md`)
- [ ] `.cursor/rules/*.md` — each has `globs:` frontmatter matching the source rule file
- [ ] `AGENTS.md` — exists at project root, has `##` section for each of the 5 agents
- [ ] `AGENTS.md` — no `model:` lines, no `crewkit:context-start` blocks, no YAML frontmatter delimiters
- [ ] `.ai/memory/` — NOT duplicated under `.cursor/` (shared, no copy needed)
- [ ] `.claude/skills/` — NOT copied (no Cursor equivalent, intentionally skipped)
- [ ] No Portuguese in any generated file
