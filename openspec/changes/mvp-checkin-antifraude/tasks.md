# Tasks

> Ordem pensada para o prazo: até o fim do grupo 5, o fluxo da demo (Telão → leitura → check-in → certificado) já roda em produção. O resto vem depois.

## 1. Estrutura e deploy vazio (tracer bullet)

- [x] 1.1 Criar monorepo com npm workspaces (`apps/web`, `apps/api`, `packages/core`), TypeScript strict e Vitest; verificar que `npm install` e `npm test` rodam sem erro
- [x] 1.2 Criar `apps/web` com Vite + React + Tailwind + React Router e uma página "Olá"; verificar com `npm run build -w apps/web`
- [x] 1.3 Criar `apps/api` com Hono no Worker servindo `/api/health` e os assets de `apps/web/dist` (D1 do design); verificar com `wrangler dev` que `/` mostra a página e `/api/health` responde `ok`
- [x] 1.4 Criar o banco D1 e a primeira migração com todas as tabelas do design (D10); verificar com `wrangler d1 migrations apply --local` e um `SELECT` nas tabelas
- [x] 1.5 Fazer o primeiro deploy (o usuário roda `wrangler login` uma vez); verificar que a URL `*.workers.dev` abre no celular via HTTPS

## 2. Regras puras em `packages/core`

- [x] 2.1 Implementar o código do QR (HMAC por janela de 10s, tolerância de 5s); verificar com testes: código atual aceito, anterior aceito até 5s após a troca, recusado depois disso, código de outro evento/fase recusado
- [x] 2.2 Implementar a distância Haversine e a regra de local (IP autorizado/CIDR **ou** distância − precisão ≤ raio; precisão > 150m vira suspeita); verificar com testes de dentro, fora, sem GPS e IP autorizado
- [x] 2.3 Implementar a conclusão por modo (entry, exit, entry_exit, entry_keyword) e a normalização da palavra-chave (sem caixa e sem acento); verificar com testes de cada modo e de "faltou a saída"

## 3. Autenticação e papéis

- [x] 3.1 Implementar hash PBKDF2 (WebCrypto) e sessões com cookie HttpOnly no D1; verificar com teste de hash e verificação de senha
- [x] 3.2 Criar `POST /api/auth/login`, `logout`, `me` e o cadastro de aluno (RA único), com mensagem genérica de erro e bloqueio após 5 erros em 15 min; verificar com testes de API (login ok, senha errada, RA duplicado, bloqueio)
- [x] 3.3 Criar o middleware de papel e o filtro por curso do coordenador; verificar com teste de aluno acessando rota de coordenador (403) e de coordenador acessando evento de outro curso (403)
- [x] 3.4 Criar o seed de demonstração (admin master, curso, coordenador, alunos jurado1..10, evento de demo); verificar que cada conta faz login localmente
- [x] 3.5 Criar no front as telas de login e cadastro e o redirecionamento por papel, com volta ao destino original após o login; verificar no navegador com as contas de demo

## 4. Eventos (coordenador e mural)

- [x] 4.1 Criar a API de eventos do coordenador: criar, editar, listar e escolher o modo (com palavra-chave obrigatória no modo entry_keyword e bloqueio de troca de modo depois de haver presenças); verificar com testes de API, incluindo os de dados inválidos
- [x] 4.2 Criar a tela de criação/edição de evento, com "usar minha localização" e raio padrão de 100m; verificar criando um evento no celular
- [x] 4.3 Criar a API e a tela do mural do aluno (futuros e em andamento, horas em destaque) e a inscrição com um clique em "Meus eventos"; verificar inscrevendo duas vezes e conferindo que fica uma só

## 5. Check-in anti-fraude (centro da demo)

- [x] 5.1 Criar `GET /api/events/:id/qr` (código atual, ms até a troca e contagem da fase) e as ações de abrir/encerrar fase; verificar que só o coordenador do evento acessa
- [x] 5.2 Criar a tela Telão em tela cheia (QR grande, fase, contador regressivo, presenças ao vivo e link curto embaixo); verificar que o QR troca a cada 10s e o contador sobe após um check-in
- [x] 5.3 Criar `POST /api/scan` (valida código e fase, emite ticket de 3 min de uso único, registra tentativa); verificar com testes de código válido, expirado, adulterado e fase fechada
- [x] 5.4 Criar `POST /api/checkin` (ticket + token do aparelho + GPS/IP → etapa registrada, status, inscrição automática, certificado ao concluir); verificar com testes de: segunda conta no mesmo aparelho (recusa), fora do raio (suspeita), modo entry_exit só com entrada (incompleta)
- [ ] 5.5 Criar a rota `/c/:evento/:fase/:codigo` no front: scan → login se preciso → GPS sem mapa → resultado grande ("Presença confirmada" / "Aguardando conferência" / motivo da recusa); verificar lendo o QR do Telão com um celular real
- [x] 5.6 Criar o envio da palavra-chave pelo aluno, com no máximo 3 tentativas (depois disso, suspeita); verificar com teste de API e na tela
- [x] 5.7 Fazer deploy e ensaiar a demo completa em produção: jurado lê e confirma; foto do QR, 15s de espera, leitura recusada como expirada; segunda conta no mesmo celular recusada

## 6. Ferramentas do coordenador

- [x] 6.1 Criar a lista de presenças suspeitas com motivo e os botões confirmar/recusar (confirmar conclui e emite certificado); verificar confirmando uma suspeita e vendo o certificado aparecer para o aluno
- [x] 6.2 Criar a lista de presença imprimível em A4 (inscritos + linhas em branco, colunas nome/RA/assinatura); verificar com "Imprimir" do navegador
- [x] 6.3 Criar o lançamento manual de presença por RA (origem "manual", gera certificado); verificar lançando um aluno de demo
- [x] 6.4 Criar o histórico de tentativas do evento (aceitas e recusadas, com motivo); verificar que as tentativas do ensaio 5.7 aparecem

## 7. Certificados e painel do aluno

- [x] 7.1 Criar a página do certificado (nome, RA, evento, data, local, horas, emissão, código) com CSS de impressão; verificar salvando em PDF pelo navegador
- [x] 7.2 Criar a verificação pública `/verificar/:codigo` sem login (válido / não encontrado, sem dados extras); verificar com um código real e um inventado
- [x] 7.3 Criar o painel do aluno com o total de horas e a lista de certificados, sem duplicar certificado por evento; verificar que um evento de 4h soma corretamente

## 8. Admin

- [x] 8.1 Criar a API e as telas do admin: cadastrar curso; cadastrar, editar e desativar coordenador; configurar IPs autorizados; verificar que o coordenador desativado não entra mais e que o recém-criado vê só o seu curso

## 9. Integração e ensaio final

- [ ] 9.1 Rodar o checklist de testes manuais com as 3 pessoas testadoras em celulares diferentes (Android e iPhone, Wi-Fi e 4G), cobrindo os cenários das specs; verificar que nenhum bloqueador ficou aberto
- [ ] 9.2 Ensaiar o pitch de 3 minutos em produção, no local se possível (definir o local do evento de dentro do Tribunal do Júri e testar GPS e IP); verificar o tempo e o roteiro da demo
- [x] 9.3 Escrever o `README.md` (como rodar, como fazer deploy, contas de demo) e atualizar `docs/PERGUNTAS.md`; verificar seguindo o README do zero

## Workflow follow-up

- Arquivar a mudança com `/opsx:archive` depois da apresentação.
