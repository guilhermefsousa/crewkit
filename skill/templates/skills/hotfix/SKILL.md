---
name: hotfix
description: "Compressed workflow for urgent production fixes: diagnose → coder → [tester | reviewer] → consolidate → document. No refactor. No architecture phase unless the issue is not locally fixable."
---

Execute hotfix for: $ARGUMENTS

## When to use
Use only when production is broken and fast restoration matters more than broader improvement.

Skips explorer, architect, and refactor **only if**:
- the failure is already understood or can be confirmed quickly
- the fix is local
- no new architecture decision is required

If root cause is unclear, blast radius grows, or fix requires design trade-offs, **STOP and use `/full-workflow` instead**.

## Never use hotfix for

These always require `/full-workflow`:
- **Auth or multi-tenant isolation** — wrong fix = data leak
- **Billing or payment logic** — wrong fix = financial impact
- **DB migrations** — irreversible in production
- **Public API contract changes** — breaks consumers
- **State machine transitions** — adding states affects the full lifecycle
- **Persistence format/schema changes** — wrong format corrupts state on restart
- **Retry/idempotency logic** — wrong fix = duplicates or lost events

Hotfix IS valid for:
- Guards/validations within existing flow
- Fixing a service call that sends wrong data
- Fixing a timer/job that isn't cleaned up
- Fixing an async handler that swallows errors
- Any localized fix that doesn't change the architecture

---

## Hotfix rules

- Restore service with the **smallest possible fix**
- No cleanup, no opportunistic refactor, no unrelated improvements
- Do not widen scope unless required for safety
- Every behavioral fix must be validated by tests

---

## Flow

```text
orchestrator → diagnose → coder → [ tester | reviewer ] → consolidate → document
```

### Step 1 — Diagnose

Before calling coder, confirm the root cause. The orchestrator does this directly.

1. Read the target file(s) and relevant logs/errors
2. Run diagnostic commands (logs, DB queries, API calls, git blame)
3. Identify the exact failure path
4. State root cause in 1-2 sentences
5. **Escape to `/full-workflow`** if:
   - Root cause unclear after reading code + logs
   - Fix requires 3+ files
   - Fix requires migration, contract change, or infra change
   - Fix requires architectural decision
   - Fix touches auth, tenant isolation, or billing

### Step 2 — Fix

Use **coder** with: confirmed root cause, target files, instruction for smallest fix.

### Step 3 — Validate

**In parallel**: tester (Normal mode, full suite) + reviewer

### Step 4 — Consolidate

| Tester | Reviewer | Action |
|--------|----------|--------|
| PASS | APPROVED | Done → Step 5 |
| PASS | NEEDS_CHANGES | Fix loop (1 max) |
| FAIL | APPROVED | Fix loop (1 max) |
| FAIL | NEEDS_CHANGES | Merge → fix loop (1 max) |

On fix loop iteration, revalidate **in parallel** (tester **Fix-loop mode** + reviewer), same as Step 3.

**Max 2 iterations.** If not clean → STOP and escalate to user with:
- Summary of what was attempted and why it failed
- Recommend: **revert** (if fix introduced worse regressions) or **escalate to `/full-workflow`** (if fix is on right track but needs more work)
- Never leave broken code uncommitted — either revert to last known good state or commit with `[WIP]` marker and explain what remains

### Step 5 — Document

Append to appropriate `lessons-{domain}.md`:

```markdown
### [YYYY-MM-DD] Hotfix: <short title>
- **Root cause:** [1-2 sentences]
- **Fix:** [what was changed]
- **Files:** [list]
- **Lesson:** [what to watch for to prevent recurrence]
```

**Follow-up assessment:** If root cause reveals systemic issue, suggest `/explore-and-plan` for structural fix.

---

## Return Format

- **Stack:** [detected]
- **Root cause:** [1-2 sentences]
- **Summary:** what was fixed
- **Files changed:** list
- **Tests:** X passed, Y failed
- **Review:** approved / needs changes
- **Lesson documented:** yes/no
- **Residual risks:** [if any]
