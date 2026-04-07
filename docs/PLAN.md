# Plan: crewkit — Framework de Context Engineering Multi-IDE
**Date:** 2026-03-28
**Status:** DRAFT
**Size:** LARGE

## Problema

O setup de context engineering do Relivox (agents, skills, hooks, rules, memory) foi construido manualmente ao longo de semanas. Queremos empacotar isso como um produto instalavel que qualquer dev roda em qualquer projeto e sai com o setup completo — calibrado pro codigo real, nao generico.

**Publico-alvo:** Times de desenvolvimento (2+ devs) que usam AI assistants (Claude Code, Copilot) em projetos com codigo existente. O crewkit padroniza o context engineering pra que todo dev do time trabalhe com o mesmo setup de AI.

## Principio arquitetural

**A skill FAZ TUDO. O npm so distribui.**

`npx crewkit install` copia a skill pra `~/.claude/skills/` (uma vez na vida). Depois, em qualquer projeto, o usuario roda `/crewkit-setup` e a skill — usando o AI — scaffolda, scanneia, e calibra tudo. Zero TypeScript inteligente, zero AST parsers, zero heuristicas. O AI le o codigo e entende.

## Decisoes confirmadas

1. **Distribuicao via npm** — `npx crewkit install` (uma vez, copia skill pra global)
2. **Um comando por projeto** — `/crewkit-setup` faz tudo (scaffolding + scan + calibracao)
3. **Zero perguntas** (projeto existente) — AI detecta tudo do codigo + git
4. **Multi-IDE** — Claude Code (v0.1), GitHub Copilot (v0.2)
5. **`.ai/memory/` universal** — funciona em qualquer IDE
6. **Skills como plugins** — core instalado automaticamente, opcionais sob demanda
7. **Sem config.yaml** — commands em `.ai/memory/commands.md`, model tiers no frontmatter dos agents
8. **Health check opt-in** — flag `--check-health`, nao default
9. **Backup antes de sobrescrever** — setup existente salvo em `.crewkit-backup/`
10. **Scan persistido** — resultado salvo em `.crewkit/last-scan.md` pra debug e audit
11. **Version tracking** — `.crewkit/version` com versao do crewkit que gerou os arquivos
12. **Gerenciar .gitignore** — skill adiciona entradas pra arquivos que nao devem ser commitados
13. **Permissoes conservadoras** — settings.json so permite read, edit, git e build/test detectados
14. **Model tiers sao Claude Code only** — adapter Copilot ignora frontmatter `model:` (v0.2)
15. **Licenca MIT** — open source, sem restricoes de uso

---

## Como funciona

### Instalacao (uma vez na vida)

```bash
npx crewkit install
# → Copia skill + templates pra ~/.claude/skills/crewkit-setup/
# → "Pronto. Rode /crewkit-setup em qualquer projeto."
```

### Uso (em cada projeto)

