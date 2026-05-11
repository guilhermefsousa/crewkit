# create-pr — Templates

Loaded as needed by `SKILL.md` Step 5 (body construction) and Step 7 (failure
fallbacks). Kept here per progressive-disclosure pattern to keep the main
SKILL.md under the recommended length.

---

## PR body template

Used by Step 5. If `.github/pull_request_template.md` exists, mirror its structure with each placeholder filled. Pass to `gh pr create --body-file <tmpfile>`.

**Minimal fallback template** (used when no project PR template exists):

```markdown
## Summary

<1-3 sentences describing what changes and why>

## Issue

Closes #N

## Approach

<Architectural decision, tradeoffs, motivation. Summarize the issue if one exists.>

## Changed files

- `path/to/file.ext` — one sentence describing the change
- `path/to/other.ext` — one sentence

## Tests

- [x] Unit tests — `X passed / 0 failed`
- [x] Integration tests — `X passed / 0 failed`
- [ ] E2E — not run (scope covered by integration)

## Risk

- **Risk level:** Low / Medium / High
- **Blast radius:** <what is affected>

## Deploy notes

<Migrations, env vars, feature flags. "None" if pure code.>

## Plan / Audit

- Plan: `.ai/plans/YYYY-MM-DD-<slug>.md` (if any)
- Audit: `.ai/audits/YYYY-MM-DD-<slug>-validation.md` (if any)

## Out of scope (follow-ups)

- None.
```

When the work touched any keyword from `.claude/rules/research-discipline.md` (pool, max_connections, cache, retry, backoff, etc.), ALSO include a `### References` block inside `## Risk`, following that rule's output template.

---

## Title format examples

| Branch | Type | Scope | Title |
|---|---|---|---|
| `fix/issue-NNN-<slug>` | fix | api | `fix(api): handle null in user lookup` |
| `fix/issue-NNN-<slug>` | fix | auth | `fix(auth): prevent duplicate session on retry` |
| `feat/<slug>` | feat | ui | `feat(ui): status banner for connectivity` |
| `refactor/<slug>` | refactor | worker | `refactor(worker): unify retry policy across jobs` |
| `chore/<slug>` | chore | tooling | `chore(tooling): isolate writer agents in git worktrees` |

**Scope rules of thumb:**

- If the change is dominated by a single domain noun (contacts, connections, inbox, billing) → use that noun.
- If the change is dominated by a single layer (api, auth, ui, worker, gateway) → use that layer.
- Tests-only PR → `tests`.
- Tooling/skills/agents/memory → `tooling`.
- Cross-cutting with no dominant scope → omit scope: `<type>: <subject>`.

---

## Subject sanitization rules

When deriving subject from a commit message, strip:

- Leading `<type>(<scope>):` prefix (e.g. `fix(contacts): handle X` → `handle X`)
- Trailing `(fixes #N)` / `(closes #N)` / ` #N` references
- Trailing period
- Leading `WIP:` / `[WIP]` / `wip:`

After stripping, ensure:

- Imperative mood (first word is a verb in imperative form: add, fix, handle, prevent, scope, broaden, keep)
- First word lowercase
- Total length of `<type>(<scope>): <subject>` ≤ 60 characters

If the cleaned subject is too long, condense — never truncate mid-word.

---

## Partial success — branch pushed but PR creation failed (rare)

Used by Step 7 when `gh pr create` fails after push succeeded.

```markdown
### PR creation failed — manual step required

Branch was pushed (`<branch>`), but `gh pr create` failed.

**Likely cause:** <error from gh CLI stderr>

**Next step:** create the PR manually at:
https://github.com/<owner>/<repo>/pull/new/<branch>

Suggested title:
<title>

Suggested body (paste into description):

<full body>
```

---

## Failure modes & recovery

| Failure | Step | Recovery |
|---|---|---|
| Current branch is `main` | 1 | Abort. Tell user to create a feature branch first. |
| No diff against `main` | 1 | Abort. Nothing to PR. |
| `gh auth status` errors | 1 | Tell user to run `gh auth login`. Do not retry. |
| Open PR already exists for this branch | 1 | Abort. Show existing PR URL. Suggest `/pr-update` or manual edit. |
| No issue # found in branch or commits | 3 | Ask user. Allow PR without `Closes` if user confirms. |
| Branch prefix not in known list | 4 | Ask user which type. |
| Multiple scopes touched equally | 4 | Use domain noun if obvious, otherwise omit scope. |
| Tester results not in conversation context | 5 | Ask user. Do not fabricate test counts. |
| User rejects the proposed title/body | 6 | Apply edits, re-show, loop. |
| `git push` fails (no remote, permission) | 7 | Show error, ask user to fix remote/auth. |
| `gh pr create` fails after push | 7 | Use **Partial success** template above. |
