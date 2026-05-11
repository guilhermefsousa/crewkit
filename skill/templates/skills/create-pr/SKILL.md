---
name: create-pr
description: "Create a PR from the current branch following Conventional Commits conventions. Extracts issue # from branch/commits, formats the title, fills body using the project PR template (or a minimal fallback). No 'Generated with Claude' footer."
---

Create a PR for: $ARGUMENTS

`$ARGUMENTS` is optional. If provided, use as the PR subject (override auto-derivation). Otherwise derive from branch + commits.

## When to use

Use when work on a feature/fix branch is complete and ready to be reviewed:
- Tests pass (`tester` agent ran and reported PASS)
- Reviewer approved (or skipped intentionally)
- Branch has commits ahead of `main`

Do NOT use when:
- Current branch is `main` — abort immediately
- Branch has no diff against `main` — nothing to PR
- An open PR already exists for the branch — use a different skill (e.g. `/pr-update`) or the GitHub UI
- The branch hasn't been pushed and there is no remote configured

## Rules

- **No "Generated with Claude" or co-author footers.** Body ends at `Closes #N`.
- Title MUST follow Conventional Commits: `<type>(<scope>): <subject>`.
- Body MUST follow the project PR template at `.github/pull_request_template.md` if one exists.
- `Closes #N` is mandatory when an issue exists. If no issue → ask user before omitting.

---

## Flow

```text
pre-flight → gather context → extract issue # → derive title → build body → gh pr create → return URL
```

### Step 1 — Pre-flight

Run in parallel:
```bash
git rev-parse --abbrev-ref HEAD
git diff main...HEAD --stat
git log main..HEAD --oneline
gh auth status
gh pr view --json number,state 2>/dev/null
```

Abort with a clear message if:
- Current branch is `main` or `master`
- `git diff main...HEAD` is empty
- `gh auth status` errors
- `gh pr view` returns an existing OPEN PR for this branch

### Step 2 — Gather context

```bash
git diff main...HEAD --name-status
git log main..HEAD --pretty=format:'%h %s'
```

This produces:
- File-by-file change list (used in the body's changed-files section)
- Commit history (used to derive subject + extract issue #)

### Step 3 — Extract issue number

Look in this order, stop at first match:

1. **Branch name** — regex match for `(issue-)?(\d+)` in patterns like:
   - `fix/issue-108-...` → `108`
   - `feat/115-status-banner` → `115`
   - `feat/whatever-fixes-83` → `83`
2. **Commit messages** — search `git log main..HEAD` for `(fixes #N)` / `(closes #N)` / `#N` (case-insensitive).
3. **Recent activity** — if branch was created from `gh issue develop`, the issue # is in the branch name (covered by 1).

If no issue # found → **ask the user** before proceeding. Do not guess. If the user confirms there is no issue, omit the `Closes #N` line entirely.

### Step 4 — Derive title

**Type** — from branch prefix:

| Branch prefix | Type |
|---|---|
| `feat/` | `feat` |
| `fix/` | `fix` |
| `refactor/` | `refactor` |
| `docs/` | `docs` |
| `chore/` | `chore` |
| `perf/` | `perf` |
| `test/` | `test` |

If branch has no recognized prefix → ask user which type to use.

**Scope derivation:**
Derive scope from the most-changed functional area in the diff. Run `git diff main...HEAD --name-only` and identify which functional domain accounts for the largest share of changed files. Use 1-2 words (e.g., `api`, `auth`, `ui`, `worker`). If diff spans 3+ unrelated areas, omit scope.

Cross-check with `git log --pretty=%s -50` to see scopes used in recent commits — match the project's existing vocabulary.

**Fallback:** if no clear scope can be derived, or if multiple domains are touched with similar weight → show the user the top 3 candidates with a suggested default and ask. Do NOT invent a scope. Do NOT use structural layer names (`application`, `infrastructure`, `domain`) unless no functional scope applies.

**Subject** — in this priority:
1. `$ARGUMENTS` if provided (clean it; lowercase first word).
2. First commit subject in `git log main..HEAD` (strip any existing `<type>(<scope>):` prefix and `(fixes #N)` suffix).
3. Ask the user.

Constraints:
- Imperative mood ("add", "fix", "scope", "handle" — never "added"/"fixed").
- ≤ 60 characters in `<type>(<scope>): <subject>` total.
- No trailing period.

**Final title:** `<type>(<scope>): <subject>` — see [templates.md](./templates.md) for examples.

### Step 5 — Build body

**Pre-existing PR template:**
If `.github/pull_request_template.md` exists, load it and follow its structure (fill all fields). Otherwise use the minimal fallback:

```markdown
## Summary
- <bullet 1>
- <bullet 2>

## Test plan
- [ ] <test step 1>
- [ ] <test step 2>

## Changed files
- `path/to/file` — one-sentence description

Closes #N
```

Assess risk and blast radius based on touched files. Use this rubric:

| Touched | Default risk |
|---|---|
| Only `docs/`, `.claude/`, `.ai/` | Low |
| UI-only without backend changes | Low |
| Application handlers, queries, validation | Medium |
| Auth, multi-tenant, billing, migrations, core retry/idempotency | High |

If `.claude/rules/research-discipline.md` was triggered during the work (resource keywords matched), append a `### References` block in the risk section per that rule.

See [templates.md](./templates.md) for the full body template.

### Step 6 — Create PR

The `gh pr create` invocation MUST be prefixed with `CREWKIT_PR_VIA_SKILL=1` so the
`protect-pr-and-main.sh` PreToolUse hook recognizes it as a skill-driven call and
allows it through. Direct `gh pr create` without that env var is blocked by design.

```bash
# Push the branch if not yet pushed
git push -u origin <branch>

# Create the PR using --body-file (avoids heredoc/quoting issues on Windows + cross-shell)
PR_BODY_FILE=$(mktemp -t pr-body-XXXXXX.md)
cat > "$PR_BODY_FILE" <<'EOF'
<full body from Step 5>
EOF

CREWKIT_PR_VIA_SKILL=1 gh pr create --base main --head <branch> --title "<title>" --body-file "$PR_BODY_FILE"
rm "$PR_BODY_FILE"
```

**Never** add `--body "Generated with Claude Code"`, `Co-Authored-By:` trailers, or any AI-attribution footer.

### Step 7 — Return

Capture the PR URL from `gh pr create` stdout. Return:

- **Title:** `<type>(<scope>): <subject>`
- **Branch:** `<branch>` → `main`
- **PR:** `<URL>`
- **Closes:** `#N` (or "no linked issue")

If `gh pr create` fails (network, auth, missing remote) → use the **Partial success** template from [templates.md](./templates.md), tell the user to create manually via the printed URL, and return.

---

## Anti-patterns

- Generic titles like `feat: improve code` — scope is mandatory unless truly cross-cutting
- Pasting raw `git diff` output into the changed-files section — summarize per file, don't dump
- "Generated with Claude" / "Co-Authored-By: Claude" anywhere in title or body
- Omitting `Closes #N` when an issue exists — breaks issue-PR linkage and auto-close on merge
- Pushing with `--force` to a branch that already has an open PR — never destructive without explicit user request
- Using structural layer names (`application`, `infrastructure`, `domain`) as scope when a functional domain name is available
