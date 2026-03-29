---
name: impact
description: "Analyze blast radius of changing a file, handler, entity, or module. Maps callers, tests, endpoints, and UI pages affected."
---

Analyze blast radius of: $ARGUMENTS

$ARGUMENTS must be a file path, handler name, entity name, module name, or endpoint.
Examples: `src/Orders/OrderHandler.cs`, `OrderEntity`, `POST /api/orders`, `Orders module`

---

## When to use

Use before starting any MEDIUM or LARGE task to understand the full scope of change.
Use before `/explore-and-plan` when the target is already known but blast radius is uncertain.
Use after a production incident to understand what else might be affected by the fix.

---

## Steps

### 1. Identify the target

From $ARGUMENTS, determine:
- **Target type:** file / class / handler / entity / endpoint / module
- **Target location:** resolve to exact file path(s) if not already a path
- **Stack:** infer from path extension and `.ai/memory/architecture.md`

Read `.ai/memory/architecture.md` and `.ai/memory/conventions.md` to understand layer rules
and naming conventions before searching.

### 2. Map direct callers

Search for all direct references to the target:

```bash
# Search for imports, usages, and references
# Adapt search patterns to the detected stack:
# - .NET: class name, interface name, constructor injection, handler registration
# - Node.js: require/import of the file, function call sites
# - Blazor: component references, @inject, @page routes, event handlers
# - SQL/migrations: table name, column name in queries and seeders
```

Build the direct caller list:

| File | Reference type | Layer |
|------|---------------|-------|
| ... | import / call / inject / inherit | controller / service / handler / UI / test |

### 3. Map transitive impact

For each direct caller, check if it is itself called by other files:
- Go one level deeper if the direct caller is an interface, base class, or shared service
- Stop at two levels unless the target is a core shared abstraction (entity, base class, shared interface)
- Flag if the dependency graph is too wide to enumerate (>20 unique callers at any level)

### 4. Map tests

Find all test files that directly or indirectly test the target:

```bash
# Search test directories for the target name, class name, or endpoint path
# Look for test doubles (mocks, fakes, stubs) of the target
```

| Test file | Tests what | Has mock/fake of target? |
|-----------|-----------|--------------------------|
| ... | ... | yes / no |

Flag any test file that uses a mock/fake of the target — changing the target's interface or
exception types will require updating those fakes.

### 5. Map API endpoints and UI pages

If the target is a handler, service, or entity:
- Find which API endpoints call it (controller/route → handler)
- Find which UI pages or components consume those endpoints (if frontend source is available)

| Endpoint | Method | UI page/component | Consumer type |
|----------|--------|------------------|---------------|
| ... | ... | ... | internal / public API |

Mark endpoints as **public API** if they are exposed externally — changes to those have higher blast radius.

### 6. Classify blast radius

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

### 7. Identify change categories

Classify what types of changes to the target would cause breakage vs. safe changes:

| Change type | Breakage risk | Affected consumers |
|-------------|--------------|-------------------|
| Add new field (non-breaking) | LOW | none |
| Rename field or method | HIGH | all callers + test fakes |
| Change return type | HIGH | all callers |
| Change exception thrown | MEDIUM | test fakes + callers that catch |
| Add required parameter | HIGH | all call sites |
| Add optional parameter | LOW | none |
| Split into two classes | HIGH | all callers + DI registrations |
| Change DB column | HIGH | queries + migrations |

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
[table or "None — direct callers are leaf nodes"]

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

## Recommendation
[1-3 sentences: what to do before making this change, and what to watch for]
---
```

If $ARGUMENTS does not resolve to a known file or name, ask for clarification before proceeding.
Do not guess at the target.
