# Spec Delta

## Purpose

Centralizar os eventos acadêmicos num mural: o coordenador cadastra e configura cada evento, e o aluno descobre, se inscreve e vê quantas horas complementares o evento vale.

## ADDED Requirements

### Requirement: Coordenador cria evento
O coordenador SHALL poder criar um evento com título, descrição, data e horário de início e fim, local, horas complementares, curso e modo de check-in.

#### Scenario: Evento criado
- **WHEN** o coordenador preenche todos os campos obrigatórios e salva
- **THEN** o evento aparece no mural com as horas e o local informados

#### Scenario: Dados inválidos
- **WHEN** o horário de fim é anterior ao de início, ou as horas complementares não são um número positivo
- **THEN** o sistema recusa o evento e indica o campo inválido

### Requirement: Local do evento para a trava de distância
Cada evento SHALL ter coordenadas de referência (latitude e longitude) e um raio em metros, com padrão de 100 metros, usados na validação de presença.

#### Scenario: Raio padrão
- **WHEN** o coordenador cria um evento sem alterar o raio
- **THEN** o evento usa raio de 100 metros

#### Scenario: Capturar a posição atual
- **WHEN** o coordenador escolhe usar a localização atual do aparelho como local do evento
- **THEN** as coordenadas do evento passam a ser as do aparelho do coordenador

### Requirement: Modo de check-in configurável
O coordenador SHALL escolher, por evento, um modo de check-in: somente entrada, somente saída, entrada e saída (dois QR Codes) ou entrada e palavra-chave.

#### Scenario: Modo entrada e palavra-chave
- **WHEN** o coordenador escolhe o modo entrada e palavra-chave
- **THEN** o sistema exige que ele defina a palavra-chave, que não é exibida aos alunos

#### Scenario: Alterar modo após presenças registradas
- **WHEN** o coordenador tenta mudar o modo de um evento que já tem presenças registradas
- **THEN** o sistema recusa a alteração

### Requirement: Mural de eventos
O aluno SHALL ver a lista de eventos futuros e em andamento, ordenada por data, mostrando título, data, local e horas complementares.

#### Scenario: Aluno abre o mural
- **WHEN** um aluno autenticado abre o mural
- **THEN** vê os eventos futuros e em andamento, com as horas de cada um em destaque

### Requirement: Inscrição com um clique
O aluno SHALL poder se inscrever e cancelar a inscrição num evento com uma ação, e SHALL ver em quais eventos está inscrito.

#### Scenario: Inscrição
- **WHEN** o aluno toca em "Inscrever-se" num evento
- **THEN** a inscrição é registrada e o evento aparece em "Meus eventos"

#### Scenario: Inscrição repetida
- **WHEN** o aluno já inscrito tenta se inscrever de novo
- **THEN** o sistema mantém uma única inscrição

### Requirement: Inscrição não é pré-requisito do check-in
O sistema SHALL aceitar o check-in de um aluno presente mesmo sem inscrição prévia, registrando a inscrição automaticamente.

#### Scenario: Aluno sem inscrição faz check-in
- **WHEN** um aluno não inscrito conclui um check-in válido
- **THEN** a presença é registrada e o aluno passa a constar como inscrito
