# crewkit

Framework de context engineering para desenvolvimento assistido por IA. Um comando para configurar agents, skills, hooks, rules e memory no seu projeto.

## O que faz

O `crewkit` escaneia sua codebase e gera um setup completo e calibrado de context engineering:

- **Agents** (5) — explorer, architect, coder, tester, reviewer com roles definidos e tiers de modelo
- **Skills** (4) — full-workflow, hotfix, explore-and-plan, review-pr
- **Hooks** (4) — session-start, protect-sensitive-files, post-compact-recovery, stop-quality-gate
- **Rules** — regras de codigo por stack geradas a partir de padroes detectados
- **Memory** (`.ai/memory/`) — architecture, conventions, commands, testing, lessons
- **CLAUDE.md** — hard rules do projeto derivadas de padroes reais do codigo
- **settings.json** — permissoes conservadoras + registro de hooks
- **.mcp.json** — MCP servers detectados da sua infraestrutura (PostgreSQL, Redis, Sentry, etc.)

Tudo calibrado pro seu codigo real — nao e boilerplate generico.

## Instalacao

```bash
npx crewkit install
```

Copia a skill para `~/.claude/skills/crewkit-setup/` (setup unico).

## Uso

Abra qualquer projeto no Claude Code e rode:

```
/crewkit-setup
```

A IA escaneia sua codebase (~8-15 min) e gera o setup completo. Zero perguntas durante o scan — detecta tudo a partir do codigo, historico git e docs.

### O que acontece

1. **Pre-flight** — verifica modelo, detecta re-runs, oferece backup
2. **Phase 0** — cria estrutura de diretorios, atualiza .gitignore
3. **Phase 1-3** — detecta stacks, le docs, mapeia estrutura do projeto
4. **Phase 4** — leitura profunda de arquivos representativos, detecta padroes com score de confianca
5. **Phase 5** — health check (opcional, com `--check-health`)
6. **Phase 6** — apresenta perfil pra sua revisao antes de gerar
7. **Phase 7** — gera todos os arquivos em ordem de falha graceful

### Re-runs

Se voce rodar `/crewkit-setup` de novo num projeto que ja tem setup:

- **[R] Regenerate** — backup do existente, regenera tudo
- **[M] Memory only** — re-scan e atualiza memory + CLAUDE.md, preserva agents/hooks/skills
- **[C] Cancel**

## Stacks suportadas

Detectadas automaticamente a partir de arquivos de manifesto:

| Stack | Detectado por |
|-------|--------------|
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

## Agents gerados

| Agent | Modelo | Funcao |
|-------|--------|--------|
| explorer | Sonnet | Exploracao read-only da codebase |
| architect | Opus | Review de arquitetura + gate de aprovacao |
| coder | Sonnet | Diffs minimos, padroes existentes |
| tester | Sonnet | Workflow completo de testes + accountability de cobertura |
| reviewer | Opus | Code review de alto sinal, sem ruido |

## Skills opcionais

Alem das 4 skills core (instaladas automaticamente), voce pode adicionar skills opcionais:

```bash
npx crewkit add retro          # post-mortem de tarefas
npx crewkit add dev-metrics    # metricas de desenvolvimento via git
npx crewkit add security-scan  # scan OWASP top 10
npx crewkit add impact         # analise de blast radius
```

## IDEs suportadas

- **Claude Code** — suporte completo (agents, skills, hooks, rules, memory)
- **GitHub Copilot** — auto-detectado, gera `copilot-instructions.md`, agents e prompts
- **Cursor** — auto-detectado, gera rules com globs e `AGENTS.md`

A IDE e detectada automaticamente durante o setup. `.ai/memory/` e compartilhado entre todas as IDEs.

## O que e commitado vs ignorado

**Commitado** (compartilhado com o time):
- `CLAUDE.md`, `.claude/agents/`, `.claude/rules/`, `.claude/skills/`, `.claude/hooks/`
- `.claude/settings.json`, `.ai/memory/`

**Ignorado** (pessoal/metadata):
- `.claude/settings.local.json`, `.crewkit/`, `.crewkit-backup/`

## Requisitos

- Node.js >= 20
- Claude Code, GitHub Copilot ou Cursor
- Opus ou Sonnet recomendado (Haiku funciona mas gera scans mais rasos)

## Licenca

MIT

---

# English

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

## Optional skills

In addition to the 4 core skills (auto-installed), you can add optional skills:

```bash
npx crewkit add retro          # task post-mortem
npx crewkit add dev-metrics    # development metrics from git
npx crewkit add security-scan  # OWASP top 10 scan
npx crewkit add impact         # blast radius analysis
```

## Supported IDEs

- **Claude Code** — full support (agents, skills, hooks, rules, memory)
- **GitHub Copilot** — auto-detected, generates `copilot-instructions.md`, agents and prompts
- **Cursor** — auto-detected, generates rules with globs and `AGENTS.md`

IDE is auto-detected during setup. `.ai/memory/` is shared across all IDEs.

## What gets committed vs ignored

**Committed** (shared with team):
- `CLAUDE.md`, `.claude/agents/`, `.claude/rules/`, `.claude/skills/`, `.claude/hooks/`
- `.claude/settings.json`, `.ai/memory/`

**Ignored** (personal/metadata):
- `.claude/settings.local.json`, `.crewkit/`, `.crewkit-backup/`

## Requirements

- Node.js >= 20
- Claude Code, GitHub Copilot, or Cursor
- Opus or Sonnet recommended (Haiku works but produces shallower scans)

## License

MIT
