# Adapter: GitHub Copilot

This adapter is executed during Phase 7, Step 10 of `/crewkit-setup`.
You are the AI. Follow every instruction in this file to generate GitHub Copilot-compatible context files.

**Input (two modes):**
- **With Claude files:** If `CLAUDE.md` and `.claude/` exist (Claude Code was also a target), use them as primary source and reformat for Copilot.
- **Standalone:** If Claude files do NOT exist, generate directly from `.crewkit/last-scan.md` (project profile) + `.ai/memory/` (architecture, conventions, commands). This is the primary source of truth.

**Output:** Files under `.github/` — GitHub Copilot-native context files.

---

## Rules for this adapter

1. All generated files MUST be in **English**.
2. Do NOT duplicate `.ai/memory/` — it is shared between all IDEs. No transformation needed.
3. Agent `model:` from `.claude/agents/*.md` MUST be preserved and converted to Copilot model names (see Step C3).
4. Skills can be converted **natively** to `.github/skills/` (not lossy). Prompt files (`.prompt.md`) are generated as an additional IDE-only fallback.
5. Create `.github/` subdirectories if they do not exist.

---

## Step C1 — `.github/copilot-instructions.md`

**Source:** `CLAUDE.md` if it exists, otherwise `.crewkit/last-scan.md` + `.ai/memory/conventions.md`

**IMPORTANT:** This file has **NO frontmatter**. It is plain Markdown only.

**Transformation:** If using CLAUDE.md, reformat for Copilot — remove Agent Discipline, Skills (slash commands), Architect Decision Gate, and Test Safety Loop sections (Claude Code-specific). If generating from scan data, create the content directly using the project profile and conventions.

**What to INCLUDE (absorb from files that have no Copilot equivalent):**

From `CLAUDE.md`:
- Overview, hard rules, memory loading instructions, output format

From `.claude/QUICKSTART.md` (onboarding — no Copilot equivalent):
- Day-to-day workflow section (which agents to use for what)

From `.claude/hooks/session-start.sh` (no Copilot equivalent):
- "At the start of every conversation, read `.ai/memory/architecture.md` and `.ai/memory/conventions.md`. Check `git log --oneline -5` for recent work."

From `.claude/hooks/stop-quality-gate.sh` (no Copilot equivalent):
- "Before completing any task, run build and test commands from `.ai/memory/commands.md`. Never report success with failing tests or broken builds."

From `.claude/napkin.md` (no Copilot equivalent):
- "Read `.claude/napkin.md` at the start of every session for current priorities and blockers."

From `.claude/settings.json` deny list (no Copilot equivalent):
- "Never execute destructive commands: `rm -rf`, `sudo`, `DROP DATABASE`, `git push --force`."

**Expected output format:**
```markdown
# [PROJECT NAME] — Copilot Instructions

> These instructions apply to all GitHub Copilot interactions in this repository.

## Overview
[1-2 sentences — what the project is, main stack]
[Business domain: what it does, core entities, risk profile]

**Stack:** [stacks]
**Architecture:** [key patterns]

---

## Hard rules (apply to every response)

[Numbered list of non-negotiable rules — from CLAUDE.md or from HIGH confidence patterns in scan data.]

1. [Rule 1]
2. [Rule 2]
...

Details for each rule → `.ai/memory/conventions.md`

---

## Session start

At the start of every conversation:
1. Read `.ai/memory/architecture.md` and `.ai/memory/conventions.md`
2. Read `.claude/napkin.md` for current priorities and blockers
3. Check `git log --oneline -5` and `git status` for recent work context

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
- Move secrets to environment variables, never hardcode them

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

## Workflow

- Use `@explorer` to find files, map dependencies — read-only
- Use `@architect` to evaluate design options — read-only
- Use `@coder` to implement the smallest correct diff
- Use `@tester` to create tests, run full suite
- Use `@reviewer` to review code — find real bugs, no noise

---

## Output Format

Always return:
- **Summary** — what was done
- **Files changed** — list with brief description
- **Tests** — pass/fail count (if tests were run)
- **Risks / Next steps** — if any

> Always think step by step. Never report success with failing tests.
```

**What to REMOVE from CLAUDE.md:**
- `## Agent Discipline` section (orchestrator/worker model is Claude Code-only)
- `## Skills (slash commands)` section (slash commands are Claude Code-only)
- `## Architect Decision Gate` section
- `## Test Safety Loop` section (absorbed into Quality gate section above)

---

## Step C2 — `.github/instructions/*.instructions.md`

**Source:** `.claude/rules/*.md` if they exist, otherwise generate directly from scan data (detected stacks + HIGH/MEDIUM confidence patterns).

