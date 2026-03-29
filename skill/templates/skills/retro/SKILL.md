---
name: retro
description: "Post-mortem of a completed task or plan — analyzes fix loops, reviewer findings, lessons learned, and suggests process improvements."
---

Post-mortem for: $ARGUMENTS

If $ARGUMENTS is empty, analyze the most recent completed task from git log.

---

## When to use

Use after a task is completed (or after a painful iteration) to extract durable lessons
and identify process improvements. Not a blame exercise — a signal extraction exercise.

---

## Steps

### 1. Gather signals

Run in parallel:

```bash
git log --oneline -30
git diff HEAD~10..HEAD --stat
```

Also read (if they exist):
- `.ai/plans/` — any plan file matching $ARGUMENTS
- `.ai/memory/lessons-*.md` — to avoid duplicating existing lessons

If $ARGUMENTS points to a specific plan file, read it directly.

### 2. Reconstruct the timeline

From git log and plan file, reconstruct:

| Phase | What happened | Agent/actor |
|-------|--------------|-------------|
| Initial implementation | ... | coder |
| First test run | PASS / FAIL | tester |
| First review | APPROVED / NEEDS_CHANGES | reviewer |
| Fix loop iterations | count + what was fixed | coder |
| Final state | PASS + APPROVED | — |

Flag any phase that repeated more than once.

### 3. Analyze fix loops

For each fix loop iteration, identify:
- **Trigger:** what caused the loop (test failure / reviewer finding / build error)
- **Root cause category:** one of:
  - `spec-gap` — requirement was ambiguous or incomplete
  - `scope-underestimate` — task was classified smaller than it was
  - `missing-context` — coder lacked critical info (architecture, conventions, existing pattern)
  - `test-gap` — test didn't cover the scenario before the fix
  - `review-gap` — reviewer finding could have been caught earlier
  - `execution-error` — correct spec, wrong implementation (typo, off-by-one, wrong field)
  - `external-dependency` — blocked by something outside the task

### 4. Classify reviewer findings

If reviewer output is available (from PR diff, plan notes, or conversation context), classify findings:

| Severity | Count | Recurring? | Category |
|----------|-------|-----------|----------|
| CRITICAL | ... | yes/no | ... |
| IMPORTANT | ... | yes/no | ... |
| MINOR | ... | yes/no | ... |

"Recurring" = same finding appeared in a previous retro or lesson file.

### 5. Identify process improvements

For each fix loop trigger, propose one concrete process change:

| Finding | Proposed change | Target phase |
|---------|----------------|--------------|
| e.g. coder missed multi-tenant rule | Add explicit tenant check to coder prompt | Step 0 (classify) |
| e.g. test missed edge case | Add edge case checklist to tester for this module | tester |

Keep proposals concrete and actionable. Do not propose vague "be more careful" items.

### 6. Extract durable lessons

For each lesson that would prevent future recurrence, format as:

```markdown
### [YYYY-MM-DD] Retro: <short title>
- **Task:** [what was being built/fixed]
- **What happened:** [1-2 sentences]
- **Root cause:** [category from Step 3]
- **Lesson:** [actionable guidance for next time]
- **Applies to:** [domain: .NET / gateway / Blazor / process / all]
```

Append to the correct `.ai/memory/lessons-{domain}.md`.
If lesson is process-level, append to `lessons-process.md` (create if missing).

### 7. Update plan status

If a plan file was identified, update its status to **DONE** (if not already).

---

## Return Format

```markdown
---
**Retro: [task name or git range]**
**Period:** [date range from git log]
**Fix loop count:** [N]

**Timeline summary:**
[reconstructed table from Step 2]

**Fix loop analysis:**
[table from Step 3]

**Reviewer findings:**
[table from Step 4, or "not available"]

**Process improvements:**
[table from Step 5]

**Lessons documented:** [N lessons → file(s)]

**Top recommendation:** [single most impactful process change]
---
```

If no fix loops occurred and review was clean on the first pass, state that explicitly — it is a positive signal worth noting.
