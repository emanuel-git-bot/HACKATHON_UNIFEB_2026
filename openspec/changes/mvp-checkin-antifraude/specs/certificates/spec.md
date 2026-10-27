# Spec Delta

## Purpose

Transformar a presença concluída num certificado digital verificável e mostrar ao aluno o total de horas complementares acumuladas, sem conferência manual de papel.

## ADDED Requirements

### Requirement: Emissão automática do certificado
O sistema SHALL emitir um certificado no momento em que a presença do aluno é concluída, seja por check-in, por confirmação de suspeita ou por lançamento manual.

#### Scenario: Presença concluída no check-in
- **WHEN** a última etapa do modo do evento é cumprida com local válido
- **THEN** o certificado aparece na conta do aluno, sem ação adicional

#### Scenario: Presença suspeita
- **WHEN** a presença está "suspeita" ou "incompleta"
- **THEN** nenhum certificado é emitido até que ela seja concluída ou confirmada

### Requirement: Certificado único por aluno e evento
O sistema MUST emitir no máximo um certificado por aluno por evento.

#### Scenario: Confirmação repetida
- **WHEN** uma presença já concluída é confirmada ou lançada de novo
- **THEN** o certificado existente é mantido e nenhum outro é criado

### Requirement: Conteúdo do certificado
O certificado SHALL exibir nome e RA do aluno, título, data e local do evento, horas complementares, data de emissão e um código de verificação único.

#### Scenario: Aluno abre o certificado
- **WHEN** o aluno abre um certificado na sua conta
- **THEN** vê todos esses dados numa página pronta para imprimir ou salvar em PDF

### Requirement: Verificação pública
Qualquer pessoa, mesmo sem login, SHALL poder verificar um certificado pelo código de verificação, e a página pública MUST NOT exibir dados além dos que constam no próprio certificado.

#### Scenario: Código válido
- **WHEN** alguém acessa a página de verificação com um código existente
- **THEN** a página confirma que o certificado é autêntico e mostra os dados do certificado

#### Scenario: Código inexistente
- **WHEN** alguém acessa a verificação com um código que não existe
- **THEN** a página informa que o certificado não foi encontrado

### Requirement: Total de horas do aluno
O painel do aluno SHALL mostrar a soma das horas complementares dos certificados emitidos e a lista desses certificados.

#### Scenario: Novo certificado soma horas
- **WHEN** um certificado de 4 horas é emitido para um aluno que tinha 10 horas
- **THEN** o painel passa a mostrar 14 horas
