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
| **LOW** | Pure DTO, mapper, UI without business logic, text, local refactor |
| **MEDIUM** | Application handlers, queries, validation, cache, UI with conditional logic |
| **HIGH** | Auth, multi-tenant, billing, permissions, deletes, migrations, background jobs, external integrations, public API contracts |

**Plan detection:** if `$ARGUMENTS` points to an existing `.ai/plans/*.md` file → skip explorer + architect, go straight to coder. Update plan status to IN_PROGRESS.

**Classification correction:** if later evidence shows the initial classification was too optimistic, immediately reclassify and switch to the appropriate flow.

## Subagents

| Phase | Subagent | Model |
|-------|----------|-------|
| explorer | `explorer` | Sonnet |
| architect | `architect` | Opus |
| coder | `coder` | Sonnet |
| tester | `tester` | Sonnet |
| reviewer | `reviewer` | Opus |

## Background execution rule

**When launching 2+ agents in parallel, ALWAYS use `run_in_background: true` on ALL of them.**

---

## Flows

### SMALL

```text
orchestrator → coder → [ tester | reviewer ] → consolidate → fix loop if needed
```

1. Read the target file(s) directly (no explorer scan)
2. **coder** — implement smallest possible change
3. **In parallel** (two Agent calls in the same message):
   - **tester** — **Normal mode**: build, create tests, run full suite
   - **reviewer** — review diff
4. **Consolidate** (see Part 2)
5. Clean → Summarize. Issues → fix loop.

### MEDIUM

```text
orchestrator → explorer → coder → [ tester | reviewer ] → consolidate → fix loop if needed
```

1. **explorer** — map relevant files and dependencies
2. **coder** — implement based on explorer findings
3. **In parallel**: tester (Normal mode) + reviewer
4. Consolidate → Summarize or fix loop

### LARGE — with plan

```text
orchestrator → coder → [ tester | reviewer ] → consolidate → fix loop if needed
```

1. Read the plan file
2. **coder** — implement per plan
3. **In parallel**: tester (Normal mode) + reviewer
4. Consolidate → Summarize or fix loop

### LARGE — without plan

```text
orchestrator → explorer → architect → [USER APPROVAL] → coder → [ tester | reviewer ] → consolidate → fix loop if needed
```

1. **explorer** — deep map
2. **architect** — plan, assess risk
3. **MANDATORY PAUSE** — present to user, wait for approval
4. **coder** — implement per architect plan
5. **In parallel**: tester + reviewer
6. Consolidate → Summarize or fix loop

---

## Summarize (all flows)

Return:
- **Stack:** [detected]
- **Size:** SMALL / MEDIUM / LARGE
- **Risk:** LOW / MEDIUM / HIGH
- **Summary:** what was done
- **Files changed:** list
- **Tests:** X passed, Y failed
- **Review:** approved / needs changes
- **Risks / Next steps:** if any

If a plan file was used, update its status to **DONE**.

## Memory Update

If a durable lesson was learned, append to the appropriate `lessons-{domain}.md`.

---

# Part 2 — Operational Policies

## Exit gate

**HARD BLOCK: No task is complete without reviewer APPROVED (clean).**

- Tester PASS alone is **not sufficient**
- Reviewer APPROVED is **mandatory** before Summarize
- **APPROVED with IMPORTANT+ findings is NOT clean.** Fix, then re-run tester + reviewer.
- Both must be clean (PASS + APPROVED without IMPORTANT+ findings) before Summarize.

## Findings consolidation

After tester and reviewer finish:

1. **Collect** results from both
2. **Classify:** Tester = PASS/FAIL. Reviewer = APPROVED/NEEDS_CHANGES
3. **Deduplicate** — same file + same concern → keep higher severity
4. **APPROVED with IMPORTANT+ findings** = treat as NEEDS_CHANGES
5. **Decision matrix:**

| Tester | Reviewer | Action |
|--------|----------|--------|
| PASS | APPROVED (clean) | Done → Summarize |
| PASS | APPROVED with IMPORTANT+ | Fix loop |
| PASS | NEEDS_CHANGES | Fix loop (reviewer findings) |
| FAIL | APPROVED | Fix loop (test failures) |
| FAIL | NEEDS_CHANGES | Fix loop (merge into ONE list for coder) |

When both fail, call coder **once** with the merged list.

## Fix loop

1. **Fix:**
   - Risk **HIGH**: all fixes through **coder** — never auto-fix
   - Risk LOW/MEDIUM: `auto_fixable: yes` → orchestrator applies directly. Else → coder
   - When fix changes an exception type or interface → instruct coder to grep for all test doubles/fakes
2. **Revalidate in parallel** (tester fix-loop mode + reviewer)
3. Consolidate again
4. Exit when PASS + APPROVED
5. **Max 5 iterations** — then STOP and report to user.

**MINOR findings** do not trigger fix loop alone.

**Tester time budget:** if the tester reports pre-existing failures unrelated to the current task, the orchestrator must NOT ask the tester to fix them. Note them for a separate task and proceed.

## Test creation rule

**Every behavioral change must be validated by tests.** The tester creates them automatically.

- New feature with logic → unit tests + integration when applicable
- Bug fix → test that reproduces the bug + verifies the fix
- Refactor with preserved behavior → existing tests are sufficient
- Cosmetic/text/DTO change without logic → build + review is sufficient

## HIGH risk rules

- Never auto-fix — all through coder
- Full test suite on every revalidation
- Reviewer always mandatory
- Architect mandatory if any design decision is open

## Stop conditions

STOP and escalate when:
- Build doesn't stabilize after 2 corrections
- Reviewer flags an architectural problem
- Tester finds widespread failures outside task scope
- Root cause unclear after 1 fix loop
- Affected files grow beyond plan
- SMALL/MEDIUM reveals structural impact

---

# Part 3 — Stack Configuration

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
