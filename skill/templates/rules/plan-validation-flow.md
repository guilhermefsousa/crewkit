# Plan Validation Flow — Shared Policy

Single source of truth for the auto-validate behavior used by:

- `/explore-and-plan` Step 5 (auto-validate after plan creation)
- `/full-workflow` Step 0.5 (auto-validate before coder runs)
- `/validate-plan` (manual user invocation)

When changing this policy, update this file ONLY. Skills should reference it,
not duplicate the prose.

---

## 1. Run the deterministic validator

```
node .claude/scripts/validate-plan.js <plan-path>
```

The script:

- Parses the `## Verifiable Claims` YAML in the plan (or detects its absence).
- Runs deterministic checks per claim: `file_exists`, `symbol_at_line`,
  `package_installed`, `package_version_published`, `github_issue_state`,
  `line_count_in_path`, `command_output_contains` (the last is gated by
  `CREWKIT_VALIDATE_ALLOW_COMMAND=1`).
- Writes a structured audit to `.ai/audits/<slug>-validation-<date>.md`.
- Auto-updates the plan's `**Status:**` field per the mapping below.
- Pass `--no-update` to skip the status mutation (validation-only mode).

## 2. Status mapping (auto-applied by the script)

| Validator outcome | Plan Status set to | Meaning |
|---|---|---|
| All claims PASS | `VALIDATED` | Plan is grounded; can proceed to coder. |
| Any claim FAIL | `NEEDS_REWORK` | At least one factual claim is wrong; plan must be corrected. |
| Any claim UNKNOWN, no FAIL | `NEEDS_REWORK` | Tooling unavailable or network failed; treat as blocker until resolved. |
| `## Verifiable Claims` section absent | `VALIDATED` | Per architect discipline: absence = no factual claims to validate. |

The script's exit code mirrors the outcome: `0` on PASS / NO_CLAIMS_SECTION,
`1` on FAIL, `2` on UNKNOWN, `3` on parse error.

## 3. Surface the result

Print to user:

- Full plan content (only on first run, not on revalidation)
- `Plan saved to <path>` (when applicable)
- `Validation: <STATUS>, PASS=N FAIL=M UNKNOWN=K`
- `Audit: .ai/audits/<slug>-validation-<date>.md`

## 4. Branch on outcome

### PASS (`VALIDATED`)

Tell the user the plan is ready. Suggest:

```
Run /full-workflow .ai/plans/YYYY-MM-DD-<slug>.md to implement
```

### FAIL or UNKNOWN (`NEEDS_REWORK`)

**DO NOT auto-fix and DO NOT auto-loop back to the architect.** Surface each
non-PASS claim with type + evidence (from the audit). Then present this
numbered choice to the user:

1. **Fix specific claim(s) manually** — orchestrator edits the YAML tuple(s)
   based on user instruction, then re-runs the validator.
2. **Re-spawn architect with the audit findings** — restart Steps 2–5 of
   `/explore-and-plan` with the audit file as additional input.
3. **Edit the plan manually** — user takes over; orchestrator pauses.
4. **Cancel** — leave plan as `NEEDS_REWORK`; user comes back later.

Wait for the user to pick. Do not pick for them.

### Why manual

The audit findings are typed, but the right fix is semantic. A FAIL on
`package_version_published "Audit.NET.Annotations"` could mean (a) typo (real
package is `Audit.NET.Core`), (b) plan premise wrong (architect assumed a
package that does not exist), or (c) wrong claim type (it is a stable release
that should be checked differently). Only the user knows which.

After the user picks and the fix is applied, **re-run the validator** and check
again. Loop until `VALIDATED` or user picks Cancel.

## 5. Trust basis

- Stechly, Valmeekam, Kambhampati 2024 (arxiv.org/abs/2402.08115): same-model
  self-critique causes performance collapse on planning tasks; sound external
  verification produces gains.
- Anthropic skill best-practices: `plan-validate-execute` pattern with
  script-based validation is the documented approach.

No LLM judgment in the gate hot path.
