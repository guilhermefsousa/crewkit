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

### 3. Present decisions — MANDATORY PAUSE

**DO NOT create the plan yet.** Present to user:
- Each decision with options, pros/cons, recommendation
- Required vs compromise vs debt
- Task size and key risks
- Technical verdict
- Ask user to confirm or override each decision

**Wait for user response.**

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
