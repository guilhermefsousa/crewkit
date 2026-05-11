---
name: impact
description: "Analyze blast radius of changing a file, handler, entity, or module. Maps callers, tests, endpoints, and UI pages affected."
---

Analyze blast radius of: $ARGUMENTS

## Arguments

`/impact <target>` where `<target>` is one of:
- File path: `src/Services/UserService.cs`
- Handler name: `SendMessageHandler`
- Entity name: `Conversation`
- Module: `src/Application/Users`
- Endpoint: `POST /api/orders`

If `<target>` is ambiguous, ask before searching.

---

## When to use

Use before:
- Renaming any public API
- Removing a method or field
- Changing a state machine
- Refactoring a module boundary
- Starting any MEDIUM or LARGE task where blast radius is uncertain
- Investigating a production incident to understand what else might be affected

---

## Steps

### Step 1 — Load context

Read `.ai/memory/architecture.md` (module boundaries, layer rules) and `.ai/memory/conventions.md` (entity/handler patterns) before searching. These tell you WHERE to look and WHAT to look for.

From $ARGUMENTS, determine:
- **Target type:** file / class / handler / entity / endpoint / module
- **Target location:** resolve to exact file path(s) if not already a path
- **Stack:** infer from path extension and architecture.md

If $ARGUMENTS does not resolve to a known file or name, ask for clarification before proceeding. Do not guess at the target.

### Step 2 — Map direct callers

Search for all direct references to the target:

```bash
# Search for imports, usages, and references
# Adapt search patterns to the detected stack:
# - .NET: class name, interface name, constructor injection, handler registration
# - Node.js: require/import of the file, function call sites
# - Frontend: component references, page routes, event handlers
# - SQL/migrations: table name, column name in queries and seeders
```

Build the direct caller list:

| File | Reference type | Layer |
|------|---------------|-------|
| ... | import / call / inject / inherit | controller / service / handler / UI / test |

### Step 3 — Transitive impact (2 levels)

For each direct caller, check if it is itself called by other files:
- Go one level deeper if the direct caller is an interface, base class, or shared service
- Stop at two levels unless the target is a core shared abstraction (entity, base class, shared interface)
- Flag if the dependency graph is too wide to enumerate (>20 unique callers at any level)

If a public method is called by 20+ callers, flag as **HIGH-RISK change** and report widest callers first.

### Step 4 — Map tests

Find all test files that directly or indirectly test the target:

```bash
# Search test directories for the target name, class name, or endpoint path
# Look for test doubles (mocks, fakes, stubs) of the target
```

| Test file | Tests what | Has mock/fake of target? |
|-----------|-----------|--------------------------|
| ... | ... | yes / no |

Flag any test file that uses a mock/fake of the target — changing the target's interface or exception types will require updating those fakes.

### Step 5 — Public API vs internal

For each caller identified in Steps 2 and 3, classify:

- **Public**: exposed via API endpoint, event, library export, or doc reference → impact is project-wide, may affect external consumers
- **Internal**: only used within the module → impact is local

Mark each caller explicitly.

| Endpoint | Method | Consumer type |
|----------|--------|---------------|
| ... | ... | internal / public API |

Mark endpoints as **public API** if they are exposed externally — changes to those have higher blast radius.

### Step 6 — Classify blast radius

| Dimension | Count | Assessment |
|-----------|-------|-----------|
| Direct callers | N | — |
| Transitive callers | N | — |
| Test files affected | N | — |
| API endpoints affected | N | — |
| UI pages affected | N | — |
| Public API contracts affected | N | HIGH risk if >0 |
| Auth/tenant code affected | yes/no | HIGH risk if yes |
| DB schema affected | yes/no | HIGH risk if yes |

**Overall blast radius:**
- **LOW** — 1-2 files, same layer, no public API, no auth/schema
- **MEDIUM** — 3-7 files, cross-layer, no public API change
- **HIGH** — 8+ files, or public API, or auth/tenant, or DB schema change

### Step 7 — Change-shape analysis

| Change shape | Safety | Notes |
|--------------|--------|-------|
| Add new optional field/param | SAFE | Backwards-compatible |
| Add new method/endpoint | SAFE | No existing caller breaks |
| Rename (method/field/file) | BREAKING | All callers must update |
| Change return type | BREAKING | Even narrowing breaks consumers |
| Remove method/field | BREAKING | Hard remove without deprecation |
| Change behavior (same signature) | SUBTLE-BREAKING | No compile error but runtime semantics change |
| Change exception thrown | MEDIUM | Test fakes + callers that catch |
| Change DB column | BREAKING | Queries + migrations |

---

## Return Format

```markdown
---
**Impact Analysis: [target name]**
**Target type:** [file / class / handler / entity / endpoint / module]
**Stack:** [detected]

## Direct Callers
[table from Step 2]

## Transitive Impact
[table from Step 3, or "None — direct callers are leaf nodes"]

## Tests Affected
[table from Step 4]
[Flag: "N test files use a mock/fake of this target — update them if interface changes"]

## Endpoints and UI Pages
[table from Step 5, or "Not applicable"]

## Blast Radius Summary
[table from Step 6]

**Blast radius: LOW / MEDIUM / HIGH**

## Safe vs. Breaking Changes
[table from Step 7]

## If you change this, also change
- [ ] [file — reason]
- [ ] [file — reason]
- [ ] [test file — update assertions or fakes]

## Recommendation
[1-3 sentences: what to do before making this change, and what to watch for]
---
```
