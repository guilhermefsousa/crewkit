# crewkit

Context engineering framework for AI-assisted development. One command to set up agents, skills, hooks, rules, and memory for your project.

## What it does

`crewkit` scans your codebase and generates a complete, calibrated context engineering setup:

- **Agents** (5) — explorer, architect, coder, tester, reviewer with defined roles and model tiers
- **Skills** (4) — full-workflow, hotfix, explore-and-plan, review-pr
- **Hooks** (4) — session-start, protect-sensitive-files, post-compact-recovery, stop-quality-gate
- **Rules** — per-stack coding rules generated from detected patterns
- **Memory** (`.ai/memory/`) — architecture, conventions, commands, testing, lessons
- **CLAUDE.md** — project-specific hard rules derived from actual code patterns
- **settings.json** — conservative permissions + hook registrations
- **.mcp.json** — MCP servers detected from your infrastructure (PostgreSQL, Redis, Sentry, etc.)

Everything is tailored to your actual code — not generic boilerplate.

## Install

```bash
npx crewkit install
```

This copies the skill to `~/.claude/skills/crewkit-setup/` (one-time setup).

## Usage

Open any project in Claude Code and run:

```
/crewkit-setup
```

The AI scans your codebase (~8-15 min) and generates the full setup. No questions asked during scan — it detects everything from code, git history, and docs.

### What happens

1. **Pre-flight** — checks model, detects re-runs, offers backup
2. **Phase 0** — creates directory structure, updates .gitignore
3. **Phase 1-3** — detects stacks, reads docs, maps project structure
4. **Phase 4** — deep reads representative files, detects patterns with confidence scoring
5. **Phase 5** — health check (optional, with `--check-health`)
6. **Phase 6** — presents profile for your review before generating
7. **Phase 7** — generates all files in graceful-failure order

### Re-runs

If you run `/crewkit-setup` again on a project that already has a setup:

- **[R] Regenerate** — backup existing, regenerate everything
- **[M] Memory only** — re-scan and update memory + CLAUDE.md, preserve agents/hooks/skills
- **[C] Cancel**

## Supported stacks

Detected automatically from manifest files:

| Stack | Detected by |
|-------|------------|
| .NET | `*.csproj`, `*.sln` |
| Node.js | `package.json` (Express, Next.js, Nest, etc.) |
| Python | `pyproject.toml`, `requirements.txt` |
| Go | `go.mod` |
| Rust | `Cargo.toml` |
| Java/Kotlin | `pom.xml`, `build.gradle` |
| Ruby | `Gemfile` |
| Elixir | `mix.exs` |
| PHP | `composer.json` |
| Dart/Flutter | `pubspec.yaml` |

## Generated agents

| Agent | Model | Role |
|-------|-------|------|
| explorer | Sonnet | Read-only codebase exploration |
| architect | Opus | Architecture review + approval gate |
| coder | Sonnet | Minimal diffs, existing patterns |
| tester | Sonnet | Full test workflow + coverage accountability |
| reviewer | Opus | High signal code review, no noise |

## What gets committed vs ignored

**Committed** (shared with team):
- `CLAUDE.md`, `.claude/agents/`, `.claude/rules/`, `.claude/skills/`, `.claude/hooks/`
- `.claude/settings.json`, `.ai/memory/`

**Ignored** (personal/metadata):
- `.claude/settings.local.json`, `.crewkit/`, `.crewkit-backup/`

## Requirements

- Node.js >= 20
- Claude Code (v0.1 — Copilot and Cursor support planned for v0.2)
- Opus or Sonnet recommended (Haiku works but produces shallower scans)

## License

MIT
