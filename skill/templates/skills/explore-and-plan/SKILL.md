---
name: explore-and-plan
description: "Map a module or feature area, present decisions for user approval, then create a versioned implementation plan. Uses explorer (Sonnet) + architect (Opus) + reviewer (Opus, semantic plan review)."
---

Explore and plan for: $ARGUMENTS

## Invariants — HARD rules

1. **Never generate the plan file before explicit user confirmation of all decisions.**
2. **Never silently choose an unresolved decision.**
3. **Never expand scope beyond what the user approved.**
4. **If the user overrides the architect's recommendation, record the override explicitly.**
5. **Never call the architect subagent after Step 3.** The orchestrator writes the plan.
6. **If the plan makes factual claims about the codebase (files exist, packages installed, issues open, symbols at specific lines), the plan MUST include a `## Verifiable Claims` section in YAML format.** These are validated deterministically by `validate-plan.js` before coder runs. Claim types: `file_exists`, `symbol_at_line`, `package_installed`, `package_version_published`, `github_issue_state`, `line_count_in_path`, `command_output_contains`. Plans missing this section when factual claims exist are INVALID and must not be saved.

---

## Subagents

| Phase | Subagent | Model |
|-------|----------|-------|
| Discovery | `explorer` | Sonnet |
| Architecture | `architect` | Opus |
| Plan review (semantic) | `reviewer` | Opus |

## Steps

### 1. Discovery
Use **explorer** to find all relevant files, dependencies, and patterns:
- Map affected files
- Identify existing patterns
- Identify related tests or absence of tests
- Identify runtime-critical dependencies and public contracts affected
- Identify side effects on startup/boot
- Identify singleton/global mutable state or hidden coupling
- Classify testability (easy/medium/hard) with blockers
- Measure blast radius

**Explorer focus rules:**
- Give specific scope — never "explore the whole repo"
- Include user's task description in explorer prompt
- Discovery is sufficient when: files mapped, dependencies identified, testability classified
- If findings are vague, ask for targeted second pass on the gap

### 1.5. OOTB Research (MANDATORY when discovery surfaces cross-cutting concerns)

Before letting the architect propose custom implementations, identify whether
mature libraries/packages already solve the problem. **This step is MANDATORY**
when discovery surfaces ANY of:

- Cross-cutting concerns (logging, audit, telemetry, request scope, retries,
  caching, rate limiting, validation pipelines, serialization)
- New infrastructure layer (interceptors, middleware, delegating handlers,
  filters, behaviors)
- New custom abstraction (interface + impl) for a generic concern
- The user's task description contains words like "wrapper", "shim",
  "centralized", "cross-cutting", "framework", "platform layer"

Use **WebSearch + WebFetch + context7** to research:

1. **Already-installed packages**: scan manifests (e.g., `*.csproj`, `package.json`). Some solutions may already be in scope as config-only — no new code needed.
2. **Mature alternatives** for missing capabilities: cite version, last release date, license (MIT/Apache OK; GPL flag), maintenance status (last commit <12mo = active), download/star counts as maturity signals.
3. **Beta/experimental flag**: if a candidate is pre-release or <1.0, mark it as DEFER unless user explicitly accepts the stability risk.
4. **Custom-justified cases**: domain-specific semantics that no generic lib captures.

Per `.claude/rules/research-discipline.md` — all research MUST be pinned to the exact version in use.

Output (passed to architect as input alongside explorer findings):

```markdown
## OOTB Research Summary

| Proposed Custom | OOTB Equivalent | Verdict | Notes |
|---|---|---|---|
| retry handler | Polly (.NET) / async-retry (Node) | USE | High maturity, active |
| custom audit log | None | BUILD | Domain-specific (billing tie-in) |

## Recommendation
- N proposals become package/config
- M remain custom (justified above)
- Estimated: X LOC new (vs Y LOC if 100% custom)
```

The architect MUST consume this research and explicitly justify any custom implementation kept despite OOTB existence. Skip this step ONLY if discovery found zero cross-cutting concerns (e.g., pure bug fix, single-handler change).

