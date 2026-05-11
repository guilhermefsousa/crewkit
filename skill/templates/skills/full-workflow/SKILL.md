---
name: full-workflow
description: "Execute the complete development workflow: classify size/risk, route to appropriate agents (explorer, architect, coder, tester, reviewer), validate in parallel, fix loop until clean."
---

Execute the full orchestrator workflow for: $ARGUMENTS

---

# Part 1 — Core Flow

## Step 0 — Classify

> **Stack:** [detect from target files]
> **Size: SMALL / MEDIUM / LARGE**
> **Risk: LOW / MEDIUM / HIGH**
> Reason: [1 sentence for size, 1 sentence for risk]

| Size | Criteria |
|------|----------|
| **SMALL** | 1-2 files, localized change, scope is obvious, no cross-module impact |
| **MEDIUM** | 3-5 files, some cross-module dependencies, domain already known |
| **LARGE** | 6+ files, architectural impact, unknown codebase area, multi-module, or migration needed |

| Risk | Scope |
|------|-------|
| **LOW** | Pure DTO, mapper, UI without business logic, text, local refactor without business rules |
| **MEDIUM** | Application handlers, queries, validation, cache, UI with conditional logic |
| **HIGH** | Auth, multi-tenant, billing, permissions, deletes, migrations, background jobs, external integrations, public API contracts |

**Reclassify MEDIUM → LARGE** if a new cross-cutting abstraction (logging adapter, retry framework, cache layer, interceptor, middleware, etc.) emerges mid-task. MEDIUM is "follow existing pattern", not "create new pattern". A new abstraction is an architecture decision — it must go through architect (which enforces the OOTB-First Rule) before coder.

**Classification correction:** if later evidence shows the initial classification was too optimistic, immediately reclassify and switch to the appropriate flow.

---

## Step 0.1 — Branch setup (only if `pr_first_workflow=true`)

**Before invoking ANY agent**, create the working branch:

```bash
# Abort if working tree is dirty
git status --porcelain
# If output is non-empty → STOP. Tell user: "Working tree has uncommitted changes. Commit or stash before running /full-workflow."

# Check if feat/<slug> already exists
git branch --list "feat/<slug>-*"
# If match found → ask user: "Branch feat/<slug>-* already exists — continue on it or create a new one?"
# Do NOT reset or delete automatically.

# Create branch
SLUG=$(echo "$ARGUMENTS" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | cut -c1-30)
STAMP=$(date +%Y%m%d-%H%M%S)
RAND4=$(node -e 'process.stdout.write(require("crypto").randomBytes(2).toString("hex"))')
git checkout -b "feat/${SLUG}-${STAMP}-${RAND4}"
git push -u origin "feat/${SLUG}-${STAMP}-${RAND4}"
```

The branch name format is `feat/<slug>-<YYYYMMDD-HHMMSS>-<rand4>`. The slug is derived from `$ARGUMENTS` (kebab-case, max 30 chars).

All writer agents (`coder`, `tester`) and the orchestrator itself work on this same `feat/<slug>` branch. There is no per-agent worktree isolation: agents run sequentially in the orchestrator's working tree. The orchestrator commits coder/tester output as it goes.

**If `pr_first_workflow=false`:** skip this step. Work directly on the current branch.

---

## Step 0.5 — Plan detection + auto-validate (any size)

If `$ARGUMENTS` points to an existing `.ai/plans/*.md` file → skip explorer + architect, go straight to coder regardless of declared size. The plan already locked decisions; re-running discovery/architecture is waste.

**BEFORE transitioning the plan to `IN_PROGRESS`, apply the shared policy: `.claude/rules/plan-validation-flow.md`.**

That document is the single source of truth for: how to invoke the validator, the Status mapping, and the 4-option branching on FAIL/UNKNOWN.

Step-specific behavior (in addition to the shared policy):

- **Plan already `VALIDATED` / `IN_PROGRESS` / `DONE`**: validator may re-run idempotently; on PASS, transition Status to `IN_PROGRESS` and continue to coder.
- **Plan `APPROVED` or `DRAFT` (not yet validated)**: run validator. On PASS (auto-flips to `VALIDATED`), transition to `IN_PROGRESS` and continue. On FAIL/UNKNOWN, follow the shared policy and STOP.
- **Plan `NEEDS_REWORK` already**: STOP — plan was previously rejected and not fixed; surface the prior audit and present the 4-option choice from the shared policy.

```
node .claude/scripts/validate-plan.js <plan-path>
```

- PASS → plan status becomes `VALIDATED` → proceed to coder
- FAIL or UNKNOWN → plan status becomes `NEEDS_REWORK` → STOP and surface findings to user

Do NOT auto-fix the plan. Wait for user decision.

This applies to SMALL-with-plan, MEDIUM-with-plan, and LARGE-with-plan equally — see "Flows" below.

---

## Subagents

| Phase | Subagent | Model |
|-------|----------|-------|
| explorer | `explorer` | Sonnet |
| architect | `architect` | Opus |
| coder | `coder` | Sonnet |
| tester | `tester` | Sonnet |
| reviewer | `reviewer` | Opus |

## Background execution rule

**Tester and Reviewer run in parallel AFTER the coder finishes.** Wait for coder to complete before launching either. Use `run_in_background: true` for both Agent calls so they execute concurrently. Sequential agents (where the result is needed for the next step) stay in foreground.

The reviewer is read-only and can run in parallel with the tester safely (no write conflicts). The coder and tester both write files, so they always run sequentially: coder first, then tester after coder reports done.

---

## Flows

### SMALL

