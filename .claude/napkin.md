# Napkin Runbook

## Curation Rules
- Re-prioritize on every read.
- Keep recurring, high-value notes only.
- Max 10 items per category.
- Each item includes date + "Do instead".

## Execution & Validation (Highest Priority)
1. **[2026-04-06] Zero runtime dependencies — keep it that way**
   Do instead: never add dependencies to package.json. All logic stays self-contained in src/ and skill/.

2. **[2026-04-06] SKILL.md is the brain — changes there affect every generated project**
   Do instead: treat SKILL.md edits like schema migrations. Validate phase outputs and generation order after any change.

3. **[2026-04-06] Graceful failure order in Phase 7 generation**
   Do instead: always generate shared memory (.ai/memory/) first, then IDE-specific files. If interrupted, partial output must still be useful.

## Shell & Command Reliability
1. **[2026-04-06] CLI runs via `npx crewkit` — ESM with Node >=20**
   Do instead: use `import`/`export` syntax, never `require`. Test with `node --test` (built-in runner).

2. **[2026-04-06] Hooks are bash scripts — must work cross-platform**
   Do instead: use POSIX-compatible bash in hook templates. Avoid bashisms that break on minimal shells.

## Domain Behavior Guardrails
1. **[2026-04-06] Confidence-based rule generation: HIGH = hard rule, MEDIUM = note, LOW = observation**
   Do instead: never promote a MEDIUM-confidence pattern to a hard rule in CLAUDE.md. Keep calibration strict.

2. **[2026-04-06] Multi-IDE shared memory lives in .ai/memory/, not in IDE-specific dirs**
   Do instead: architecture.md, conventions.md, commands.md, testing.md, lessons.md always go in .ai/memory/. IDE adapters reference them.

3. **[2026-04-06] Pack system uses pack.json manifests**
   Do instead: when adding a new pack, create skill/packs/{name}/pack.json with name, description, and components.skills array.

## User Directives
1. **[2026-04-06] All repos must be PRIVATE by default**
   Do instead: always use `gh repo create --private`. Public only after explicit user approval.
