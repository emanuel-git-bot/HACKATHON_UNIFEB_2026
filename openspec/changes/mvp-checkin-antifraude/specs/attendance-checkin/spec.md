# Spec Delta

## Purpose

Registrar a presença dos alunos nos eventos sem papel e com travas em camadas contra fraude (QR dinâmico, local, aparelho único e confirmação de saída), mantendo um plano B manual para quem não tem celular.

## ADDED Requirements

### Requirement: Tela do Telão com QR dinâmico
O coordenador do evento SHALL poder abrir a tela "Telão", que exibe em tela cheia um QR Code que muda a cada 10 segundos, a fase atual (entrada ou saída) e um contador de tempo até a troca.

#### Scenario: QR troca sozinho
- **WHEN** o Telão está aberto durante uma fase ativa
- **THEN** um novo QR Code é exibido a cada 10 segundos, sem recarregar a página

#### Scenario: Somente o coordenador do evento
- **WHEN** um usuário que não é o coordenador daquele evento tenta abrir o Telão
- **THEN** o sistema nega o acesso

### Requirement: Contador de presenças ao vivo no Telão
O Telão SHALL mostrar a quantidade de presenças válidas da fase atual, atualizada em no máximo 5 segundos após cada check-in.

#### Scenario: Jurado faz check-in
- **WHEN** um aluno conclui um check-in válido
- **THEN** o contador do Telão aumenta em até 5 segundos

### Requirement: Controle das fases pelo coordenador
O coordenador SHALL abrir e encerrar as fases do evento conforme o modo escolhido. Somente a fase aberta aceita check-in.

#### Scenario: Fase encerrada
- **WHEN** um aluno escaneia um QR de uma fase já encerrada
- **THEN** o sistema recusa o check-in informando que a fase está fechada

#### Scenario: Fase de saída sem fase de entrada
- **WHEN** o modo é somente saída
- **THEN** o coordenador abre apenas a fase de saída, e ela sozinha conclui a presença

### Requirement: Validade curta do código
O código do QR SHALL ser aceito apenas durante a sua janela de 10 segundos mais uma tolerância de 5 segundos, e MUST ser rejeitado depois disso.

#### Scenario: Leitura dentro da janela
- **WHEN** o aluno lê o QR exibido no Telão naquele momento
- **THEN** o código é aceito

#### Scenario: Foto antiga do QR
- **WHEN** alguém lê uma foto ou print do QR tirada há mais de 15 segundos
- **THEN** o sistema recusa com a mensagem "QR Code expirado" e registra a tentativa

#### Scenario: Código adulterado
- **WHEN** o link do QR tem um código que não foi gerado pelo sistema para aquele evento e fase
- **THEN** o sistema recusa como código inválido

### Requirement: Ticket de escaneamento
Ao ler um código válido, o sistema SHALL emitir um ticket de uso único, válido por 3 minutos, que permite concluir login e localização mesmo depois que o QR mudar.

#### Scenario: Aluno precisa fazer login
- **WHEN** o aluno lê um QR válido sem estar logado e faz login em menos de 3 minutos
- **THEN** o check-in continua com o ticket, sem precisar ler o QR de novo

#### Scenario: Ticket vencido ou reutilizado
- **WHEN** um ticket é usado depois de 3 minutos ou pela segunda vez
- **THEN** o sistema recusa e pede para ler o QR do Telão novamente

### Requirement: Trava de local
O sistema SHALL considerar o local válido quando o IP de origem pertence às redes autorizadas do evento ou quando a posição GPS do aparelho está dentro do raio do evento, descontada a margem de precisão informada pelo aparelho.

#### Scenario: Rede da faculdade
- **WHEN** o aluno faz check-in conectado a uma rede cujo IP público está na lista autorizada
- **THEN** a trava de local passa, mesmo sem GPS

#### Scenario: Dados móveis dentro do raio
- **WHEN** o aluno está nos dados móveis e o GPS indica que está dentro do raio
- **THEN** a trava de local passa

#### Scenario: Fora do raio ou GPS negado
- **WHEN** o IP não é autorizado e o GPS está fora do raio, indisponível ou com permissão negada
- **THEN** a presença é registrada como "suspeita", e não como recusada

