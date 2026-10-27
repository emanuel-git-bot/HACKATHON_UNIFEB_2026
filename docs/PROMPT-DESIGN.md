# SyncFEB: briefing de interface (para Figma, v0.dev e Bolt)

> Como usar: copie a **seção 1 (Briefing completo)** inteira na ferramenta. Se a ferramenta se perder com texto longo, use os **prompts curtos da seção 2**, uma tela por vez.
> Peça sempre **React + TypeScript + Tailwind CSS**. Assim o código gerado pode ser aproveitado no projeto real.

---

## 1. Briefing completo (copiar daqui até a seção 2)

### Produto
**SyncFEB** (nome provisório; alternativa: ValidaAI) é uma plataforma web para o centro universitário **UNIFEB** que acaba com a lista de presença em papel nos eventos acadêmicos (palestras, minicursos da SESINFO, ações da Atlética Cerberus) e emite o **certificado de horas complementares automaticamente**.

O grande diferencial é o **check-in anti-fraude**. Um telão no auditório mostra um **QR Code que muda a cada 10 segundos**. O aluno lê com a câmera do celular e a presença é confirmada na hora. Foto do QR mandada no WhatsApp não funciona, porque quando o amigo abrir o código já expirou. O sistema também confere se o celular está perto do auditório (GPS, sem mostrar mapa) e impede que um mesmo celular registre presença de várias contas.

### Público e contexto de uso
- **Aluno**, quase sempre no **celular**, em pé no auditório, com pressa e às vezes com sinal ruim. Precisa de botões grandes e respostas óbvias.
- **Coordenador de curso**, no **notebook**. Cria eventos, projeta o Telão e confere as presenças.
- **Admin**, no **notebook**. Cadastra cursos e coordenadores.
- A interface é toda em **português do Brasil**.

### Estilo visual
- Moderno, limpo e confiável: "tecnologia acadêmica", não um "sistema de secretaria antigo".
- **Mobile first** para o aluno; desktop para coordenador e admin.
- Cor principal sugerida: azul institucional (ex.: `#1E40AF`), com um acento vibrante para ações (ex.: ciano ou verde-limão). Fique à vontade para propor outra paleta.
- **Cores de estado bem marcadas** (são parte da demo):
  - Verde = presença confirmada
  - Amarelo/âmbar = aguardando conferência (suspeita)
  - Vermelho = recusada/fraude bloqueada
- Tipografia sem serifa, legível (ex.: Inter, Plus Jakarta Sans). Números grandes para horas.
- Cantos arredondados, sombras suaves, ícones de linha (ex.: Lucide).
- Suporte a modo escuro é um bônus, não obrigatório.
- Acessível: contraste AA, alvos de toque ≥ 44px, não depender só de cor (sempre ícone + texto).

### Telas do ALUNO (celular)

1. **Login**: campos RA e senha, botão "Entrar" e link "Criar conta". Mensagem de erro genérica: "RA ou senha incorretos".
2. **Cadastro**: nome, RA, curso (lista) e senha.
3. **Mural de eventos (home)**:
   - Topo com saudação e um card de destaque "Suas horas: **14h**".
   - Lista de cards de evento: título, data/hora, local, selo com as horas ("+4h") e botão "Inscrever-se" (ou "Inscrito ✓").
   - Filtros simples: Todos / Palestras / Minicursos / Atlética.
4. **Detalhe do evento**: descrição, palestrante, local, horas e botão grande de inscrição.
5. **Meus eventos**: eventos inscritos, com status de cada um (Inscrito, Presença confirmada, Aguardando conferência, Incompleta).
6. **Fluxo de check-in** (abre quando a câmera nativa lê o QR do telão). É a tela mais importante:
   - 6a. "Validando QR Code..." (loading curto)
   - 6b. Se não estiver logado: login rápido com aviso "Você tem 3 minutos para concluir"
   - 6c. "Confirmando sua localização..." (sem mapa, só um ícone animado)
   - 6d. **Resultado**, em tela cheia, com ícone enorme:
     - ✅ **Presença confirmada!** "Palestra de Segurança da Informação, +4h. Seu certificado já está disponível." Botão "Ver certificado".
     - 🟡 **Presença registrada, aguardando conferência.** "Não conseguimos confirmar sua localização. O coordenador vai revisar."
     - ⛔ **QR Code expirado.** "Este código não é mais válido. Leia o QR que está no telão agora." (é a tela da demonstração de fraude e precisa ser impactante)
     - ⛔ **Aparelho já utilizado.** "Este celular já registrou presença de outra conta neste evento."
     - ⛔ **Check-in fechado.** "O coordenador ainda não abriu (ou já encerrou) esta etapa."
   - 6e. **Entrada registrada, falta a saída**: "Volte a ler o QR no final do evento" (quando o evento exige entrada e saída).
