# Research Discipline — Stack-aware External Evidence

Single source of truth for **best-practice web research** when a task touches a
shared/finite/scaling resource. Referenced by `/hotfix` Step 1.6 today; can be
referenced by any other skill that needs the same gate.

When changing this policy, update this file ONLY.

---

## When this discipline applies

Web research is MANDATORY before writing code if the diagnosis or proposed fix
touches any of these keywords:

`pool` · `max_connections` · `connection limit` · `file descriptor` · `cache` ·
`retry` · `backoff` · `event loop` · `memory leak` · `thread pool` ·
`singleton` · `rate limit` · `circuit breaker` · `lock` · `mutex`

If the task does not touch any of these → research not required by this rule
(other rules may still apply).

---

## Stack-awareness — the load-bearing rule

**All research MUST be pinned to the EXACT version we use.**

Generic searches like `postgres pool best practice` return mixed results across
different versions of the same library. Guidance for one version is often the
OPPOSITE of guidance for another.

**Citing a doc/blog about the wrong version is worse than no research; it
builds false confidence.** This is not a stylistic concern — it has produced
wrong recommendations in real projects.

---

## Required steps

1. **Identify the exact installed version.** Read the manifest:
   - .NET → `*.csproj` (PackageReference Version="...")
   - Node → `package.json` + lockfile

2. **Search with version pinned.** Format:
   `<library> <version> <pattern> best practice` AND
   `<library> <version> <pattern> antipattern`.
   **Generic searches without version are BANNED.**

3. **Read official docs covering OUR version.** Acceptable sources:
   library's own docs, vendor's docs, RFC.
   **NOT acceptable**: random blogs, Stack Overflow answers, generic Medium
   posts. If only older-version docs exist, flag in Risk assessment as
   "guidance based on vN.X may not apply to vN.Y" and reduce confidence.

4. **Cite each URL** in the PR's Risk assessment under `### References` with:
   URL · version covered · one-line takeaway tying it to the decision.

5. **Antipattern check.** If the proposed fix matches a documented antipattern
   → **STOP**, present the documented best practice to the user, get explicit
   approval before proceeding.

---

## Precedent (why this rule exists)

{{project_precedent}}

If you need to add precedents, document them here with: date, what went wrong, what guidance was missed, what the correct guidance was.

---

## Output template (for triage comments / PR risk sections)

```markdown
### Research — Stack & Best-Practice Check

**Stack identified:** <library> <exact-version> · <pattern matched from keyword list>
**Search queries used:**
- `<library> <version> <pattern> best practice`
- `<library> <version> <pattern> antipattern`
**References consulted (official, version-matched):**
- <URL 1> · <version covered> · <one-line takeaway>
- <URL 2> · <version covered> · <one-line takeaway>
**Decision:** [Proceed / Escalate / Stop-antipattern-detected] — <one-sentence reason>
```