### Requirement: Localização sem mapa
A tela do aluno MUST NOT exibir mapa nem as coordenadas do aluno ou do evento; a posição é usada apenas no cálculo de distância.

#### Scenario: Check-in com GPS
- **WHEN** o aluno faz check-in com GPS ativo
- **THEN** a tela mostra apenas o resultado (válido, suspeito ou recusado), sem mapa ou coordenadas

### Requirement: Trava de aparelho único
O sistema SHALL identificar cada aparelho por um token persistente e MUST recusar que um mesmo aparelho registre presença de mais de uma conta no mesmo evento.

#### Scenario: Segunda conta no mesmo celular
- **WHEN** um aparelho que já registrou presença da conta A no evento tenta registrar presença da conta B
- **THEN** o sistema recusa com a mensagem "Este aparelho já registrou presença de outra conta neste evento" e registra a tentativa

#### Scenario: Mesmo aluno, mesmo aparelho, fase seguinte
- **WHEN** o aluno A faz o check-in de saída no mesmo aparelho usado na entrada
- **THEN** o sistema aceita normalmente

### Requirement: Conclusão da presença por modo
A presença SHALL ser concluída somente quando todas as etapas do modo do evento forem cumpridas: entrada; saída; entrada e saída; ou entrada e palavra-chave.

#### Scenario: Faltou a saída
- **WHEN** o modo é entrada e saída e o aluno só registrou a entrada
- **THEN** a presença fica "incompleta" e não gera certificado

#### Scenario: Palavra-chave correta
- **WHEN** o modo é entrada e palavra-chave, o aluno registrou entrada e digita a palavra-chave correta com a fase de saída aberta
- **THEN** a presença é concluída

### Requirement: Validação da palavra-chave
A palavra-chave SHALL ser comparada sem diferenciar maiúsculas, minúsculas e acentos, e o sistema MUST permitir no máximo 3 tentativas erradas por aluno por evento.

#### Scenario: Tentativas esgotadas
- **WHEN** o aluno erra a palavra-chave pela terceira vez
- **THEN** o sistema bloqueia novas tentativas e marca a presença como "suspeita"

### Requirement: Resultado claro para o aluno
Após cada tentativa, a tela do aluno SHALL mostrar um resultado inequívoco: "Presença confirmada", "Presença registrada, aguardando conferência" (suspeita) ou o motivo da recusa.

#### Scenario: Fraude bloqueada na demo
- **WHEN** a foto de um QR expirado é lida
- **THEN** a tela mostra em destaque que o QR expirou e que a presença não foi registrada

### Requirement: Revisão de presenças suspeitas
O coordenador SHALL ver a lista de presenças suspeitas do evento, com o motivo de cada uma, e SHALL poder confirmar ou recusar cada presença.

#### Scenario: Coordenador confirma
- **WHEN** o coordenador confirma uma presença suspeita
- **THEN** ela passa a valer como presença normal e segue para a conclusão

#### Scenario: Coordenador recusa
- **WHEN** o coordenador recusa uma presença suspeita
- **THEN** ela não gera horas nem certificado

### Requirement: Lista de presença imprimível
O coordenador SHALL poder gerar, para cada evento, uma lista imprimível com título, data, local e colunas de nome, RA e assinatura, já preenchida com os inscritos e com linhas em branco extras.

#### Scenario: Imprimir lista
- **WHEN** o coordenador escolhe "Imprimir lista" num evento
- **THEN** o navegador abre a versão de impressão da lista, formatada em A4

### Requirement: Lançamento manual de presença
O coordenador SHALL poder registrar manualmente a presença concluída de um aluno do seu curso, buscando pelo RA, e o sistema SHALL marcar essas presenças como de origem manual.

#### Scenario: Aluno sem celular
- **WHEN** o coordenador lança a presença de um RA que assinou a lista em papel
- **THEN** a presença é concluída, identificada como "manual", e gera certificado

### Requirement: Registro de tentativas
O sistema SHALL registrar todas as tentativas de check-in, aceitas ou recusadas, com data e hora, aluno (se identificado), resultado e motivo, visíveis ao coordenador do evento.

#### Scenario: Coordenador audita o evento
- **WHEN** o coordenador abre o histórico de tentativas do evento
- **THEN** vê as tentativas recusadas por QR expirado, aparelho repetido ou fase fechada
