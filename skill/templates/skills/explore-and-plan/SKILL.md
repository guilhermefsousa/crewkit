---
name: explore-and-plan
description: "Map a module or feature area, present decisions for user approval, then create a versioned implementation plan. Uses explorer (Sonnet) + architect (Opus)."
---

Explore and plan for: $ARGUMENTS

## Invariants — HARD rules

1. **Never generate the plan file before explicit user confirmation of all decisions.**
2. **Never silently choose an unresolved decision.**
3. **Never expand scope beyond what the user approved.**
4. **If the user overrides the architect's recommendation, record the override explicitly.**
5. **Never call the architect subagent after Step 3.** The orchestrator writes the plan.

---

## Subagents

| Phase | Subagent | Model |
|-------|----------|-------|
| Discovery | `explorer` | Sonnet |
| Architecture | `architect` | Opus |

## Steps

### 1. Discovery
Use **explorer** to find all relevant files, dependencies, and patterns:
- Map affected files
- Identify existing patterns
- Identify related tests or absence of tests
- Identify runtime-critical dependencies and public contracts affected
- Identify side effects on startup/boot
- Identify singleton/global mutable state or hidden coupling
- Classify testability (easy/medium/hard) with blockers
- Measure blast radius

**Explorer focus rules:**
- Give specific scope — never "explore the whole repo"
- Include user's task description in explorer prompt
- Discovery is sufficient when: files mapped, dependencies identified, testability classified
- If findings are vague, ask for targeted second pass on the gap

### 2. Architecture analysis
Use **architect** with explorer findings. Must return:
- Open decisions with options, pros/cons, recommendation
- Trade-off classification (required / compromise / debt / convenience)
- Pushback on weak approaches
- Risk assessment and blast radius
- Task size (SMALL / MEDIUM / LARGE)
- Technical verdict (APPROVE / APPROVE WITH CHANGES / DO NOT APPROVE)

**The architect must NOT produce the plan.** Only analysis and decisions.

### 3. Present decisions — MANDATORY PAUSE (one-by-one)

**DO NOT create the plan yet.**

First, present a brief summary: task size, technical verdict, total number of decisions, and key risks. Then present decisions **one at a time**, waiting for user response before showing the next.

**For each decision:**
1. **Name the decision** clearly (e.g., "D1: How to store the onboarding flag")
2. **Explain what it solves** — 1-2 sentences so the user understands WHY this decision matters
3. **Present options as a table** with Pros and Cons columns
4. **Explain the practical difference** — not abstract architecture, but what concretely changes for the user/system with each option
5. **State your recommendation** with a clear prompt (e.g., "Go with A?")
6. **Wait for the user to respond** before presenting the next decision

**Rules:**
- ONE decision per message. Never batch multiple decisions.
- If the user agrees, confirm and move to the next immediately.
- If the user disagrees, acknowledge the override and record it. Then move to the next.
- If the user asks for more detail, explain further before asking again.
- After ALL decisions are confirmed, show a complete summary table.
- If scope is large, ask about scope reduction early (D1 or D2) since it affects all subsequent decisions.

**Wait for ALL decisions to be resolved before proceeding to step 4.**

### 4. Create plan file (after confirmation)

Get today's date. Generate slug from feature name.

The **orchestrator** writes the plan using explorer + architect + user decisions.

**Rules:**
- Do NOT reopen approved decisions
- Do NOT invent new scope
- Do NOT add extras not approved
- If any decision unresolved → do NOT create yet

Save to `.ai/plans/YYYY-MM-DD-<slug>.md`:

```markdown
# Plan: <feature name>
**Date:** YYYY-MM-DD
**Status:** DRAFT
**Size:** SMALL / MEDIUM / LARGE

## Problem
[What needs to change and why]

## Dependencies / Prerequisites
[What must exist before execution — or "None"]

## Decisions
[Resolved decisions with chosen option and rationale]

## Files to change
| File | Action | Description |
|------|--------|-------------|

## Approach
[Ordered implementation steps]

## Tests needed
- Unit: [what]
- Integration: [what]

## Risks
[What could go wrong]

## Blast radius
**Low / Medium / High** — [justification]
```

**Plan lifecycle:** DRAFT → APPROVED → IN_PROGRESS → DONE

### 5. Return

- Print full plan to user
- State: `Plan saved to .ai/plans/YYYY-MM-DD-<slug>.md`
- Suggest: `Run /full-workflow .ai/plans/YYYY-MM-DD-<slug>.md to implement`