```
/crewkit-setup (AI skill, ~8-15min, faz TUDO)
│
├── Pre-flight
│   ├── Verificar modelo: Opus/Sonnet recomendado. Haiku = warn de profundidade limitada.
│   ├── Detectar re-run (.crewkit/version existe?):
│   │   - Primeiro run → prosseguir normalmente
│   │   - Re-run → perguntar:
│   │     [R] Regenerar tudo (backup em .crewkit-backup/)
│   │     [M] So atualizar memory (re-scan, preserva agents/hooks/skills)
│   │     [C] Cancelar
│   └── Se primeiro run ou [R]: backup setup existente → .crewkit-backup/
│
├── Passo 0 — Preparacao
│   ├── Cria estrutura de pastas (.claude/, .ai/memory/)
│   ├── Cria .crewkit/version
│   └── Atualiza .gitignore
│
├── Fase 1 — Reconhecimento (~30s)
│   ├── Detecta stacks (glob por manifests: package.json, *.csproj, go.mod, etc.)
│   ├── Git: contributors, hotspots, commit style, idioma
│   ├── CI: GitHub Actions, GitLab CI, Jenkinsfile
│   ├── DB: docker-compose, connection strings, ORM configs
│   └── Output: ReconProfile
│
├── Fase 2 — Documentacao humana (~1min)
│   ├── README.md, CONTRIBUTING.md, docs/
│   ├── Setup existente anterior (se backup existe)
│   ├── Idioma predominante (PT-BR, EN, ES)
│   └── Output: DocsProfile
│
├── Fase 3 — Mapa estrutural (~2min)
│   ├── Folder tree (depth 3, ignorando noise)
│   ├── Entry points por stack detectada
│   ├── Modulos e dependencias entre eles
│   ├── Test setup: framework, pasta, naming
│   ├── Migrations: quantidade, ultima data
│   └── Output: StructureProfile
│
├── Fase 4 — Leitura profunda (~5-15min, agents paralelos por modulo)
│   ├── Seleciona representativos por modulo:
│   │   1. Mais modificado nos ultimos 30d (git)
│   │   2. Mais imports/dependencias (hub)
│   │   3. Com teste correspondente
│   │   4. Entry point do modulo
│   │   5. Maior arquivo (se nao coberto)
│   ├── Le cada arquivo COMPLETO
│   ├── Detecta patterns com nivel de confianca:
│   │   - ALTA (5+ arquivos): gera regra HARD
│   │   - MEDIA (2-3 arquivos): gera regra com nota
│   │   - BAIXA (1 arquivo): observacao, nao gera regra
│   ├── Patterns: DDD, multi-tenant, CQRS, auth, error handling,
│   │   idempotency, real-time, background processing, caching
│   ├── Anti-patterns: arquivos >500 linhas, secrets hardcoded,
│   │   SQL injection, 0 testes por modulo
│   └── Output: DeepProfile
│
├── Fase 5 — Health assessment (OPCIONAL, so com --check-health)
│   ├── Roda build
│   ├── Roda testes (conta pass/fail)
│   └── Output: HealthProfile
│
├── Fase 6 — Project Profile (apresenta ao usuario)
│   ├── Resumo: stacks, arquitetura, modulos, testes, team, idioma
│   ├── Patterns detectados com nivel de confianca
│   ├── Anti-patterns encontrados
│   ├── Health (se rodou)
│   ├── Salva profile em .crewkit/last-scan.md
│   ├── Pergunta: "Tudo certo? Enter pra gerar, ou corrija algo."
│   └── Se usuario pedir ajustes (ex: "remove regra X", "adiciona Y") → aplicar antes de gerar
│
└── Fase 7 — Geracao (ordem de escrita pra falha graceful)
    │
    │  Se modo [M] (memory-only): escreve so 1-2 e para.
    │
    ├── 1. .ai/memory/ (AI-gerado do scan)
    │   ├── architecture.md
    │   ├── conventions.md
    │   ├── commands.md
    │   ├── lessons.md (index vazio)
    │   └── state.md (minimal)
    │
    ├── 2. CLAUDE.md (AI-gerado do scan — regras hard, so confianca alta)
    │
    ├── 3. .claude/agents/ (templates lidos de ~/.claude/skills/crewkit-setup/templates/ + calibrados)
    │
    ├── 4. .claude/rules/ (AI-gerado — 1 por stack, com patterns confirmados)
    │
    ├── 5. .claude/settings.json + napkin.md (templates com substituicao de variaveis)
    │
    ├── 6. .claude/hooks/ (templates lidos + build/test commands corretos)
    │
    └── 7. .claude/skills/ (templates lidos — full-workflow, hotfix, explore-and-plan, review-pr)

    Se falhar no passo 4, usuario ja tem memory + CLAUDE.md + agents = ~70% do valor.
```

---

## Estrutura do npm package

