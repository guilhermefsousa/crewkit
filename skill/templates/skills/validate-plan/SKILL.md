---
name: validate-plan
description: "Audit a plan file's `## Verifiable Claims` section against current project state using a deterministic script (no LLM). Required gate before /full-workflow runs the coder for any plan with factual claims."
---

Validate the plan file at: $ARGUMENTS

## Why this exists

Plans reaching the coder phase with factually wrong claims (line numbers, APIs,
package state) cause wasted cycles and regressions. Empirical research
(Stechly, Valmeekam, Kambhampati 2024 — arxiv.org/abs/2402.08115) shows
**same-model self-critique causes performance collapse** on planning tasks;
sound external (deterministic) verification produces gains. Anthropic's
official skill best-practices documents the `plan-validate-execute` pattern
with script-based validation.

This skill is the script-based external verifier. **No LLM judgment in the
hot path.** The orchestrator's job here is to invoke the script, present
results, update plan status — not to second-guess the script.

## When to invoke

- After `/explore-and-plan` produces a plan with a `## Verifiable Claims` section.
- Before `/full-workflow <plan>` is run on a plan that has factual claims.
- After fixing a plan that previously failed validation.

If the plan has no `## Verifiable Claims` section AND it references concrete
state (file paths, line numbers, packages, issues, counts), the plan is
incomplete — return the user to `/explore-and-plan` to add the section.

## What the script checks

The validator at `.claude/scripts/validate-plan.js` supports these claim types.
**The script is the source of truth.** This list is for documentation only.

| Type | Required fields | What it checks |
|------|-----------------|----------------|
| `file_exists` | `file` | File present at path (relative to repo root). |
| `symbol_at_line` | `file`, `line`, `symbol_contains` | The exact line `N` of file contains the substring. |
| `package_installed` | `manifest`, `package` | `.csproj` has `<PackageReference Include="X"/>` OR `package.json` declares X in any deps map. |
| `package_version_published` | `package`, `min_version` | A version >= `min_version` is published on npm or NuGet. |
| `github_issue_state` | `repo`, `issue`, `expected` | `gh issue view` returns the expected state. PR `merged` is distinct from issue `closed` — match exactly. |
| `line_count_in_path` | `glob`, `pattern`, `expected_count` | `git ls-files` matching `glob`, regex `pattern`, total occurrences equals `expected_count`. |
| `command_output_contains` | `command`, `contains` or `contains_min` | Disabled by default. Set `CREWKIT_VALIDATE_ALLOW_COMMAND=1` to enable (security-gated). |

## Workflow

**Apply the shared policy: [.claude/rules/plan-validation-flow.md](../../rules/plan-validation-flow.md).**

That document is the single source of truth for: how to invoke the validator,
the Status mapping (including NO_CLAIMS_SECTION → VALIDATED), what to print,
and the 4-option branching on FAIL/UNKNOWN.

This skill exists as the user-facing entry point so a user can run validation
explicitly (e.g., after editing a plan manually). The same policy is also
auto-applied by `/explore-and-plan` Step 5 and `/full-workflow` Step 0.5 — so
in normal flow you do not need to invoke this skill manually.

### Skill-specific contract

- Input: path to a plan file (via `$ARGUMENTS`).
- Output: validation summary surfaced to user; audit written; plan Status
  auto-updated by the script.
- Side effects: the script edits the plan's `**Status:**` line. To skip the
  edit, invoke the script directly with `--no-update`.
- Do not paraphrase the audit: surface exact evidence for any non-PASS claim.
- Do not auto-trigger `/explore-and-plan` or `/full-workflow` after a result.
  Per the shared policy, the user picks the next action.

## What this skill does NOT do

- **Does not validate that the plan's design is good.** Only that its factual
  claims about current state are correct. A bad design with correct claims
  still passes. Reviewer agent catches design issues.
- **Does not run code or tests.** Validation is static (file existence,
  package metadata, registry lookups). Runtime behavior is out of scope.
- **Does not LLM-judge.** No "this looks suspicious" warnings. Only
  deterministic PASS/FAIL/UNKNOWN with evidence.
- **Does not auto-fix the plan.** If the architect produced a wrong line
  number, the architect (re-invoked via `/explore-and-plan`) must fix it.
- **Does not bypass for hotfix.** If a hotfix plan has factual claims and
  any FAIL, validation blocks. To skip `command_output_contains` claims only,
  set `CREWKIT_VALIDATE_ALLOW_COMMAND=1`. There is no general bypass for
  hotfix — urgency was historically the trigger for the worst plans.

## Failure modes to watch

- **Architect emitted prose claims instead of YAML tuples.** Example: plan
  says "modify Program.cs:77 to add OpenTelemetry" but no
  `Verifiable Claims` section. Detection: NO_CLAIMS_SECTION returned despite
  plan having factual content. Fix: send back to `/explore-and-plan`.
- **Architect emitted unparseable YAML.** Detection: script exits 3 with
  parse error. Fix: re-generate the claims block manually using the schema
  in the architect agent definition.
- **All claims PASS but the design is broken.** Detection: out of scope for
  this skill — relies on reviewer/tester to catch. Validate-plan only
  guarantees factual grounding, never design quality.
- **gh / curl / git unavailable.** Detection: UNKNOWN status. Fix: install
  the missing tool, or remove that claim type from the plan.

## Cross-references

- `.claude/agents/architect.md` — Verifiable Claims Discipline (architect's
  output contract).
- `.claude/skills/explore-and-plan/SKILL.md` — Plan template includes the
  `## Verifiable Claims` section; lifecycle includes `VALIDATED` and
  `NEEDS_REWORK` statuses.
- `.claude/scripts/validate-plan.js` — the actual validator (CommonJS Node
  script, no runtime deps, cross-platform).
- `.ai/audits/<slug>-validation-<date>.md` — per-run audit output.
