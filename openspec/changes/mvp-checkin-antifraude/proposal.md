# Proposal

## Why

No UNIFEB, a presença em eventos (SESINFO, palestras, Atlética Cerberus) é registrada em papel ou formulário comum: gera fila, permite fraude ("assina por mim" ou link mandado no WhatsApp) e obriga a secretaria a conferir certificados manualmente. A apresentação do hackathon é na sexta, 30/10/2026, com 3 minutos de pitch. O centro da demo é um check-in anti-fraude ao vivo, então este MVP precisa entregar isso funcionando de ponta a ponta, em produção na Cloudflare.

## What Changes

- Login com **RA + senha** e três papéis: **aluno**, **coordenador** (por curso) e **admin**. O admin cadastra cursos e coordenadores.
- **Contas de demonstração** pré-criadas (alunos, coordenador, admin master).
- **Hub de eventos** simples: o coordenador cria eventos com data, local, horas complementares e modo de check-in. O aluno vê a lista e se inscreve com um clique.
- **Check-in anti-fraude** com travas em camadas:
  - **Tela "Telão"** com QR Code dinâmico que troca a cada 10 segundos.
  - **Ticket de escaneamento**: o código é validado no momento da leitura, e o aluno tem alguns minutos para fazer login e concluir.
  - **Trava de local**: IP da rede da faculdade **ou** GPS dentro do raio do evento. Fora disso, a presença fica como **suspeita** e o coordenador confirma ou recusa.
  - **Trava de aparelho único**: um aparelho só registra presença de uma conta por evento.
  - **Modo por evento**, escolhido pelo coordenador: só entrada, só saída, entrada + saída (dois QRs) ou entrada + palavra-chave.
- **Plano B para quem não tem celular**: lista de presença imprimível gerada pelo sistema e lançamento manual da presença pelo coordenador.
- **Certificado digital** emitido automaticamente quando a presença é concluída, com código de verificação público.
- Painel do aluno com o total de horas complementares obtidas nos eventos.
- **Fora do escopo** (aparece só como "próximos passos" no pitch): validador de certificados externos com IA, regulamento e categorias de horas, papel de organizador (SESINFO/Atlética), notificações, app nativo.

## Capabilities

### New Capabilities
- `user-auth`: autenticação por RA + senha, papéis (aluno, coordenador, admin), cadastro de cursos e coordenadores pelo admin e contas de demonstração.
- `events`: criação e listagem de eventos, inscrição do aluno, horas complementares do evento e configuração do modo de check-in.
- `attendance-checkin`: QR dinâmico do telão, ticket de escaneamento, travas de local e de aparelho, registro de entrada/saída/palavra-chave, presenças suspeitas com revisão, lista imprimível e lançamento manual.
- `certificates`: emissão automática do certificado ao concluir a presença, página pública de verificação e soma de horas do aluno.

### Modified Capabilities
<!-- Nenhuma: projeto novo, sem specs existentes. -->

## Impact

- Projeto novo (greenfield): `apps/web` (React + Vite + TypeScript, PWA responsivo) e `apps/api` (Hono + TypeScript no Cloudflare Workers).
- Infraestrutura Cloudflare: Pages (front), Workers (API), D1 (banco). R2 não é necessário neste MVP.
- Dependências novas: Hono, Zod, biblioteca de QR Code no front, leitor de QR (ou a câmera nativa abrindo um link) e Vitest.
- Navegador: uso de Geolocation API (exige HTTPS e permissão do aluno) e de `localStorage` para o token do aparelho.
- Sem custo de IA nesta versão.