**Transformation:** If using Claude rules, convert frontmatter to Copilot format — keep glob patterns and rule content unchanged. If generating from scan data, create one instructions file per detected stack with appropriate glob patterns and rules.

Claude Code frontmatter format:
```markdown
---
description: "Node.js coding rules — applied when editing src/**/*.{js,ts}"
globs: "src/**/*.{js,ts}"
---
```

Copilot instructions format (**no `description:` in frontmatter**):
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

**Optional frontmatter field:**
- `excludeAgent:` — set to `"code-review"` or `"coding-agent"` to hide instructions from a specific Copilot agent. Omit to apply to all agents. Only add if a rule is clearly irrelevant to one agent type.

**File naming:** `.claude/rules/dotnet.md` → `.github/instructions/dotnet.instructions.md`
Strip any existing `.md` suffix and append `.instructions.md`.

### Additional instructions file: sensitive files guardrail

Generate an extra instructions file that replaces the `protect-sensitive-files.sh` hook:

**File:** `.github/instructions/sensitive-files.instructions.md`
```markdown
---
applyTo: "**/.env*,**/credentials*,**/secrets*,**/*.key,**/*.pem,**/appsettings.*.json"
---
# Sensitive Files — Do Not Edit

These files contain secrets or environment-specific configuration.

- NEVER modify these files directly
- NEVER write secrets, API keys, or passwords into any file
- Move all secrets to environment variables
- If a secret is needed, reference it via `process.env.VAR_NAME` or the equivalent for the stack
```

---

## Step C3 — `.github/agents/*.agent.md`

**Source:** `.claude/agents/*.md` if they exist, otherwise generate directly from the agent templates at `~/.claude/skills/crewkit-setup/templates/agents/` (or from scan data if templates are unavailable).

**Transformation:** Convert `model:` to Copilot model names. Remove the `<!-- crewkit:context-start -->...<!-- crewkit:context-end -->` block. Add `tools:` and optionally `mcp-servers:` to frontmatter. Keep the full agent role description and instructions. When generating from templates, inject project context from `.crewkit/last-scan.md` into each agent.

**Copilot agent frontmatter format:**
```yaml
---
name: explorer
description: "Read-only reconnaissance agent. Maps files, dependencies, and caller chains."
tools:
  - read
  - search
---
```

