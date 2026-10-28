# HAKATON — Regras do projeto

Este arquivo é lido pelo Claude em toda sessão. Ele define **como** vamos trabalhar; a ideia do produto entra depois.

## Idioma
- Conversa, specs do OpenSpec e documentação em **português (pt-BR)**.
- Código (variáveis, funções, commits) em **inglês**.

## Stack
- **Frontend web:** React + TypeScript + Vite.
- **Mobile (se necessário):** primeiro como **PWA** (mesmo código React, responsivo). Só partir para React Native/Expo se a ideia exigir recurso nativo (câmera em background, push nativo, loja de apps).
- **Backend:** Node.js + TypeScript. Preferir **Hono** como framework HTTP, pois roda igual em Node local e no Cloudflare Workers.
- **Deploy final:** **Cloudflare**
  - Um único Worker (`apps/api`) serve a API em `/api/*` e o React compilado (Workers Static Assets), na mesma origem
  - Dados → D1 (SQL); KV e R2 só se precisar
  - Ferramenta: `wrangler`; produção em https://campusfeb.roqueemanuel2018.workers.dev (Worker e D1 `campusfeb`, separados do projeto 1)
- Desde o início, evitar dependências que não rodam no Workers (ex.: `fs`, processos longos, drivers nativos). Se algo não for compatível, avisar antes de usar.

## Fluxo de trabalho (OpenSpec)
Toda funcionalidade nova passa pelo OpenSpec:
1. `/opsx:explore`: entender a ideia ou o problema quando ainda estiver vago.
2. `/opsx:propose "ideia"`: gera proposta, design e tarefas em `openspec/changes/`.
3. Revisar a proposta comigo **antes** de escrever código.
4. `/opsx:apply`: implementar as tarefas.
5. `/opsx:archive`: arquivar quando a mudança estiver pronta, para atualizar `openspec/specs/`.

Correções pequenas (typo, ajuste de estilo, bug óbvio) não precisam de proposta.

## Skills e quando usar cada uma
Ficam em `.claude/skills/` (as de terceiros vêm de github.com/wondelai/skills, licença MIT).

| Momento | Skill | Para quê |
|---|---|---|
| Ideia nova | `create-app` | Roteiro da ideia até a 1ª versão. **Modo hackathon:** rodar leve, com foco nas fases 1 (MVP), 3 (arquitetura) e 5 (código limpo) e pulando entrevistas longas |
| Ideia nova | `lean-startup` | Definir o MVP mínimo e o que cortar |
| Arquitetura | `clean-architecture` | Separar regras de negócio de React/Hono/Cloudflare (facilita trocar ou testar) |
| Arquitetura | `system-design` | Dimensionar só o necessário (sem over-engineering) |
| Banco de dados | `ddia-systems` | Escolher entre D1/KV/R2 e modelar os dados |
| Código | `clean-code` | Nomes, funções pequenas, tratamento de erro |
| Código | `pragmatic-programmer` | DRY, *tracer bullets* (fatia ponta a ponta funcionando cedo) |
| Código | `software-design-philosophy` | Módulos profundos e interfaces simples |
| Código | `refactoring-patterns` | Ao limpar código que cresceu rápido |
| Interface | `refactoring-ui` | Hierarquia visual, espaçamento, cores, Tailwind |
| Interface | `web-typography` | Fontes, tamanhos, legibilidade |
| Interface | `microinteractions` | Loading, feedback de botão, estados vazios e de erro |
| Usabilidade | `ux-heuristics` | Revisar fluxos e formulários (Nielsen) |
| Usabilidade | `design-everyday-things` | Tornar a interface óbvia de usar |
| Performance | `high-perf-browser` | Core Web Vitals, cache e CDN (combina com a Cloudflare) |
| Produção | `release-it` | Timeouts, retries, health check e logs antes do deploy |

Quando aparecer uma necessidade que nenhuma skill cobre (ex.: iOS nativo → `ios-hig-design`, landing page de conversão → `cro-methodology`), sugerir adicionar a skill correspondente do wondelai/skills.

## Regras de código
- TypeScript em modo `strict`; sem `any` sem justificativa.
- Organização: `apps/web` (React), `apps/api` (Hono/Node), `packages/shared` (tipos e regras de negócio comuns), se fizer sentido usar monorepo.
- Regras de negócio não importam React, Hono nem APIs da Cloudflare.
- Validar entrada da API (ex.: Zod) e retornar erros claros.
- Segredos só em `.env` / `wrangler secret`, **nunca** no código nem em commit.
- Testes para as regras de negócio principais (Vitest).
- Interface responsiva desde o início (mobile first) e acessível (contraste, labels, navegação por teclado).

## Prioridades (hackathon)
1. Algo funcionando de ponta a ponta o quanto antes.
2. Demo bonita e clara.
3. Código limpo o bastante para evoluir.
4. Deploy na Cloudflare funcionando antes da apresentação, sem deixar para o último minuto.