7. **Palavra-chave de saída**: campo grande "Digite a palavra dita pelo palestrante", botão "Confirmar" e aviso "3 tentativas restantes".
8. **Minhas horas**: número grande do total de horas, barra de progresso até a meta (ex.: 14 de 200h) e lista de certificados (evento, data, horas).
9. **Certificado**: layout tipo diploma, pronto para imprimir/PDF, com nome, RA, evento, data, local, horas, data de emissão, código de verificação (ex.: `SFB-7K2Q-9XMA`) e QR de verificação.
10. **Verificação pública** (sem login): "Certificado autêntico ✓" com os dados, ou "Certificado não encontrado".

### Telas do COORDENADOR (notebook)

11. **Painel de eventos**: tabela/cards dos eventos do seu curso com data, inscritos, presenças confirmadas, suspeitas pendentes (badge âmbar) e ações (Abrir Telão, Gerenciar, Editar). Botão "Novo evento".
12. **Criar/editar evento**:
    - Título, descrição, palestrante, data, início, fim, local e horas complementares.
    - **Localização**: botão "Usar minha localização atual" e campo de raio (padrão 100 m), sem mapa.
    - **Modo de check-in** (cards selecionáveis, com ícone e uma linha explicando cada um):
      - Só QR de entrada
      - Só QR de saída
      - QR de entrada + QR de saída
      - QR de entrada + palavra-chave no final (mostra um campo "Palavra-chave")
13. **TELÃO** (tela cheia, projetada no auditório; a peça mais vista da apresentação):
    - **QR Code enorme** no centro, legível do fundo da sala.
    - Fase em destaque: "ENTRADA" ou "SAÍDA".
    - **Anel ou barra de contagem regressiva de 10 segundos** em volta do QR, recomeçando a cada troca.
    - Contador ao vivo: "**37** presenças confirmadas", com animação quando sobe.
    - Nome do evento e um link curto embaixo (plano B).
    - Fundo escuro, alto contraste, sem nenhum outro elemento distraindo.
    - Controles discretos (aparecem no hover): Abrir/Encerrar entrada, Abrir/Encerrar saída, Sair do modo telão.
14. **Gerenciar evento** (abas):
    - **Presenças**: lista com nome, RA, entrada, saída, status e origem (QR/Manual).
    - **Suspeitas**: cada item com o motivo ("Fora do raio: 340 m", "GPS negado", "Errou a palavra-chave") e botões **Confirmar** (verde) e **Recusar** (vermelho).
    - **Tentativas bloqueadas**: log com horário, aluno, motivo (QR expirado, aparelho repetido, fase fechada). Mostra a segurança funcionando.
    - **Lançamento manual**: buscar aluno por RA e botão "Lançar presença" (para quem assinou a lista em papel).
    - Botão **"Imprimir lista de presença"**.
15. **Lista de presença para impressão (A4)**: cabeçalho com logo, evento, data e local; tabela com Nº, Nome, RA e Assinatura; inscritos já preenchidos e linhas em branco no final. Visual sóbrio, preto e branco.

### Telas do ADMIN (notebook)

16. **Cursos**: lista e botão "Novo curso".
17. **Coordenadores**: tabela com nome, login, curso, status (ativo/inativo) e ações Editar/Desativar; formulário de cadastro com senha inicial.
18. **Configurações de rede**: lista de IPs autorizados do Wi-Fi da faculdade (adicionar/remover), com explicação curta.

### Dados de exemplo (fictícios)
- Curso: Engenharia de Computação
- Coordenador: Prof. Ana Ribeiro
- Alunos: Lucas Martins (RA 210345), Beatriz Souza (RA 210812), Rafael Lima (RA 220117)
- Eventos:
  - "Segurança da Informação na Prática": SESINFO 2026, 28/10, 19h–21h, Tribunal do Júri, +4h, modo entrada + palavra-chave
  - "Minicurso de React do Zero": 29/10, 14h–18h, Lab 3, +4h, modo entrada + saída
  - "Torneio Interatléticas, Atlética Cerberus": 31/10, Ginásio, +2h, modo só entrada

