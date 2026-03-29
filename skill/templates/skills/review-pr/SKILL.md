---
name: review-pr
description: "Review a pull request using the reviewer agent. Fetches diff + description via gh CLI, returns structured findings."
---

Review pull request: $ARGUMENTS

## Steps

### 1. Fetch PR data

Try each source in order, stopping at the first that succeeds.

#### 1a. GitHub (gh CLI)

```bash
gh pr view $ARGUMENTS --json number,title,body,author,baseRefName,headRefName,additions,deletions,changedFiles
gh pr diff $ARGUMENTS
```

If $ARGUMENTS is empty, use `gh pr view` (current branch's PR).

If `gh` is not installed or returns an error, proceed to **1b**.

#### 1b. GitLab (glab CLI)

```bash
glab mr view $ARGUMENTS --output json
glab mr diff $ARGUMENTS
```

If $ARGUMENTS is empty, use `glab mr view` (current branch's MR).

If `glab` is not installed or returns an error, proceed to **1c**.

#### 1c. Pure git fallback

```bash
git log main..HEAD --oneline
git diff main...HEAD
```

When using this fallback:
- PR metadata (title, description, author, reviewer comments) is **not available**.
- Communicate this clearly to the reviewer agent.
- Ask the user to provide context about the changes if possible:
  > "No GitHub/GitLab CLI was found. I'm reviewing based on raw git diff only. PR title, description, and comments are unavailable. If you can share what this change is about, it will improve the review."

### 2. Load project context

Read `.ai/memory/architecture.md` and `.ai/memory/conventions.md`.

### 3. Run reviewer agent

Pass to **reviewer** subagent:
- Full PR/MR diff (or git diff if fallback)
- PR/MR title and description (if available; otherwise note "unavailable — git fallback")
- File count and change size (derive from diff if metadata unavailable)
- Source used: GitHub / GitLab / git fallback
- Project context from step 2

The reviewer applies all checks from its instructions and `.ai/memory/conventions.md`, including project-specific rules (e.g., multi-tenant enforcement, architecture layer violations, forbidden patterns).

### 4. Return

```markdown
---
**PR #[number] — [title]**
**Author:** [author] | **Branch:** [head] → [base]
**Source:** GitHub / GitLab / git fallback (no PR metadata)
**Size:** +[additions] / -[deletions] in [changedFiles] files

**Findings:**
- CRITICAL: [list or "none"]
- IMPORTANT: [list or "none"]
- MINOR: [list or "none"]

**Positives:** [what's good]

**Verdict:** APPROVED / NEEDS_CHANGES
---
```

If using git fallback, omit fields that are unavailable (number, author, branch names) and add a note:
> "Review based on git diff only — PR metadata was not available."

If no PR/MR number provided and no current branch PR/MR exists and git fallback also fails, ask the user for a PR number or a base branch to diff against.
