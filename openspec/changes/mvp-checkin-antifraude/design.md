# Design

## Context

Projeto novo (pasta vazia além de OpenSpec e skills). Restrições que moldam o desenho:
- **Prazo:** sexta, 30/10/2026. Uma pessoa programando com o Claude, e 3 pessoas testando.
- **Deploy obrigatório na Cloudflare**, sem servidor próprio e sem custo.
- **Demo no Tribunal do Júri (UNIFEB):** o Wi-Fi é incerto, então tudo precisa funcionar em dados móveis. O jurado usa o próprio celular.
- Os requisitos estão em `specs/` (`user-auth`, `events`, `attendance-checkin`, `certificates`). A motivação está em `proposal.md`.

## Goals / Non-Goals

**Goals:**
- Um único deploy que sirva front e API na mesma origem (HTTPS), para não lidar com CORS nem com cookies entre domínios.
- Regras anti-fraude (código do QR, distância, conclusão por modo) em código puro e testável, separado de React, Hono e Cloudflare.
- Demo à prova de imprevisto: funciona com o relógio do notebook errado, sem Wi-Fi e com um jurado que nunca usou o sistema.

**Non-Goals:**
- Tempo real com WebSocket ou Durable Objects (polling resolve).
- Leitor de QR dentro do app: a câmera nativa do celular abre o link do QR.
- Detecção avançada de GPS falso ou de fingerprint de navegador.
- Recuperação de senha por e-mail.

## Decisions

### D1. Um Worker serve front e API (Workers Static Assets)
O React compilado (Vite) é servido como asset estático pelo mesmo Worker que responde `/api/*` com Hono.
- **Por quê:** mesma origem, então o cookie de sessão é `HttpOnly; Secure; SameSite=Lax` sem configuração extra. Um único `wrangler deploy` e uma única URL `*.workers.dev`.
- **Alternativa:** Pages (front) + Workers (API) em domínios separados, como previa o CLAUDE.md. Foi descartada porque exige CORS e cookies cross-site, que dão problema no Safari do iPhone, e um jurado com iPhone é provável.

### D2. Monorepo com npm workspaces
```
apps/web        React + Vite + TS + Tailwind + React Router
apps/api        Hono no Worker (serve /api e os assets de apps/web/dist)
packages/core   regras puras: código do QR, distância, conclusão por modo,
                normalização da palavra-chave (sem dependências de runtime)
```
- **Por quê:** `packages/core` é testado com Vitest sem banco nem rede, e é ali que mora a lógica que a banca vai questionar.
- **Alternativa:** um pacote só. Mais simples, mas mistura as regras com o framework e dificulta os testes.

### D3. QR dinâmico calculado no servidor (estilo TOTP)
```
janela = floor(agora_servidor / 10s)
codigo = base32( HMAC-SHA256(segredo_do_evento, eventoId | fase | janela) )[0..8]
QR     = https://<app>/c/<eventoId>/<fase>/<codigo>
```
- O Telão chama `GET /api/events/:id/qr` a cada 2s. A resposta traz o código atual e quantos ms faltam para a troca, e o Telão anima o contador com isso.
- **Na validação**, o servidor aceita a janela atual. Aceita também a anterior se ainda estiver a até 5s da troca (tolerância da spec).
- **Por quê:** o segredo nunca sai do servidor, e o relógio errado do notebook não importa. Nada precisa ser guardado por código gerado.
- **Alternativa:** gerar o código no navegador do Telão. Exporia o segredo e dependeria do relógio do notebook.

### D4. Fluxo de check-in em dois passos (scan → ticket → check-in)
```
celular lê QR --> abre /c/:evento/:fase/:codigo
     |
     v
POST /api/scan {evento, fase, codigo}        (não exige login)
     |  valida código + fase aberta
     |  ok -> cria ticket (id aleatório, expira em 3 min, uso único)
     |  erro -> registra tentativa, tela "QR expirado"
     v
ticket guardado no sessionStorage
     |
     +-- sem sessão? -> login -> volta
     v
pede GPS (enableHighAccuracy, timeout 8s)
     v
POST /api/checkin {ticket, lat?, lng?, precisao?, deviceToken}
     |  trava aparelho -> trava local -> registra etapa
     |  conclui presença conforme modo -> emite certificado
     v
tela de resultado: confirmada | aguardando conferência | recusada
```
- **Por quê:** a validação do código acontece no instante da leitura, então a foto de 10 segundos atrás falha ao vivo na demo, e o aluno honesto ainda tem tempo de fazer login.

### D5. Trava de local: IP **ou** GPS, e falha vira "suspeita"
- **IP:** `CF-Connecting-IP` comparado com uma lista de IPs/CIDRs autorizados. A lista é global, configurável pelo admin, e o evento pode sobrescrever.
- **GPS:** distância de Haversine. Passa se `distância - min(precisão, 100) <= raio`. Precisão acima de 150m, GPS negado ou timeout viram suspeita.
- **Por quê:** o GPS erra dentro de prédio, e recusar um aluno honesto na demo seria pior do que marcar suspeita para conferência.