```
crewkit/
├── package.json
├── bin/crewkit.js                    # CLI entry point
├── src/
│   ├── cli.js                        # arg parser (install, update, add, help)
│   ├── install.js                    # copia skill + templates pra ~/.claude/skills/
│   ├── update.js                     # compara versao + re-instala se diferente
│   └── add.js                        # instala skill opcional do catalogo
├── skill/                            # o que vai pra ~/.claude/skills/crewkit-setup/
│   ├── SKILL.md                      # /crewkit-setup (o coracao — ~1086 linhas)
│   ├── adapters/                     # adapters Multi-IDE (v0.2)
│   │   └── copilot.md               # gera arquivos GitHub Copilot (agents, skills, prompts, instructions, guardrails)
│   └── templates/                    # templates que a skill copia pro projeto
│       ├── agents/
│       │   ├── explorer.md
│       │   ├── architect.md
│       │   ├── coder.md
│       │   ├── tester.md
│       │   └── reviewer.md
│       ├── hooks/
│       │   ├── session-start.sh
│       │   ├── protect-sensitive-files.sh
│       │   ├── post-compact-recovery.sh
│       │   └── stop-quality-gate.sh
│       └── skills/
│           ├── full-workflow/SKILL.md    # core
│           ├── hotfix/SKILL.md           # core
│           ├── explore-and-plan/SKILL.md # core
│           ├── review-pr/SKILL.md        # core (com fallback GitLab/git)
│           ├── retro/SKILL.md            # opcional (v0.2)
│           ├── dev-metrics/SKILL.md      # opcional (v0.2)
│           ├── security-scan/SKILL.md    # opcional (v0.2)
│           └── impact/SKILL.md           # opcional (v0.2)
└── README.md
```

Apos `npx crewkit install`, o conteudo de `skill/` vai pra `~/.claude/skills/crewkit-setup/`. A skill fica disponivel globalmente como `/crewkit-setup` em qualquer projeto.

---

## .gitignore gerenciado pela skill

A skill (Passo 0) adiciona ao `.gitignore` do projeto (se nao existir, cria):

```gitignore
# crewkit — context engineering
.claude/settings.local.json
.crewkit/
.crewkit-backup/
```

**O que DEVE ser commitado** (regras do projeto, compartilhadas com o time):
- `CLAUDE.md`, `.claude/agents/`, `.claude/rules/`, `.claude/skills/`, `.claude/hooks/`
- `.claude/settings.json` (permissoes compartilhadas)
- `.ai/memory/` (conhecimento versionado)

**O que NAO deve ser commitado** (pessoal ou metadata):
- `.claude/settings.local.json` (permissoes pessoais)
- `.crewkit/` (version, last-scan — metadata local)
- `.crewkit-backup/` (backup do setup anterior)

---

## Permissoes default (settings.json)

Conservador — so o minimo necessario. Inclui hooks pra que os .sh sejam executados:

```json
{
  "permissions": {
    "allow": [
      "Read(*)",
      "Edit(*)",
      "Bash(git *)",
      "Bash({{build_cmd}})",
      "Bash({{test_cmd}})"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(sudo *)"
    ]
  },
  "hooks": {
    "SessionStart": [
      { "hooks": [{ "type": "command", "command": "bash .claude/hooks/session-start.sh" }] }
    ],
    "PreToolUse": [
      { "matcher": "Edit|Write", "hooks": [{ "type": "command", "command": "bash .claude/hooks/protect-sensitive-files.sh" }] }
    ],
    "PostCompact": [
      { "hooks": [{ "type": "command", "command": "bash .claude/hooks/post-compact-recovery.sh" }] }
    ],
    "Stop": [
      { "hooks": [{ "type": "command", "command": "bash .claude/hooks/stop-quality-gate.sh" }] }
    ]
  }
}
```

**CRITICO:** Sem a secao `hooks`, os arquivos .sh existem no disco mas nunca sao executados.

`{{build_cmd}}` e `{{test_cmd}}` sao substituidos pela skill (Fase 7) com os commands detectados no scan (ex: `dotnet build`, `npm test`, `go build ./...`).

O usuario expande conforme precisar via `settings.local.json`.

---

## Mapa de equivalencias IDE

| Conceito | Claude Code | GitHub Copilot |
|----------|-------------|----------------|
| Regras globais | `CLAUDE.md` | `.github/copilot-instructions.md` (sem frontmatter) |
| Regras por path | `.claude/rules/*.md` (`globs:`) | `.github/instructions/*.instructions.md` (`applyTo:`) |
| Agents | `.claude/agents/*.md` | `.github/agents/*.agent.md` (com `tools:`, `mcp-servers:`) |
| Skills | `.claude/skills/*/SKILL.md` | `.github/skills/*/SKILL.md` (nativo!) |
| Prompts (fallback) | N/A | `.github/prompts/*.prompt.md` (lossy, IDE only) |
| Hooks | `.claude/hooks/*.sh` + `settings.json` | Absorvidos em `copilot-instructions.md` + `instructions/sensitive-files.instructions.md` |
| Permissoes | `settings.json` (allow/deny) | `tools:` no frontmatter dos agents |
| MCP servers | `.mcp.json` | `mcp-servers:` no frontmatter dos agents |
| Memory | `.ai/memory/` | `.ai/memory/` (compartilhado) |
| Model tiers | frontmatter `model: sonnet` | frontmatter `model: "Claude Sonnet 4"` (convertido) |
| Napkin | `.claude/napkin.md` | Referenciado em `copilot-instructions.md` |
| Onboarding | `.claude/QUICKSTART.md` | Absorvido em `copilot-instructions.md` |

