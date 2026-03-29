---
name: review-pr
description: "Review a pull request using the reviewer agent. Fetches diff + description via gh CLI, returns structured findings."
---

Review pull request: $ARGUMENTS

## Steps

### 1. Fetch PR data

Run in parallel:
```bash
gh pr view $ARGUMENTS --json number,title,body,author,baseRefName,headRefName,additions,deletions,changedFiles
gh pr diff $ARGUMENTS
```

If $ARGUMENTS is empty, use `gh pr view` (current branch's PR).

### 2. Load project context

Read `.ai/memory/architecture.md` and `.ai/memory/conventions.md`.

### 3. Run reviewer agent

Pass to **reviewer** subagent:
- Full PR diff
- PR title and description
- File count and change size
- Project context from step 2

The reviewer applies all checks from its instructions and `.ai/memory/conventions.md`, including project-specific rules (e.g., multi-tenant enforcement, architecture layer violations, forbidden patterns).

### 4. Return

```markdown
---
**PR #[number] — [title]**
**Author:** [author] | **Branch:** [head] → [base]
**Size:** +[additions] / -[deletions] in [changedFiles] files

**Findings:**
- CRITICAL: [list or "none"]
- IMPORTANT: [list or "none"]
- MINOR: [list or "none"]

**Positives:** [what's good]

**Verdict:** APPROVED / NEEDS_CHANGES
---
```

If no PR number provided and no current branch PR exists, ask for the PR number.
