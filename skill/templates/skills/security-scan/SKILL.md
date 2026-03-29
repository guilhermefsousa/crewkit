---
name: security-scan
description: "Scan for known CRITICAL security issues and OWASP top 10 vulnerabilities specific to this project. Reports status of each known issue."
---

Run security scan for: $ARGUMENTS

If $ARGUMENTS is empty, scan the full codebase.
If $ARGUMENTS is a path or module name, scope the scan to that area.

---

## When to use

Use before merging changes that touch auth, tenant isolation, input handling, external integrations,
or any area that directly processes user-supplied data. Not a replacement for automated SAST —
a targeted, context-aware review using project conventions.

---

## Steps

### 1. Load project context

Read `.ai/memory/conventions.md` and `.ai/memory/architecture.md`.

Extract:
- Security rules declared in conventions (e.g., TenantId must come from JWT, not body)
- Auth mechanism (JWT, sessions, API keys)
- Data flow: where external input enters the system
- Stack-specific concerns (e.g., SQL via ORM, HTML rendering, file uploads)

### 2. Map attack surface

Identify entry points within the scan scope:

```bash
# Find API endpoint definitions
# (adapt pattern to the project's stack — controllers, routes, handlers, etc.)

# Find places that read from request body, query string, or headers
# Find places that write to DB or execute queries
# Find places that render HTML or return user-supplied content
# Find places that call external services
# Find files that handle auth or session state
```

Run searches appropriate to the detected stack. Do not run all commands if the stack is clear
from `.ai/memory/architecture.md`.

### 3. Check OWASP Top 10

For each category, determine status based on code inspection:

| # | Category | Status | Evidence |
|---|----------|--------|----------|
| A01 | Broken Access Control | PASS / FAIL / PARTIAL / SKIP | [file:line or reason for skip] |
| A02 | Cryptographic Failures | PASS / FAIL / PARTIAL / SKIP | |
| A03 | Injection (SQL, NoSQL, cmd) | PASS / FAIL / PARTIAL / SKIP | |
| A04 | Insecure Design | PASS / FAIL / PARTIAL / SKIP | |
| A05 | Security Misconfiguration | PASS / FAIL / PARTIAL / SKIP | |
| A06 | Vulnerable Components | PASS / FAIL / PARTIAL / SKIP | |
| A07 | Auth & Session Management | PASS / FAIL / PARTIAL / SKIP | |
| A08 | Software & Data Integrity | PASS / FAIL / PARTIAL / SKIP | |
| A09 | Security Logging & Monitoring | PASS / FAIL / PARTIAL / SKIP | |
| A10 | Server-Side Request Forgery | PASS / FAIL / PARTIAL / SKIP | |

**Status definitions:**
- `PASS` — checked, no issue found
- `FAIL` — issue found, report exact location
- `PARTIAL` — partially mitigated, describe gap
- `SKIP` — not applicable to this scope (explain why)

### 4. Check project-specific security rules

From the rules extracted in Step 1, verify each one explicitly.

Common examples (adapt to what conventions.md actually says):

| Rule | Status | Evidence |
|------|--------|----------|
| TenantId sourced from JWT only (never from body/query) | PASS / FAIL | |
| No hardcoded secrets or API keys in source files | PASS / FAIL | |
| Auth enforced on all non-public endpoints | PASS / FAIL | |
| User-supplied data never passed to raw SQL or shell | PASS / FAIL | |
| File uploads validated for type and size | PASS / FAIL / N/A | |
| External service calls use timeout and error handling | PASS / FAIL / N/A | |

### 5. Check for secrets in code

Search for common secret patterns:

```bash
# Patterns to search: password=, secret=, apikey=, token=, connectionstring=
# in non-test, non-example source files
# Flag any hardcoded value that is not an environment variable reference
```

Report any findings with file path and line number. Flag `FAIL` in A02 if found.

### 6. Classify findings

| Severity | Criteria |
|----------|----------|
| CRITICAL | Exploitable without authentication, or exposes tenant data across boundaries |
| HIGH | Exploitable by authenticated users, privilege escalation, or data exposure |
| MEDIUM | Requires specific conditions, indirect exposure, or defense-in-depth gap |
| LOW | Best practice violation, minor information leakage, or hardening opportunity |

---

## Return Format

```markdown
---
**Security Scan Report**
**Scope:** [full codebase or specific module]
**Stack:** [detected from architecture.md]

## OWASP Top 10 Status
[table from Step 3]

## Project-Specific Rules
[table from Step 4]

## Findings

### CRITICAL
- [none | list with file:line, description, remediation]

### HIGH
- [none | list]

### MEDIUM
- [none | list]

### LOW
- [none | list]

## Summary
| Total findings | CRITICAL | HIGH | MEDIUM | LOW |
|---------------|----------|------|--------|-----|
| N | N | N | N | N |

**Overall status:** CLEAN / NEEDS_ATTENTION / CRITICAL_ACTION_REQUIRED

## Recommended next steps
[numbered list, prioritized by severity]
---
```

**CLEAN** = zero CRITICAL or HIGH findings.
**NEEDS_ATTENTION** = one or more MEDIUM findings, zero CRITICAL/HIGH.
**CRITICAL_ACTION_REQUIRED** = any CRITICAL or HIGH finding present.

Do not suggest generic remediation. Every recommendation must reference the specific file,
function, or rule from conventions.md.