**Nota:** Copilot coding agent le nativamente `CLAUDE.md`, `AGENTS.md`, e `.ai/memory/`. A camada compartilhada e maior do que parece — o adapter converte formato, nao conteudo.

---

## Comandos

Terminal (npm):
| Comando | O que faz | Versao |
|---------|-----------|--------|
| `npx crewkit install` | Instala skill globalmente em ~/.claude/skills/ (uma vez) | v0.1 |
| `npx crewkit update` | Atualiza skill + templates pra versao mais recente | v0.2 |
| `npx crewkit add <skill>` | Instala skill opcional do catalogo | v0.2 |

Dentro da IDE:
| Comando | O que faz | Versao |
|---------|-----------|--------|
| `/crewkit-setup` | Faz TUDO: scaffolding + scan + calibracao (por projeto) | v0.1 |

---

## Catalogo de Skills

**Core (instalados pelo /crewkit-setup):**
- full-workflow — orquestracao completa: classify → explore → architect → code → test → review → fix loop
- hotfix — workflow comprimido pra fixes urgentes
- explore-and-plan — mapear + plano com aprovacao do usuario
- review-pr — review de PR via agent reviewer

**Opcionais (via `crewkit add`):**
- retro — post-mortem de task/plan
- dev-metrics — metricas de desenvolvimento do git
- security-scan — scan de vulnerabilidades conhecidas
- health-check — health check de producao (requer config de infra)
- impact — analise de blast radius
- playwright-cli — automacao de browser

---

## Deteccao e recomendacao de MCPs

A skill (Fase 1) detecta servicos de infra e recomenda MCPs na Fase 6. Na Fase 7, gera `.mcp.json` com os MCPs detectados.

### MCPs detectaveis automaticamente:

| MCP | Detectado por | O que faz |
|-----|--------------|-----------|
| PostgreSQL | docker-compose `postgres`, connection string, EF Core/Prisma | Query no banco, inspecionar schema |
| MySQL | docker-compose `mysql`, connection string, Sequelize | Query no banco |
| MongoDB | docker-compose `mongo`, `mongoose` em deps | Clusters, queries |
| Redis | docker-compose `redis`, `ioredis`/`redis` em deps | Inspecionar cache |
| Supabase | `supabase/` folder, deps | SQL, auth, edge functions |
| Sentry | `@sentry/*` em deps, DSN em config | Erros, root cause analysis |
| Grafana | docker-compose `grafana`, Grafana Cloud config | Logs Loki, metricas Prometheus |
| Vercel | `vercel.json`, `.vercel/` | Debug deploys, build logs |
| Linear | `.linear/`, integracoes em CI | Issues, projetos |
| Atlassian | refs a Jira/Confluence em docs/commits | Issues, documentacao |
| Slack | webhooks em config | Notificacoes, conversas |

### MCP recomendado SEMPRE (qualquer projeto):

| MCP | Por que |
|-----|---------|
| **Context7** | Docs atualizadas de 9000+ libs. Previne hallucination de APIs. Zero config, gratuito. |

### Output gerado (Fase 7):

