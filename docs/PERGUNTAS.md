# SyncFEB / ValidaAI — Perguntas e decisões

Lista viva: vai sendo atualizada conforme a gente responde. Cada pergunta tem uma **sugestão** que vale como padrão se ninguém decidir diferente.

Legenda: `[ ]` aberta · `[x]` respondida

## Decisões já tomadas
- **Prazo:** pronto até **sexta, 30/10/2026**, dia da apresentação.
- **Local da apresentação:** Tribunal do Júri (UNIFEB). O Wi-Fi pode não funcionar lá, então a demo precisa rodar nos dados móveis (4G).
- **Foco do produto e do pitch:** Parte 2 (check-in anti-fraude). É a parte que precisa estar perfeita.
- **Pitch:** 3 minutos no total.
- **Parte 3 (IA de certificados):** fora da demo, para não gerar custo. Entra como "próximos passos" no pitch.
- **Parte 1 (hub de eventos):** versão simples (lista + inscrição + horas do evento).
- **Login do aluno:** pelo **RA** (domínio de e-mail não é necessário).
- **Modo de check-in escolhido pelo coordenador, por evento:**
  - só QR de entrada
  - só QR de saída (ex.: um QR só no final)
  - QR de entrada + QR de saída
  - QR de entrada + palavra-chave no final
- **Trava falhou por localização (GPS/rede):** marca como **suspeito**; quem gerencia o evento pode confirmar ou recusar a presença manualmente.
- **Aluno sem celular:** o coordenador **gera e imprime uma lista de presença** do evento, os alunos assinam, e depois ele **lança as presenças manualmente** no sistema.
- **Contas de demonstração:** aluno(s), coordenador e um **admin master** para o dono do projeto.

## Escopo e apresentação
- [x] **P1.** Quem programa é o dono do projeto + Claude. Outras 3 pessoas ajudam nos testes (com outras IAs).
- [x] **P2.** Local: Tribunal do Júri. Wi-Fi incerto, a demo usa os dados móveis como garantia.
- [ ] **P3.** Nome final: ValidaAI ou SyncFEB?
  _Sugestão: sem a IA na demo, **SyncFEB** combina mais._

## Check-in anti-fraude
- [ ] **P4.** Qual é o IP público do Wi-Fi do Tribunal do Júri / UNIFEB? (vai ser verificado no local)
  _Como cadastrar: entrar como `admin` conectado ao Wi-Fi do local → Administração → Rede da faculdade → "Autorizar este IP". Se não houver Wi-Fi, vale só o GPS._
- [x] **P5.** Trava de local: passa se estiver no IP do Wi-Fi **ou** dentro do raio GPS. Nos dados móveis, vale o GPS.
- [x] **P6.** Saída: o coordenador escolhe por evento (ver modos acima).
- [ ] **P7.** Tolerância do QR: aceitar só o código atual (10s) ou também o anterior (até ~20s)?
  _Sugestão: código atual + 5s de folga, para compensar o atraso da câmera e da rede._
- [x] **P8.** QR expirado e aparelho repetido = bloqueia. Fora do raio = suspeito, com confirmação manual.
- [ ] **P9.** Existe tempo mínimo de permanência entre a entrada e a saída?
  _Sugestão: não. Basta entrada válida + saída válida._

## Usuários e login
- [x] **P10.** Login com **RA + senha**.
- [x] **P11.** Contas de demonstração já criadas (aluno, coordenador, admin master).
- [ ] **P12.** Quais dados do aluno guardar: nome, RA, curso, semestre?
  _Sugestão: nome, RA, curso._
- [ ] **P13.** Quem cria e gerencia eventos: só o coordenador, ou também professores/organizadores (SESINFO, Atlética Cerberus)?
  _Sugestão para a demo: só o coordenador. Papel "organizador" fica para depois._
- [ ] **P14.** O coordenador vê só os alunos e eventos do próprio curso?
  _Sugestão: sim._

## Certificado
- [ ] **P15.** O certificado gerado precisa de quê: PDF para baixar, código de verificação, QR de autenticidade?
  _Sugestão: página do certificado com código de verificação público (PDF é opcional)._

## Para depois (Parte 3, fora da demo)
- [ ] **P16.** Regulamento de horas complementares do UNIFEB: categorias e limite de horas por categoria.
- [ ] **P17.** Se a IA voltar ao escopo: usar a opção gratuita (Cloudflare Workers AI) ou a paga (Claude API)?