### 2. Architecture analysis
Use **architect** with explorer findings + OOTB research as input. Must return:
- Open decisions with options, pros/cons, recommendation
- Trade-off classification (required / compromise / debt / convenience)
- Pushback on weak approaches
- **Verify decision compatibility:** If the task has both "where" (location/route) and "how" (mechanism/interaction) decisions, verify they are compatible BEFORE presenting them separately. If choosing location A eliminates mechanism B, say so explicitly.
- Risk assessment and blast radius
- Task size (SMALL / MEDIUM / LARGE)
- Technical verdict (APPROVE / APPROVE WITH CHANGES / DO NOT APPROVE)

**The architect must NOT produce the plan.** Only analysis and decisions.

### 3. Present decisions — MANDATORY PAUSE (one-by-one)

**DO NOT create the plan yet.**

First, present a brief summary: task size, technical verdict, total number of decisions, and key risks. Then present decisions **one at a time**, waiting for user response before showing the next.

**For each decision:**
1. **Name the decision** clearly (e.g., "D1: How to store the onboarding flag")
2. **Explain what it solves** — 1-2 sentences so the user understands WHY this decision matters
3. **Present options as a table** with Pros and Cons columns
4. **Explain the practical difference** — not abstract architecture, but what concretely changes for the user/system with each option
5. **State your recommendation** with a clear prompt (e.g., "Go with A?")
6. **Wait for the user to respond** before presenting the next decision

**Rules:**
- ONE decision per message. Never batch multiple decisions.
- If the user agrees, confirm and move to the next immediately.
- If the user disagrees, acknowledge the override and record it. Then move to the next.
- If the user asks for more detail, explain further before asking again.
- After ALL decisions are confirmed, show a complete summary table.
- If scope is large, ask about scope reduction early (D1 or D2) since it affects all subsequent decisions.

**Wait for ALL decisions to be resolved before proceeding to step 4.**

### 4. Create plan file (after confirmation)

Get today's date via `date +%Y-%m-%d 2>/dev/null || powershell -Command "Get-Date -Format 'yyyy-MM-dd'"` (fallback for Windows).
Generate slug from feature name (lowercase, hyphens, max 40 chars).

The **orchestrator** writes the plan using explorer + architect + user decisions.

**Rules:**
- Do NOT reopen approved decisions
- Do NOT invent new scope
- Do NOT add extras not approved
- If any decision unresolved → do NOT create yet

Save to `.ai/plans/YYYY-MM-DD-<slug>.md`:

```markdown
# Plan: <feature name>
**Date:** YYYY-MM-DD
**Status:** DRAFT
**Size:** SMALL / MEDIUM / LARGE

## Problem
[What needs to change and why]

## Dependencies / Prerequisites
[What must exist before execution — or "None"]

## Decisions
[Resolved decisions with chosen option and rationale]

## Verifiable Claims

<!--
REQUIRED if the plan references concrete state (file paths, line numbers, packages, issues, counts).
Each entry is a typed YAML tuple. Validator: node .claude/scripts/validate-plan.js <plan-path>
Supported types: file_exists, symbol_at_line, package_installed, package_version_published,
                 github_issue_state, line_count_in_path, command_output_contains
Plans with prose claims and no tuples here will FAIL validate-plan and CANNOT progress to coder.
-->
```yaml
claims:
  - id: claim-1
    type: file_exists
    path: src/MyService/Program.cs

  - id: claim-2
    type: package_installed
    package: Polly
    project: src/MyApp/MyApp.csproj

# add more tuples as needed
```

## Files to change
| File | Action | Description |
|------|--------|-------------|
| path/to/file | MODIFY | what changes |
| path/to/new  | CREATE | what it does |

## Approach
[Ordered implementation steps]

## Tests needed
- Unit: [what]
- Integration: [what]

## Risks
[What could go wrong]

## Blast radius
**Low / Medium / High** — [justification]
```

**Plan status lifecycle:**
- **DRAFT** — created by this skill, decisions confirmed by user, not yet validated
- **APPROVED** — user explicitly approved (set by orchestrator after Step 3 confirmation)
- **VALIDATED** — `validate-plan.js` ran and ALL claims returned PASS. Required before IN_PROGRESS for any plan with factual claims. Plans with no factual claims skip this status.
- **NEEDS_REVISION** — reviewer (Step 5) found issues; plan must be revised
- **NEEDS_REWORK** — `validate-plan.js` found at least one FAIL claim. Plan must be corrected and re-validated.
- **IN_PROGRESS** — `/full-workflow` started executing (set by full-workflow on coder start)
- **DONE** — implementation complete, tests passing, reviewer approved