`.mcp.json` com MCPs detectados (tokens vazios pra user preencher):
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "{{connection_string}}"]
    }
  }
}
```

`settings.json` inclui `enabledMcpjsonServers` com os MCPs gerados.

---

## Estrategia de templates (hibrida)

A tarefa mais critica da v0.1. Nem tudo deve ser template, nem tudo deve ser AI-gerado.

### Estrategia por tipo de arquivo:

| Arquivo | Estrategia | Por que |
|---------|-----------|---------|
| agents (5) | **Template** lido do disco + calibrado | Logica refinada (roles, return formats) que levou semanas pra acertar |
| hooks (4) | **Template** lido do disco + variaveis substituidas | Estrutura fixa, so troca build/test commands |
| skills (4 core) | **Template** lido do disco | Orquestracao refinada (fix loops, exit gates, severity levels) |
| CLAUDE.md | **AI-gerado** do scan | 100% project-specific, template seria generico |
| rules (por stack) | **AI-gerado** do scan | Depende dos patterns detectados |
| memory/ | **AI-gerado** do scan | Factual do codigo, impossivel templatear |
| settings.json | **Template** com substituicao | Estrutura fixa, so troca commands |
| napkin.md | **Template** minimo | So estrutura vazia |

### Templates: o que MANTER (logica universal):
- Estrutura de orquestracao (classify → route → fix loop)
- Roles dos agents (explorer read-only, coder minimal diff, reviewer high signal)
- Severity levels (CRITICAL, IMPORTANT, MINOR)
- Fix loop mechanics (max iterations, exit gate, consolidation matrix)
- Return formats estruturados
- Anti-patterns universais (nao refatorar fora do escopo, nao criar abstractions pra 1 uso)
- Test safety loop (implement → test → fix → review → report)
- Architect decision gate (opcoes → usuario decide → plano)

### Templates: o que REMOVER (Relivox-specific):
- Nomes de arquivos/entidades do Relivox (SessionRegistry, Inbox.razor, etc.)
- Comandos hardcoded (dotnet build Relivox/Relivox.sln)
- Known issues (SEC-1, BUG-1, etc.)
- Handler constructor orders
- Stack adapters com commands fixos (.NET vs Gateway)
- Referencia a docs/ do Relivox
- Regras de negocio (TenantId do JWT, gateway zero logic)

### Templates: o que PARAMETRIZAR:
- `{{build_cmd}}`, `{{test_cmd}}` → substituidos pela skill com commands detectados
- Instrucoes de "ler .ai/memory/" pra contexto dinamico:

```markdown
## MANDATORY: Read Before Coding
1. `.ai/memory/conventions.md` — naming, anti-patterns
2. `.ai/memory/architecture.md` — layers, patterns, dependencies
```

### Path dos templates:

Templates ficam em `~/.claude/skills/crewkit-setup/templates/`. A skill usa `~/` pra path e confia na expansao do shell. Se falhar num OS especifico, resolver pontualmente.

---

## Fases de implementacao

### v0.1 — MVP funcional (foco: Claude Code)

**Objetivo:** `npx crewkit install` + `/crewkit-setup` funcionando em Claude Code. Testado em 3+ projetos.

**Tarefas:**

npm package (CLI minimo — so copia arquivos):
- [x] Criar repo `crewkit` no GitHub (github.com/guilhermefsousa/crewkit)
- [x] Setup npm package (package.json, bin entry) — JS nao TS
- [x] CLI `install`: copia skill/ pra ~/.claude/skills/crewkit-setup/
- [ ] CLI `update`: re-copia do npm registry (v0.2)

Skill /crewkit-setup (o coracao — 1050 linhas):
- [x] SKILL.md com pre-flight + Phase 0 + 7 fases + 9 steps de geracao + completion checklist
- [x] Pre-flight: check modelo (warn Haiku, no question), re-run [R]/[M]/[C]
- [x] Phase 0: backup, criar pastas, .crewkit/version, .gitignore
- [x] Fase 1-3 inline (recon, docs com AI context de outras IDEs, structure)
- [x] Fase 4 via agents paralelos + 6 targeted extractions (DI sigs, fakes, design system, state machines, large files, raw SQL)
- [x] Fase 6 apresentacao do profile com Domain section + salva em .crewkit/last-scan.md
- [x] Fase 7 geracao em ordem de falha graceful (memory → CLAUDE.md → agents → rules → settings → hooks → skills → QUICKSTART.md → .mcp.json)
- [x] Modo [M] (memory-only): escreve memory + CLAUDE.md + atualiza agent context headers
- [x] Deteccao de 12 MCPs (11 detectaveis + Context7 always)
- [x] Scan persistence: 4 phase files em .crewkit/ sobrevivem /compact
- [x] Context headers nos agents (crewkit:context-start/end)
- [x] Permissoes dinamicas: 4 layers (universal + stack + infra + MCP)
- [x] QUICKSTART.md gerado como onboarding guide
- [x] Business domain no profile e no CLAUDE.md
- [x] Targeted extractions → rules (SQL injection, state machines, large files)
- [x] Completion checklist com 17 items (content + validation + integrity + IDE adapters)
- [x] Language rule: todos os arquivos em ingles, output pro usuario no idioma dele
- [x] Zero questions (exceto re-run [R]/[M]/[C])

Templates (arquivos no disco, lidos pela skill na Fase 7):
- [x] 5 agents universais — stack-agnostic, referenciam .ai/memory/
- [x] 4 hooks universais (com {{project_dir}}, {{hard_rules}}, {{build_gate}}) — POSIX-compatible (sed, nao grep -P)
- [x] 4 core skills (full-workflow, hotfix, explore-and-plan, review-pr) — stack-agnostic
- [x] settings.json template inline no SKILL.md (4 layers dinamicas)
- [x] napkin.md template inline no SKILL.md
- [x] QUICKSTART.md template inline no SKILL.md

Auditorias cruzadas (2026-03-28 a 2026-03-29):
- [x] 3 CRITICAL fixados (phantom placeholders, grep -oP macOS)
- [x] 12 IMPORTANT fixados (memory refs, return formats, classification correction, stack config)
- [x] 8 MINOR fixados (prioritization rules, full suite field, deep exploration items)
- [x] Placeholder audit: 100% limpo — zero mismatches, zero orphans, zero phantoms
- [x] .ai/memory/ cross-ref: todos os 7 arquivos gerados consumidos por templates
- [x] Agent-skill consistency: nomes, models, severity, modes — MATCH
- [x] SKILL.md vs plano: 7/7 fases, 15/15 decisoes, 12/12 MCPs, 13/13 riscos
- [x] Deteccao→output audit: todos os 6 targeted extractions tem saida em memory + rules
- [x] Zero contradicoes, zero redundancias no documento final

Publicacao:
- [x] README.md
- [x] Push pro GitHub (branch main, 1 commit)
- [x] Publicado no npm: crewkit@0.1.0 (2026-03-29)
- [x] `npx crewkit install` testado do registry — funciona

Validacao (4 testes executados):
- [x] Relivox v1 (.NET + Node.js + Blazor) — score 6.0/10
- [x] Relivox v2 (apos fixes) — score 7.5/10
- [x] Relivox v3 (apos improvements) — score 7.5/10 (3/7 improvements nao executados pelo AI)
- [x] Relivox v4 (final) — score 8.2/10 (targeted extractions, context headers, persistence)
- [x] FastAPI (Python puro, open source) — score 10/10 (stack-agnostic validado)
- [ ] Testar num repo open source Node.js (Express/Next.js) — v0.2
- [ ] Testar num repo open source Go — v0.2

Limitacoes conhecidas v0.1:
- review-pr: GitHub-only (usa `gh` CLI) — v0.2 tera fallback GitLab/Bitbucket
- SKILL.md tem 1050 linhas — risco de AI pular checklist final. Monitorar, splittar se instavel
- Conhecimento institucional (bugs conhecidos, production ops) nao e capturavel por scan — gap esperado e documentado

### v0.2 — Multi-IDE + extras

**Objetivo:** Suporte a Copilot. Mais skills. Update command.

**Tarefas:**

Adapters:
- [x] Adapter GitHub Copilot — `skill/adapters/copilot.md` (239 linhas, gera copilot-instructions.md, agents, prompts, instructions)
- [x] Skill detecta IDE (Phase 1) e roteia geracao (Phase 7 Step 10)
- [x] Adapters ignoram frontmatter `model:` (Claude Code only)
- [x] Decisao arquitetural: Option B (adapters em arquivos separados, nao inline no SKILL.md)

CLI extras:
- [x] `crewkit update` — compara versao instalada vs npm, mostra transicao vOLD → vNEW (`src/update.js`)
- [x] `crewkit add <skill>` — copia skill opcional do catalogo global pro projeto (`src/add.js`)
- [ ] ~~Catalogo de skills (skills.yaml com metadata)~~ — DESCARTADO: filesystem presence suficiente pra 4-5 skills

Skills adicionais:
- [x] retro (post-mortem) — `skill/templates/skills/retro/SKILL.md`
- [x] dev-metrics (metricas de git) — `skill/templates/skills/dev-metrics/SKILL.md`
- [x] security-scan — `skill/templates/skills/security-scan/SKILL.md`
- [x] impact (blast radius) — `skill/templates/skills/impact/SKILL.md`
- [ ] ~~health-check~~ — diferido pra v0.3 (requer config de infra)
- [ ] ~~playwright-cli~~ — diferido pra v0.3 (requer browser runtime)

Melhorias:
- [x] review-pr fallback GitLab (`glab`) + pure git diff
- [x] README bilíngue (PT-BR + EN)
- [x] `.version` marker em ~/.claude/skills/crewkit-setup/
- [x] SKILL.md checklist atualizado 15 → 17 items (IDE adapter checks)
- [x] package.json version bump 0.1.0 → 0.2.0

Validacao:
- [x] CLI testada (install, update, add — todos os cenarios)
- [x] Regression test Relivox (worktree isolado — 12/17 checks, 5 bloqueados por hook do Relivox, nao do crewkit)
- [ ] Testar geracao Copilot num projeto real com VS Code + Copilot
- [ ] Testar em repo open source Node.js (Express/Next.js)
- [ ] Testar em repo open source Go
- [ ] Publicar v0.2.0 no npm

### v0.3 — Polish + observabilidade

**Objetivo:** Ferramentas de manutencao do setup.

**Tarefas:**

- [ ] `crewkit audit` — analisa setup existente (redundancias, gaps, stale content, compara com last-scan)
- [ ] `crewkit doctor` — verifica saude (arquivos existem, commands funcionam, version ok)
- [ ] `crewkit scan` — re-scan sem sobrescrever customizacoes manuais (diff com last-scan)
- [ ] Health check opt-in no /crewkit-setup (flag --check-health)
- [ ] Publicar v0.3.0 no npm

---

## Riscos

| Risco | Mitigacao |
|-------|-----------|
| Skill gera regra errada | Conservador: so gera com confianca alta. Media/baixa = observacao |
| Contexto estoura no deep scan (fase 4) | Agents paralelos por modulo, cada um retorna resumo estruturado |
| Projeto sem git | Pula analise de git. Scan funciona mas perde hotspots/team info |
| Setup existente sobrescrito | Backup automatico em .crewkit-backup/ + opcao [M] pra memory-only |
| Re-run perde customizacoes manuais | Detecta re-run, oferece [R] regenerar / [M] so memory / [C] cancelar |
| Templates desatualizados | `crewkit update` baixa do npm. Versao em .crewkit/version |
| Skill funciona mal em IDE X | v0.1 so Claude Code. Adapters testados individualmente na v0.2 |
| Projeto muito grande (monorepo 10+ stacks) | Fase 4 limita a 5 modulos mais relevantes (por hotspot). Resto como observacao |
| Scan raso com modelo fraco (Haiku) | Pre-flight avisa que Opus/Sonnet recomendado |
| Skill falha no meio da geracao | Ordem de escrita garante falha graceful: memory → CLAUDE.md → agents primeiro |
| Path dos templates entre OS (Win/Mac/Linux) | Usa ~/.claude/skills/ com expansao de shell. Resolver pontualmente se falhar |
| Permissoes muito restritas bloqueiam usuario | settings.json conservador + settings.local.json pra expansao pessoal |
| Projeto sem codigo (docs, IaC, repo vazio) | Fallback graceful: gera setup basico com TODOs, nao falha |
| SKILL.md muito complexa pra AI seguir (~500 linhas) | Testar fase por fase durante desenvolvimento, nao tudo junto. Se instavel, splittar em sub-skills |
| Validacao enviesada (so projetos proprios) | Testar em repos open source de stacks diferentes |

---

## Proximos passos

1. Criar repo `crewkit` no GitHub
2. Generalizar templates do Relivox (agents, hooks, skills) — tarefa mais critica
3. Construir SKILL.md do /crewkit-setup (pre-flight + 7 fases + geracao graceful)
4. Construir CLI minimo (`npx crewkit install` — copia skill pra global)
5. Testar no Relivox (sanity check)
6. Testar em 2-3 repos open source de stacks diferentes
7. Publicar v0.1.0 no npm