### D6. Token de aparelho
- Na primeira visita, o front gera um UUID e grava no `localStorage`. A API também grava esse UUID num cookie de longa duração. O servidor usa o que existir.
- Restrição no banco: `UNIQUE(evento_id, device_token)` em `attendance`. Uma segunda conta no mesmo aparelho recebe recusa com motivo `device_reused`.
- **Limitação aceita:** aba anônima ou limpar os dados do navegador gera um token novo. As outras travas (QR curto e local) continuam valendo, e a tentativa fica registrada.

### D7. Autenticação
- **Senha:** PBKDF2-SHA256 via WebCrypto, com salt por usuário. bcrypt e argon2 não existem nativamente no Workers.
- **Sessão:** tabela `sessions` no D1, com token aleatório em cookie `HttpOnly`. Expira em 7 dias.
- **Limite de tentativas:** tabela `login_attempts`, com 5 erros em 15 min por RA.
- **Papéis** checados num middleware Hono. O coordenador sempre é filtrado por `course_id`.

### D8. Contador ao vivo por polling
O Telão consulta a contagem junto com o QR (a mesma chamada a cada 2s), o que cumpre o limite de 5s da spec sem infraestrutura extra.

### D9. Impressão e certificado em HTML com CSS de impressão
A lista de presença e o certificado são rotas do React com `@media print` (A4), e o usuário usa "Imprimir / Salvar como PDF" do navegador. Não há biblioteca de PDF.

### D10. Modelo de dados (D1 / SQLite)
```
courses(id, name)
users(id, role[student|coordinator|admin], ra UNIQUE, name, course_id?,
      password_hash, password_salt, active, created_at)
sessions(token PK, user_id, expires_at)
login_attempts(ra, attempted_at, success)
events(id, course_id, coordinator_id, title, description, location,
       starts_at, ends_at, hours, lat, lng, radius_m DEFAULT 100,
       checkin_mode[entry|exit|entry_exit|entry_keyword],
       keyword_hash?, qr_secret, entry_open, exit_open, allowed_ips?)
registrations(event_id, user_id, created_at, PK(event_id,user_id))
scan_tickets(id PK, event_id, phase, expires_at, used_at?)
attendance(id, event_id, user_id, device_token,
           entry_at?, exit_at?, keyword_ok?, keyword_tries,
           status[incomplete|suspect|completed|rejected], suspect_reason?,
           origin[qr|manual], UNIQUE(event_id,user_id),
           UNIQUE(event_id,device_token))
checkin_attempts(id, event_id, user_id?, device_token?, ip, result,
                 reason, created_at)
certificates(id, attendance_id UNIQUE, user_id, event_id, hours,
             verification_code UNIQUE, issued_at)
settings(key PK, value)          -- ex.: allowed_ips global
```
- A presença manual é gravada com `device_token = 'manual:<id>'` para não violar o UNIQUE.
- A palavra-chave é guardada como hash do texto normalizado (minúsculo, sem acento).

### D11. Seed de demonstração
Um script SQL/TS cria: o admin master (para o dono do projeto), 1 curso (ex.: Engenharia de Computação), 1 coordenador, cerca de 10 alunos "jurado1..10" com senhas simples impressas num cartão para a banca, e 1 evento de demo já configurado.

## Risks / Trade-offs

- **[GPS ruim dentro do Tribunal do Júri]** → Fica como suspeita, não como recusa. No dia, definir o local do evento com "usar minha localização" de dentro do auditório. Testar na quinta, se possível.
- **[Wi-Fi do local não funciona]** → O notebook do Telão usa o roteador do celular (4G). O IP do Wi-Fi é opcional, e o GPS cobre.
- **[Limite de CPU do Workers grátis (10ms) com PBKDF2]** → As iterações ficam configuráveis. Medir no primeiro deploy e reduzir se estourar, ou ativar o plano pago de US$ 5 só na semana da demo.
- **[Celular do jurado não abre o link do QR]** → As câmeras de iPhone e Android abrem URL nativamente. Ter um link curto exibido sob o QR como plano B.
- **[Aba anônima burla a trava de aparelho]** → Limitação explicada no pitch como "camadas". Registrar a tentativa já mostra auditoria.
- **[GPS falsificado pelas DevTools]** → Não tratado no MVP. Resposta honesta para a banca: o código de 10s, o aparelho único e a conferência do coordenador continuam valendo.
- **[Prazo curto]** → As tarefas estão ordenadas para que o fluxo da demo (Telão → scan → check-in → certificado) funcione em produção primeiro. Admin e telas de apoio vêm depois.

## Migration Plan

1. `wrangler d1 create` + migrações SQL versionadas em `apps/api/migrations/`.
2. Seed de demo aplicado em produção.
3. `wrangler deploy`, com a URL `*.workers.dev` (HTTPS automático, exigido pela Geolocation API).
4. Rollback: `wrangler rollback` para a versão anterior. O banco só recebe migrações aditivas.

## Open Questions

- IP público do Wi-Fi do local: será cadastrado nas configurações quando for verificado. Não muda código.
- Nome final (ValidaAI ou SyncFEB): só afeta textos e a URL.