### Regras importantes para o design
- **Nenhuma tela mostra mapa ou coordenadas** do aluno.
- O aluno **não tem botão de "ler QR" dentro do app**: ele usa a câmera nativa do celular, que abre o link. (Se quiser, mostre na home uma dica: "No evento, aponte a câmera para o telão".)
- As telas de resultado do check-in precisam ser entendidas **em 1 segundo**, de longe, por um jurado.

---

## 2. Prompts curtos (uma tela por vez)

Use quando a ferramenta ficar genérica com o briefing longo. Cole antes o parágrafo "Produto" da seção 1 para dar contexto.

**Telão (comece por esta)**
> Crie em React + Tailwind uma tela "Telão" em tela cheia, fundo escuro, para projetar num auditório. No centro, um QR Code enorme que é trocado a cada 10 segundos, com um anel de contagem regressiva animado em volta. Acima, a palavra "ENTRADA" em destaque e o nome do evento "Segurança da Informação na Prática". Abaixo, um contador ao vivo "37 presenças confirmadas" que anima ao aumentar, e um link curto. Controles discretos no canto que só aparecem no hover. Sem nenhum outro elemento. Português do Brasil.

**Resultados do check-in (celular)**
> Crie em React + Tailwind, mobile first, 4 variações de uma tela de resultado de check-in em tela cheia com ícone enorme: (1) verde "Presença confirmada! +4h", com botão "Ver certificado"; (2) âmbar "Presença registrada, aguardando conferência"; (3) vermelha impactante "QR Code expirado. Leia o QR que está no telão agora"; (4) vermelha "Este celular já registrou presença de outra conta neste evento". Entendível em 1 segundo, de longe. Português do Brasil.

**Mural do aluno (celular)**
> Crie em React + Tailwind, mobile first, a home de um app universitário de eventos: saudação, card de destaque "Suas horas: 14h de 200h" com barra de progresso, filtros (Todos, Palestras, Minicursos, Atlética) e cards de evento com título, data, local, selo "+4h" e botão "Inscrever-se". Navegação inferior: Eventos, Meus eventos, Horas, Perfil. Português do Brasil.

**Criar evento (coordenador, desktop)**
> Crie em React + Tailwind um formulário desktop de "Novo evento": título, descrição, palestrante, data, início, fim, local, horas complementares, botão "Usar minha localização atual" com campo de raio (padrão 100 m, sem mapa) e uma seção "Modo de check-in" com 4 cards selecionáveis com ícone: "Só entrada", "Só saída", "Entrada + saída", "Entrada + palavra-chave" (este último revela um campo de palavra-chave). Português do Brasil.

**Gerenciar evento (coordenador, desktop)**
> Crie em React + Tailwind uma página desktop de gestão de evento com abas: Presenças (tabela com nome, RA, entrada, saída, status colorido e origem QR/Manual), Suspeitas (cards com o motivo, ex.: "Fora do raio: 340 m", e botões Confirmar verde / Recusar vermelho), Tentativas bloqueadas (log com horário, aluno, motivo) e Lançamento manual (busca por RA). Botões "Abrir Telão" e "Imprimir lista de presença" no topo. Português do Brasil.

**Certificado**
> Crie em React + Tailwind um certificado digital de horas complementares em formato A4 paisagem, elegante e pronto para impressão: "Certificamos que Lucas Martins (RA 210345) participou de Segurança da Informação na Prática — SESINFO 2026, em 28/10/2026, no Tribunal do Júri do UNIFEB, com carga de 4 horas". Rodapé com data de emissão, código de verificação "SFB-7K2Q-9XMA" e um QR de verificação. Português do Brasil.

---

## 3. Dicas por ferramenta

- **v0.dev**: funciona melhor tela por tela (seção 2). Comece pelo **Telão** e pelos **resultados do check-in**, que são as telas da demo.
- **Bolt**: aguenta o briefing completo (seção 1). Peça "apenas front-end com dados falsos (mock), sem backend", senão ele tenta criar servidor e banco.
- **Figma (Figma Make / First Draft)**: cole o briefing completo e peça frames separados para **celular (390×844)** e **desktop (1440×900)**.
- Para comparar as "caras": gere o mesmo par de telas (Telão + resultado "QR expirado") nas três ferramentas. É o que a banca vai ver.
- Quando escolher um visual, me mande prints ou o código gerado e eu adapto o projeto para seguir aquele estilo.
