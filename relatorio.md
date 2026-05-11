# Relatório de Tarefas — 2026-04-06


## Tarefa: Reescrita completa do adapter GitHub Copilot

**Status:** Concluída

**Motivação:** O adapter antigo estava desatualizado em relação às specs oficiais do GitHub Copilot (abril 2026). Pesquisa na documentação oficial revelou 12+ diferenças significativas.

### Problemas corrigidos

| Problema | Antes | Depois |
|----------|-------|--------|
| `copilot-instructions.md` tinha frontmatter | Gerava com frontmatter | **Sem frontmatter** — plain Markdown |
| Agent `model:` era removido | Stripped do frontmatter | **Convertido** para nomes Copilot (`"Claude Sonnet 4"`) |
| Tool aliases antigos | `read_file`, `create_file`, `run_in_terminal` | Aliases canônicos: `read`, `edit`, `search`, `execute` |
| Prompt `mode:` incorreto | `mode: "agent"` | `agent: "agent"` (campo correto) |
| Prompt `name:` no frontmatter | Presente | Removido (nome vem do filename) |
| Skills só como prompts (lossy) | Conversão lossy | **Skills nativas** em `.github/skills/` + prompts como fallback |
| Hooks sem equivalente | Ignorados | Absorvidos em `copilot-instructions.md` (session start, quality gate, safety rules) |
| Permissões sem equivalente | Ignoradas | Mapeadas para `tools:` no frontmatter dos agents |
| `.mcp.json` sem equivalente | Ignorado | `mcp-servers:` no frontmatter dos agents (coder, tester) |
| `napkin.md` sem equivalente | Ignorado | Referenciado em `copilot-instructions.md` |
| `QUICKSTART.md` sem equivalente | Ignorado | Absorvido em `copilot-instructions.md` (seção Workflow) |
| Sensitive files sem proteção | Ignorado | `.github/instructions/sensitive-files.instructions.md` |
| `excludeAgent:` não documentado | Ausente | Documentado como campo opcional |
| Agent `agents:` (subagents) | Ausente | Documentado para coder/tester |
| Agent body limit | Não documentado | Max 30,000 chars documentado |

### Nova estrutura gerada para Copilot

```
.github/
├── copilot-instructions.md                  # Sem frontmatter. Inclui: hard rules, session start,
│                                            # quality gate, safety rules, memory refs, workflow, output format
├── instructions/
│   ├── {stack}.instructions.md              # applyTo: glob, rules por stack
│   └── sensitive-files.instructions.md      # Guardrail: bloqueia .env, credentials, secrets, *.key
├── agents/
│   ├── explorer.agent.md                    # tools: [read, search], model: "Claude Sonnet 4"
│   ├── architect.agent.md                   # tools: [read, search], model: "Claude Opus 4"
│   ├── coder.agent.md                       # tools: [read, edit, search, execute], mcp-servers: {...}
│   ├── tester.agent.md                      # tools: [read, edit, search, execute], mcp-servers: {...}
│   └── reviewer.agent.md                    # tools: [read, search], model: "Claude Opus 4"
├── skills/                                  # Skills NATIVAS (não lossy)
│   ├── full-workflow/SKILL.md
│   ├── hotfix/SKILL.md
│   ├── explore-and-plan/SKILL.md
│   └── review-pr/SKILL.md
└── prompts/                                 # Fallback lossy (IDE only)
    ├── full-workflow.prompt.md
    ├── hotfix.prompt.md
    ├── explore-and-plan.prompt.md
    └── review-pr.prompt.md
```

### Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `skill/adapters/copilot.md` | Reescrita completa — 5 steps (C1-C5) + checklist atualizado |
| `skill/copilot-agent.md` | Reescrito — 6 steps com nova estrutura (agents, skills, prompts, instructions, guardrails) |
| `skill/SKILL.md` | Phase 0 dirs + Final Report + Completion Checklist atualizados |
| `README.md` | Descrição do Copilot atualizada (PT-BR + EN) |
| `docs/PLAN.md` | Tabela de equivalências IDE reescrita com 12 linhas (antes 7) |
