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
- **Resource-bound fixes whose cost scales linearly (or worse) with active users / sessions / tenants** — e.g., per-session DB pools, per-request file handles, per-tenant in-memory caches. These require architectural review (see Step 1.6).

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

### Step 0 — Classify the report

Auto-classify the incident into one of 5 categories (with confidence):
1. **Crash/Exception** — uncaught error, process restart, 5xx spike
2. **Wrong output** — feature produces incorrect result but doesn't crash
3. **Performance regression** — endpoint/job latency exceeded threshold
4. **Resource exhaustion** — pool exhausted, OOM, disk full
5. **Integration failure** — downstream API returning errors, webhook not delivered

Output: category + confidence (HIGH/MEDIUM/LOW) + triage comment.

If confidence is LOW: respond with diagnostic questions before proceeding. Don't guess.

**Skip this step** when invoked manually by a human with a clear description (e.g., `/hotfix fix the login bug`). Only run full classification logic when invoked programmatically with structured issue data.

### Confidence thresholds

| Confidence | Action |
|-----------|--------|
| HIGH (≥75%) | Proceed with hotfix — continue to Step 1 |
| MEDIUM (50-74%) | Post triage comment asking for human confirmation. Stop. |
| LOW (<50%) | Post triage comment. Stop. Requires manual analysis. |

### Resource-bound detection (MANDATORY before classifying as safe hotfix)

If the issue body, logs, or your own diagnosis mentions any of these signals, the issue **cannot be hotfixed** — it must be escalated to `/full-workflow` regardless of how clear the root cause looks:

- `pool` / `connection pool` / `pool exhausted`
- `max_connections` / `connection slots` / `too many connections`
- `file descriptor` / `EMFILE` / `ENFILE`
- `out of memory` / `heap` / `OOM`
- `cache eviction` / `cache full` / `LRU`
- `retry storm` / `backoff` / `circuit breaker open`
- `event loop blocked` / `event loop lag`
- `deadlock` / `lock timeout` / `mutex contention`
- `rate limit` / `throttling` / `429`

**Why mandatory:** resource-bound issues require architectural review. They are never local fixes regardless of how localized the failing line of code looks.

If your project has billing/quota semantics, add domain-specific detection checks in `references/<topic>.md` — crewkit does NOT generate these.

---

### Step 1 — Diagnose

Before calling coder, confirm the root cause. The orchestrator does this directly.

1. Read the target file(s) and relevant logs/errors
2. Run diagnostic commands (logs, DB queries, API calls, git blame)
3. Identify the exact failure path — what input, state, or sequence triggers the bug
4. State root cause in 1-2 sentences
5. **Escape to `/full-workflow`** if:
   - Root cause unclear after reading code + logs
   - Fix requires 3+ files
   - Fix requires migration, contract change, or infra change
   - Fix requires architectural decision
   - Fix touches auth, tenant isolation, or billing

### Step 1.5 — Pattern sweep

Before coding the fix, grep for ALL instances of the same anti-pattern in the codebase. Fix the entire class of bug, not just the reported one.

Example: if the bug was "method X doesn't validate input", grep for sibling methods without validation. Fix them all.

Document scope in the PR: "Fixed reported instance + N others found by sweep."

**Rule: partial fix = redeploy. If the pattern exists in N places, fix N places.**

### Step 1.6 — Scale & Best-Practice Check

See `.claude/rules/research-discipline.md` for the full policy.

Mandatory if the diagnosis or proposed fix touches: pool, max_connections, cache, retry, event loop, memory leak, thread pool, singleton, rate limit, circuit breaker, lock.

Before calling the coder, answer two questions:

**1. Scale question.** Does the proposed fix consume a resource (DB connection, file descriptor, memory, thread, lock, pool slot, socket, timer) whose total cost grows **linearly or worse** with active users / sessions / concurrent requests?

| Answer | Action |
|--------|--------|
| No (constant cost or sublinear) | Proceed |
| Yes, but bounded by a hard cap explicitly enforced in code, AND headroom is verified ≥ 5x current peak | Proceed and document the cap + headroom math in the PR Risk assessment |
| Yes, unbounded or no headroom check | STOP. Not a hotfix candidate. Escalate to `/full-workflow` or `/explore-and-plan`. |

**2. Best-practice research.** Apply the stack-aware, version-pinned research policy from `.claude/rules/research-discipline.md`. Generic searches without version are banned.

Mandatory output template:

```
### Research — Stack & Best-Practice Check
**Stack identified:** <library> <version> · <pattern>
**References consulted (official, version-matched):**
- <URL> · <version> · <takeaway>
**Decision:** [Proceed / Escalate / Stop-antipattern-detected]
```

**STOP** if proposed fix matches a documented antipattern. Get user approval before continuing.

### Step 2 — Fix

Use **coder** with:
- The confirmed root cause from Step 1
- The target file(s) and line(s)
- ALL instances of the same pattern found in Step 1.5
- Instruction: smallest possible fix, no cleanup, no unrelated changes

### Step 3 — Validate

**In parallel**: tester (full suite) + reviewer

### Step 4 — Consolidate

| Tester | Reviewer | Action |
|--------|----------|--------|
| PASS | APPROVED | Done → Step 5 |
| PASS | NEEDS_CHANGES | Fix loop (1 max) |
| FAIL | APPROVED | Fix loop (1 max) |
| FAIL | NEEDS_CHANGES | Merge → fix loop (1 max) |

**Reviewer infra-fix checklist (MANDATORY when Step 1.6 triggered research).** When the diff touches the keywords listed in Step 1.6, the reviewer must verify ALL of these — any failure = automatic NEEDS_CHANGES:

- [ ] PR body cites ≥ 1 official doc URL of the library/system being changed
- [ ] PR Risk assessment explicitly answers "how does this behave with 10x current users/sessions/tenants?"
- [ ] New tests lock in the **correct** behavior (per the cited docs), not a workaround
- [ ] Resource cap (if any) is bounded by a constant, not by the count of sessions/users/requests

**Max 2 iterations.** If not clean → STOP and escalate to user with:
- Summary of what was attempted and why it failed
- Recommend: **revert** (if fix introduced worse regressions) or **escalate to `/full-workflow`** (if fix is on right track but needs more work)
- Never leave broken code uncommitted — either revert to last known good state or commit with `[WIP]` marker and explain what remains

On fix loop iteration, revalidate **in parallel** (tester + reviewer), same as Step 3.

### Step 4.5 — Re-diagnose if user reports "still broken"

If after the fix lands the user reports the issue persists:

1. **DO NOT add more layers to the existing fix** — this is what causes repeated deploys
2. **Re-diagnose from scratch** with the new evidence:
   - The user's clue may reveal a completely different root cause
   - Check backend data sources to confirm the backend is actually correct
   - If backend data is correct → the problem may be in caching, rendering, or stale state
3. **Reclassify**: if the new root cause differs from the original, it's a new bug — not a fix loop

Hotfix that needs 3+ rounds of fixes is not a hotfix — it's a task that needs `/full-workflow`.

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

### Step 6 — Create PR (only if `pr_first_workflow=true`)

Invoke `/create-pr` skill to open a pull request.

If the hotfix is tied to a tracked issue (GitHub, Linear, Jira, etc.), also post a comment on that issue with: root cause summary, fix summary, and PR link.

If Step 1.6 was triggered (research keyword matched), include the `### References` block per `.claude/rules/research-discipline.md`.

> Project-specific references (templates, domain checks, issue integrations) go in `references/<topic>.md` — crewkit does NOT generate these.

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