**Model conversion (preserve, don't remove):**

| Claude Code `model:` | Copilot `model:` |
|----------------------|-----------------|
| `opus` | `"Claude Opus 4"` |
| `sonnet` | `"Claude Sonnet 4"` |
| (omitted) | (omit — uses default) |

If the project uses multiple AI providers, use an array for fallback: `model: ["Claude Sonnet 4", "GPT-4o"]`

**`tools:` mapping — use canonical Copilot tool aliases:**

| Agent | tools | Rationale |
|-------|-------|-----------|
| explorer | `["read", "search"]` | Read-only reconnaissance |
| architect | `["read", "search"]` | Read-only design review |
| coder | `["read", "edit", "search", "execute"]` | Full implementation access |
| tester | `["read", "edit", "search", "execute"]` | Test creation + execution |
| reviewer | `["read", "search"]` | Read-only code review |

**Available canonical tool aliases:** `read`, `edit`, `search`, `execute` (shell), `web` (search/fetch), `agent` (subagents), `todo` (task management). Use `["*"]` for all tools.

**Optional: `mcp-servers:` field.** If the project uses MCP servers (detected from `.mcp.json`), add them to relevant agents (coder, tester):
```yaml
mcp-servers:
  context7:
    type: "local"
    command: "npx"
    args: ["-y", "@context7/mcp-server"]
    tools: ["*"]
  postgres:
    type: "local"
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-postgres"]
    tools: ["*"]
    env:
      DATABASE_URL: ${{ secrets.COPILOT_MCP_DATABASE_URL }}
```

Only add MCP servers to agents that need them (coder + tester for DB servers, all agents for context7).

**Optional: `agents:` field.** To allow an agent to invoke other agents as subagents:
```yaml
agents: ["*"]   # allow invoking any other agent
```
Add this to `coder` (can call `explorer` for context) and `tester` (can call `coder` for fixes).

**Body limit:** Maximum **30,000 characters** for Markdown content below frontmatter. If an agent body exceeds this, trim low-priority sections.

**What to strip:**
- The entire `<!-- crewkit:context-start -->...<!-- crewkit:context-end -->` block (inclusive)

**What to ADD to the body (absorb from deny list — no Copilot equivalent):**
- For `coder` and `tester` agents, add at the end of the body:
  ```
  ## Safety
  - Never execute: `rm -rf`, `sudo`, `DROP DATABASE`, `git push --force`
  - Never edit: `.env`, `credentials.*`, `secrets.*`, `*.key`, `*.pem`
  ```

**File naming:** `.claude/agents/explorer.md` → `.github/agents/explorer.agent.md`

---

## Step C4 — `.github/skills/*/SKILL.md` (native skills)

**Source:** `.claude/skills/*/SKILL.md`

**Transformation:** Copilot supports skills natively with a compatible format. Copy the skill content and adapt the frontmatter.

**Copilot skill frontmatter format:**
```yaml
---
name: "full-workflow"
description: "Execute the complete development workflow: explore, implement, test, review."
user-invocable: true
---
```

**Frontmatter fields:**
- `name:` (required) — lowercase with hyphens, max 64 characters
- `description:` (required) — what the skill does and when to use it, max 1024 characters
- `user-invocable:` (optional) — default `true`, set to `false` for internal-only skills
- `allowed-tools:` (optional) — list of tools to pre-approve (e.g., `["execute"]`)

**Body adaptation:**
- Keep the workflow steps, classification tables, and output format
- Replace Claude Code-specific references:
  - `/compact` → remove (Copilot has no context compaction)
  - `→ explorer` agent routing → `@explorer` mention syntax
  - References to `.claude/settings.json` → remove
- Keep references to `.ai/memory/` (Copilot reads these)
- Keep build/test command references to `.ai/memory/commands.md`

**File naming:** `.claude/skills/full-workflow/SKILL.md` → `.github/skills/full-workflow/SKILL.md`
If the skill has a `references/` subdirectory, copy it too.

---

## Step C5 — `.github/prompts/*.prompt.md` (IDE fallback)

**Source:** `.claude/skills/*/SKILL.md`

**Transformation:** LOSSY. These are a simplified fallback for IDEs that don't support `.github/skills/`. Extract the workflow intent as single-shot guidance.

**Copilot prompt frontmatter format:**
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
```

**Frontmatter fields:**
- `description:` (optional) — what the prompt does, shown in UI
- `agent:` (optional) — `"agent"` (full tool use), `"ask"` (no tools), `"plan"`, or a custom agent name
- `tools:` (optional) — available tools during execution
- `model:` (optional) — specific model to use
- `argument-hint:` (optional) — hint text shown in chat input
- Do NOT use `name:` — the prompt name is derived from the filename

**Extract from skill:**
- What the skill is for (description)
- The key steps the user should follow or the AI should perform
- Any output format requirements

**Drop:**
- `→ explorer → architect → coder → tester → reviewer` routing
- Fix loop mechanics (`FAIL → fix → re-run`)
- Exit gate conditions
- Phase breakdown with parallel agents
- Any reference to Claude Code slash commands (`/compact`, `/crewkit-setup`)

**Example — target `.github/prompts/full-workflow.prompt.md`:**
```markdown
---
description: "Complete development workflow: explore, implement, test, and review."
agent: "agent"
tools:
  - read
  - edit
  - search
  - execute
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
Use the skill directory name as the prompt file name. The user invokes it in Copilot Chat as `/full-workflow`.

---

## Completion Checklist — Copilot Adapter

Before reporting done, verify each item:

- [ ] `.github/copilot-instructions.md` — exists, **NO frontmatter**, contains hard rules, session start, quality gate, safety rules. Does NOT contain Agent Discipline or slash command sections
- [ ] `.github/instructions/` — one `.instructions.md` file per detected stack with `applyTo:` frontmatter
- [ ] `.github/instructions/sensitive-files.instructions.md` — exists with glob for `.env*`, `credentials*`, `secrets*`, `*.key`, `*.pem`
- [ ] `.github/agents/` — 5 agent files with `.agent.md` extension
- [ ] `.github/agents/*.agent.md` — each has `tools:` with canonical aliases (`read`, `edit`, `search`, `execute`), has `model:` converted to Copilot names, no `crewkit:context-start` block, body under 30,000 chars
- [ ] `.github/agents/coder.agent.md` + `tester.agent.md` — have `mcp-servers:` if `.mcp.json` exists
- [ ] `.github/skills/` — one `SKILL.md` per `.claude/skills/*/SKILL.md` source, with `name:` + `description:` frontmatter
- [ ] `.github/prompts/` — one `.prompt.md` per skill as IDE fallback, with `description:` + `agent: "agent"` frontmatter
- [ ] `.ai/memory/` — NOT duplicated under `.github/` (shared, no copy needed)
- [ ] No Portuguese in any generated file
