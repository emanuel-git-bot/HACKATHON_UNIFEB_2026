# SyncFEB

Presença anti-fraude em eventos e certificados de horas complementares para o UNIFEB.

**Produção:** https://syncfeb.roqueemanuel2018.workers.dev

## Como funciona a demo

1. O coordenador abre **Gerenciar evento → Abrir Telão** no notebook e clica em **Abrir entrada** (passe o mouse no topo da tela).
2. O jurado aponta a **câmera do celular** para o QR. O link abre, ele entra com uma conta de demo e a presença é confirmada.
3. **Fraude ao vivo:** tire uma foto do QR, espere uns 15 segundos e leia a foto. Aparece **"QR Code expirado"**.
4. **Aparelho único:** no mesmo celular, saia, entre com outro jurado e leia o QR atual. Aparece **"Aparelho já utilizado"**.
5. Na aba **Tentativas bloqueadas** o coordenador vê cada fraude registrada.

> **Antes da apresentação:** abra **Editar evento** de dentro do Tribunal do Júri e clique em **Usar minha localização atual**. Sem isso, toda presença fica "suspeita". Se houver Wi-Fi, o admin pode autorizar o IP em **Administração → Rede da faculdade → Autorizar este IP**.

## Contas de demonstração

| Papel | Login | Senha |
|---|---|---|
| Admin master | `admin` | `admin@sfb2026` |
| Coordenador (Eng. de Computação) | `coord.ec` | `coord@2026` |
| Coordenador (Sistemas de Informação) | `coord.si` | `coord@2026` |
| Jurados | `jurado1` … `jurado10` | `123456` |
| Alunos de exemplo | `210345`, `210812`, `220117` | `123456` |

Eventos de demo: "Segurança da Informação na Prática" (entrada + palavra-chave **cerberus**), "Minicurso de React do Zero" (entrada + saída) e "Torneio Interatléticas" (só entrada).

**Troque as senhas de demo depois do hackathon.** Elas estão neste arquivo e em `apps/api/scripts/seed.ts`.

## As travas anti-fraude

| Trava | Como funciona |
|---|---|
| QR dinâmico | Código HMAC que muda a cada 10 s; aceito por até 15 s. Foto/print antigo → "expirado". |
| Ticket de leitura | O código é validado no instante da leitura; o aluno tem 3 min para entrar na conta. |
| Local | IP da rede da faculdade **ou** GPS dentro do raio (padrão 100 m). Falhou → "suspeita", o coordenador decide. |
| Aparelho único | Token do aparelho (cookie + localStorage): um celular só registra uma conta por evento. |
| Entrada + saída | O coordenador escolhe: só entrada, só saída, entrada + saída, ou entrada + palavra-chave (3 tentativas). |
| Plano B | Lista imprimível para quem não tem celular e lançamento manual por RA. |

## Estrutura

```
apps/web        React + Vite + Tailwind (PWA, mobile first)
apps/api        Hono no Cloudflare Workers + D1 (serve também o React compilado)
packages/core   regras puras e testadas: QR, distância, status da presença, senhas
openspec/       proposta, specs, design e tarefas (OpenSpec)
```

## Rodar localmente

Requer Node 22.13+.

```bash
npm install
```

```bash
npm run db:migrate:local
```

```bash
npm run db:seed:local
```

```bash
npm run build
```

```bash
npm run dev -w apps/api
```

Abra http://localhost:8787. Para editar o front com recarga automática, rode também `npm run dev -w apps/web` e use http://localhost:5173 (a API é repassada para a porta 8787).

> GPS no navegador exige HTTPS: para testar a trava de distância pelo celular, use a URL de produção.

## Testes

```bash
npm test
```

São 86 testes: as regras do `packages/core` e a API inteira contra um SQLite em memória (login, papéis, QR expirado, aparelho repetido, suspeitas, palavra-chave, lançamento manual, certificados e admin).

## Deploy (Cloudflare)

```bash
npm run deploy
```

Para migrar e recriar os dados de demo em produção (o seed **apaga** todos os dados):

```bash
npm run db:migrate:remote -w apps/api
```

```bash
npm run db:seed:remote -w apps/api
```
