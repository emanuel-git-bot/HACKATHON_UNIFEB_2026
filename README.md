# Campus FEB

O campus do UNIFEB na palma da mão. Projeto do Hackathon XXIII SESINFO, desafio **Campus Inteligente & Vida Universitária**.

**Produção:** https://campusfeb.roqueemanuel2018.workers.dev

## O que o aluno encontra

| Tema do desafio | No Campus FEB |
|---|---|
| Localização de serviços | **Mapa** de satélite do campus: busca de sala, bloco ou serviço; "Onde estou"; "Como chegar" a pé. Também abre sem login. |
| Calouros | **Guia do Calouro**: checklist da primeira semana, dúvidas frequentes, telefones, siglas e links oficiais |
| Eventos | **Palestras** com check-in por QR Code dinâmico (as horas complementares somam na hora) e **jogos da Atlética** com "confirmar presença" e link pronto para os grupos de WhatsApp |
| Grupos de estudo | **Grupos**: criar ou entrar em um grupo, com local no campus ou link online e limite de vagas |
| Compartilhamento de recursos | **Materiais**: resumos, apostilas, links e livros para emprestar |
| Comunicação acadêmica | **Avisos** com os banners do site do UNIFEB, comunicados da coordenação e **vagas de estágio e emprego** (empresa, prazo, link para se candidatar) |
| Acessibilidade | Banheiros acessíveis, rampas e vagas PcD no mapa; letras maiores e alto contraste; relato de problemas |

A coordenação publica avisos e vagas e gerencia as palestras e o Telão do QR. A **Atlética** tem conta própria para criar jogos e festas (sem horas complementares), mandar o link no WhatsApp e ver a lista de quem confirmou. O admin cuida de cursos, coordenadores, contas da Atlética, do **editor do mapa** e dos **relatos de acessibilidade**. Os banners do site do UNIFEB são copiados sozinhos a cada 6 horas (o admin também pode forçar em Avisos → "Atualizar do site").

## Contas de demonstração

| Papel | Login | Senha |
|---|---|---|
| Admin master | `admin` | `admin@sfb2026` |
| Coordenador (Eng. de Computação) | `coord.ec` | `coord@2026` |
| Coordenador (Sistemas de Informação) | `coord.si` | `coord@2026` |
| Atlética Cerberus | `atletica` | `atletica@2026` |
| Jurados | `jurado1` … `jurado10` | `123456` |
| Alunos de exemplo | `210345`, `210812`, `220117` | `123456` |

**Troque as senhas de demo depois do hackathon.** Elas estão neste arquivo e em `apps/api/scripts/seed.ts`.

> Os nomes de blocos e salas do mapa são **exemplos**. As posições vêm dos prédios do campus no OpenStreetMap. Corrija pelo **Admin → Mapa** depois de conferir no campus. Os telefones, o horário da biblioteca e os setores (Pró-Aluno, NAPE, NEU, DTI...) vêm do site oficial do UNIFEB.

## Estrutura

```
apps/web        React + Vite + Tailwind + Leaflet (PWA, mobile first)
apps/api        Hono no Cloudflare Workers + D1 (serve também o React compilado)
packages/core   regras puras e testadas: QR, distância, presença, senhas, grupos, busca
openspec/       propostas, specs e tarefas (OpenSpec)
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

Abra http://localhost:8788. Para editar o front com recarga automática, rode também `npm run dev -w apps/web` e use http://localhost:5173 (a API é repassada para a porta 8788).

## Testes

```bash
npm test
```

São 117 testes: as regras do `packages/core` e a API inteira contra um SQLite em memória (login, check-in e suas travas, mapa, grupos, avisos e vagas, materiais, Atlética, banners e relatos de acessibilidade).

## Deploy (Cloudflare)

Worker `campusfeb` com banco D1 `campusfeb`, separados do SyncFEB do projeto 1.

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
