---
name: dev-metrics
description: "Generate development metrics from git history — commit patterns, fix loop frequency, agent usage, file hotspots, and workflow efficiency."
---

Generate development metrics for: $ARGUMENTS

If $ARGUMENTS is empty, analyze the last 90 days of git history.
If $ARGUMENTS is a number (e.g. `30`), use that many days.
If $ARGUMENTS is a branch or date range, scope to that.

---

## Steps

### 1. Collect raw data

Run all commands in parallel:

```bash
# Commit volume and cadence
git log --oneline --since="90 days ago" --format="%ad %s" --date=short

# File change frequency (hotspots)
git log --since="90 days ago" --name-only --pretty=format: | sort | uniq -c | sort -rn | head -30

# Author breakdown (if multi-contributor)
git shortlog -sn --since="90 days ago"

# Fix/correction commits (heuristic: commit message contains fix, hotfix, correction, revert)
git log --oneline --since="90 days ago" --grep="fix\|hotfix\|correction\|revert\|bugfix" -i

# Merge commits (PR merges)
git log --oneline --since="90 days ago" --merges
```

Adapt the `--since` window to match $ARGUMENTS if provided.

### 2. Compute metrics

From raw data, derive:

#### Commit patterns
| Metric | Value |
|--------|-------|
| Total commits | count |
| Commits per week (avg) | count |
| Peak activity day/week | date or range |
| Fix/correction commit ratio | fix commits / total commits (%) |

#### Fix loop frequency
Estimate fix loop frequency by counting sequential commits on the same file within a 24h window.
Flag any file with 3+ consecutive fix commits as a **fix loop hotspot**.

| File | Fix loop count | Most recent |
|------|---------------|-------------|
| ... | ... | ... |

#### File hotspots
Top 10 most-changed files:

| File | Change count | Risk level |
|------|-------------|-----------|
| ... | ... | HIGH if auth/tenant/migration, MEDIUM if handler/service, LOW otherwise |

Apply risk classification using `.ai/memory/conventions.md` if present (read it).

#### Workflow efficiency signals
| Signal | Value | Health |
|--------|-------|--------|
| Fix commit ratio | X% | GREEN <15%, YELLOW 15-30%, RED >30% |
| Revert count | N | GREEN 0, YELLOW 1-2, RED 3+ |
| Hotfix commits | N | flag if >2 in window |
| Files changed per commit (avg) | N | GREEN <5, YELLOW 5-10, RED >10 |

#### Agent usage (if detectable from commit messages)
If commit messages contain agent names (coder, tester, reviewer, architect, explorer),
tally usage per agent. Otherwise, skip this section.

### 3. Identify systemic risks

Cross-reference hotspot files with risk classification:
- If a HIGH-risk file (auth, tenant, billing, migration) is in the top 5 hotspots → flag as **systemic risk**
- If fix commit ratio > 30% → flag as **process health concern**
- If the same file appears in both hotspots and fix loops → flag as **instability candidate**

### 4. Suggest improvements

For each systemic risk or process health concern, propose one concrete action:
- Do not propose vague items ("write more tests")
- Each suggestion must reference a specific file, module, or metric

---

## Return Format

```markdown
---
**Dev Metrics Report**
**Period:** [date range]
**Total commits analyzed:** N

## Commit Patterns
[table]

## Fix Loop Frequency
[table or "No fix loop hotspots detected"]

## File Hotspots (top 10)
[table]

## Workflow Efficiency
[table with GREEN/YELLOW/RED indicators]

## Agent Usage
[table or "Not detectable from commit messages"]

## Systemic Risks
[list or "None identified"]

## Suggested Improvements
[numbered list, max 5, concrete and actionable]
---
```

Keep the report structured and scannable. Do not include raw git output.