The orchestrator updates the Status field at each transition. This prevents re-executing a completed plan or starting work on a draft that was never approved.

### 5. Semantic plan review (reviewer Opus) — runs BEFORE validate-plan

After saving the plan, **dispatch the `reviewer` subagent (Opus)** in read-only mode with the plan path **before** running the deterministic validator. Order matters: if the plan is semantically wrong, there is no point spending cycles on factual validation of a broken plan. The reviewer also catches drift that `validate-plan.js` cannot see — `validate-plan` only checks factual claims; it does not catch semantic decisions, cross-plan conflicts, or race conditions in the proposed approach.

The reviewer must answer this fixed checklist:

1. **Solution actually fixes the problem?** Re-read `## Problem` and `## Approach`. Edge case the architect missed (concurrency, ordering, boundary)?
2. **Tests reproduce the bug RED→GREEN?** Pre-fix test must FAIL for the right reason. A smoke test that passes both before and after is not acceptable — call it out.
3. **Kill-switch real or vaporware?** If the plan claims a kill-switch, can the implementer flip it without a rebuild? A hardcoded `const X = true` in source is build-time, not a kill-switch. Flag it.
4. **Cross-plan conflicts documented?** If another plan in `.ai/plans/*.md` touches the same file/symbol, the plan must name it and define rebase order.
5. **Decisions still valid?** Re-verify at least 2 line references in `## Verifiable Claims`. Catch semantic drift that survives literal symbol match.
6. **References pinned to versions in use?** Plans touching pool/cache/retry/event loop/lock keywords (per `.claude/rules/research-discipline.md`) must have URLs version-pinned to packages actually installed.
7. **Adjacent scenarios documented?** Each non-trivial change should have one line on what doesn't regress and why.
8. **Critical gap the architect missed?** Open-ended — reviewer's fresh-eye pushback.

Verdict: `APPROVE_FOR_CODER` / `NEEDS_MINOR_FIX` / `NEEDS_REWORK` / `REJECT`.
Output bounded to ~300 words, structured bullets.

**Skip Step 5 ONLY when:**
- Plan has no `## Verifiable Claims` section (no factual claims = no semantic surface to review beyond what user approved in Step 3).
- Task size is SMALL **and** Blast radius is Low **and** the architect declared zero adjacent scenarios — then the Opus cost is not justified.

Otherwise Step 5 is **mandatory**.

### 5.5. Branch on reviewer verdict

| Reviewer verdict | Action |
|---|---|
| `APPROVE_FOR_CODER` | Proceed to Step 6 (deterministic validate-plan). |
| `NEEDS_MINOR_FIX` | Surface findings (≤5 bullets). Present user with 3 options: (1) **Apply fixes mechanically** — orchestrator edits the plan based on review findings, then re-runs Step 5. (2) **Re-spawn architect** to redesign — restart from Step 2 with reviewer findings as input. (3) **Skip review** — explicit user override; record `VALIDATED_WITH_OVERRIDE` rationale, then proceed to Step 6. |
| `NEEDS_REWORK` | Same 3 options as `NEEDS_MINOR_FIX`, but default recommendation is option (2) — rework is structural, not cosmetic. |
| `REJECT` | Plan is fundamentally flawed. Default action: option (2). Do not let user pick option (3) without explicit confirmation that they understand the risk. |

**Loop control:** maximum 2 reviewer cycles per plan. After 2 `NEEDS_*` verdicts in a row, stop and escalate to user — automated rework isn't converging; human judgement is needed.

### 6. Auto-validate (deterministic) and return

Now that the reviewer has approved the plan semantically, run the deterministic validator to catch any remaining factual drift.

**Apply the shared policy: `.claude/rules/plan-validation-flow.md`.**

That document is the single source of truth for: how to invoke the validator, the Status mapping, what to print, and the 4-option branching on FAIL/UNKNOWN. Do not duplicate the prose here — read the rule and apply it.

```
node .claude/scripts/validate-plan.js <plan-path>
```

After the validator completes:
- On `VALIDATED`: print the plan + reviewer summary + audit. Suggest `/full-workflow <plan-path>`.
- On `NEEDS_REWORK`: surface findings and present the 4-option choice from the shared policy. Wait for user to pick before any further action.