```text
[Step 0.1: create feat/<slug> — if pr_first_workflow=true]
orchestrator → coder → tester (with reviewer in parallel) → consolidate → fix loop if needed → [/create-pr if pr_first_workflow=true]
```

1. Read the target file(s) directly (no explorer scan)
2. **coder** — implement smallest possible change. Wait for it to finish.
3. **tester** + **reviewer** in parallel (`run_in_background: true` on both):
   - **tester** — **Normal mode**: build, create tests, run full suite
   - **reviewer** (read-only) — review diff
4. **Consolidate** (see Part 2)
5. Clean → final step. Issues → fix loop.

### MEDIUM

```text
[Step 0.1: create feat/<slug> — if pr_first_workflow=true]
orchestrator → explorer → coder → tester (with reviewer in parallel) → consolidate → fix loop if needed → [/create-pr if pr_first_workflow=true]
```

1. **explorer** — map relevant files and dependencies
2. **coder** — implement based on explorer findings. Wait for it to finish.
3. **tester** + **reviewer** in parallel (`run_in_background: true` on both):
   - **tester** — **Normal mode**: build, create tests, run full suite
   - **reviewer** (read-only) — review diff
4. Consolidate → fix loop or final step

### SMALL / MEDIUM — with plan

```text
[Step 0.1: create feat/<slug> — if pr_first_workflow=true]
orchestrator → coder → tester (with reviewer in parallel) → consolidate → fix loop if needed → [/create-pr if pr_first_workflow=true]
```

When `$ARGUMENTS` points to an existing `.ai/plans/*.md` and the plan size is SMALL or MEDIUM (per its `Size:` field):

1. Read the plan file (files, approach, confirmed decisions)
2. **coder** — implement per plan. Smallest safe diff. Wait for it to finish.
3. **tester** + **reviewer** in parallel (`run_in_background: true` on both):
   - **tester** — **Normal mode**: build, create tests, run full suite
   - **reviewer** (read-only) — review diff
4. Consolidate → fix loop or final step

The plan already locked architecture decisions and OOTB research (via /explore-and-plan). Skipping explorer/architect is correct — re-running them would waste tokens and risk reopening settled decisions.

### LARGE — with plan

```text
[Step 0.1: create feat/<slug> — if pr_first_workflow=true]
orchestrator → coder → tester (with reviewer in parallel) → consolidate → fix loop if needed → [/create-pr if pr_first_workflow=true]
```

1. Read the plan file (files, approach, confirmed decisions)
2. **coder** — implement per plan. Smallest safe diff. Wait for it to finish.
3. **tester** + **reviewer** in parallel (`run_in_background: true` on both):
   - **tester** — **Normal mode**: build, create tests, run full suite
   - **reviewer** (read-only) — full review
4. Consolidate → fix loop or final step

### LARGE — without plan

```text
[Step 0.1: create feat/<slug> — if pr_first_workflow=true]
orchestrator → explorer → architect → [USER APPROVAL] → coder → tester (with reviewer in parallel) → consolidate → fix loop if needed → [/create-pr if pr_first_workflow=true]
```

1. **explorer** — deep map of files, dependencies, blast radius
2. **architect** — plan multi-file changes, assess risk
3. **MANDATORY PAUSE** — present architect output to user. Ask: "Can I proceed?" **DO NOT call coder until user approves.**
4. **coder** — implement per architect plan. Wait for it to finish.
5. **tester** + **reviewer** in parallel (`run_in_background: true` on both):
   - **tester** — **Normal mode**: build, create tests, run full suite
   - **reviewer** (read-only) — full review
6. Consolidate → fix loop or final step

### Refactor — manual only

Not part of the automatic flow. Only when user explicitly requests it, after tests are green.

---

## Final step — Summarize and (optionally) create PR

After reviewer approves and fix loop is clean:

**If `pr_first_workflow=true`:** invoke the `/create-pr` skill to open the PR with proper title, body, and template. No separate authorization needed — the skill handles it.

**If `pr_first_workflow=false`:** summarize work done. Commits stay on current branch.

Return summary:
- **Stack:** [detected]
- **Size:** SMALL / MEDIUM / LARGE
- **Risk:** LOW / MEDIUM / HIGH
- **Summary:** what was done
- **Branch:** `feat/<slug>-<YYYYMMDD-HHMMSS>-<rand4>` (if pr_first_workflow=true)
- **Files changed:** list
- **Tests:** X passed, Y failed
- **Review:** approved / needs changes
- **PR:** URL (if pr_first_workflow=true)
- **Risks / Next steps:** if any

If a plan file was used, update its status to **DONE**.

## Memory Update

If a durable lesson was learned, append to the appropriate `lessons-{domain}.md`.

---

> **Operational policies** (exit gate, fix loop, findings consolidation, stop conditions): load `references/operational-policies.md` when entering consolidation or fix loop.
> **Stack-specific adapters:** if your project has unique workflows per stack (e.g., a Node.js gateway with no DB, or a separate mobile client), document them in `references/stack-adapters.md`. This file is project-specific; crewkit does NOT generate it.

---

# Part 2 — Stack Configuration

The orchestrator must tell subagents which build/test commands to use. Read `.ai/memory/commands.md` at the start and use the correct commands for each stack.

When telling the tester subagent what to do, always include:
- The stack being tested
- The test framework (from `.ai/memory/testing.md`)
- Whether this is a cross-stack task (requires testing multiple stacks)

For cross-stack tasks:
1. Explorer maps both sides
2. Architect evaluates the contract between stacks
3. Coder runs once per stack in sequence (dependency direction decides order)
4. Tester runs tests for all affected stacks
5. Reviewer runs once across the full diff
