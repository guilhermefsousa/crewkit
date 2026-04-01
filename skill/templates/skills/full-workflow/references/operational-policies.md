# Full-Workflow — Operational Policies

Referenced by `SKILL.md`. Load when entering consolidation, fix loop, or stop conditions.

---

## Exit gate

**HARD BLOCK: No task is complete without reviewer APPROVED (clean).**

- Tester PASS alone is **not sufficient**
- Reviewer APPROVED is **mandatory** before Summarize
- **APPROVED with IMPORTANT+ findings is NOT clean.** Fix, then re-run tester + reviewer.
- Both must be clean (PASS + APPROVED without IMPORTANT+ findings) before Summarize.

---

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

---

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

---

## Test creation rule

**Every behavioral change must be validated by tests.** The tester creates them automatically.

- New feature with logic → unit tests + integration when applicable
- Bug fix → test that reproduces the bug + verifies the fix
- Refactor with preserved behavior → existing tests are sufficient
- Cosmetic/text/DTO change without logic → build + review is sufficient

---

## HIGH risk rules

- Never auto-fix — all through coder
- Full test suite on every revalidation
- Reviewer always mandatory
- Architect mandatory if any design decision is open

---

## Stop conditions

STOP and escalate when:
- Build doesn't stabilize after 2 corrections
- Reviewer flags an architectural problem
- Tester finds widespread failures outside task scope
- Root cause unclear after 1 fix loop
- Affected files grow beyond plan
- SMALL/MEDIUM reveals structural impact
