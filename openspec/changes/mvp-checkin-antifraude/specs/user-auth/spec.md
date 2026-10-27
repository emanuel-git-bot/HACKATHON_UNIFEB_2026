# Spec Delta

## Purpose

Identificar quem usa a plataforma (aluno, coordenador ou admin) por RA + senha e liberar para cada papel apenas as telas e ações que lhe cabem.

## ADDED Requirements

### Requirement: Login com RA e senha
O sistema SHALL autenticar usuários por RA (ou identificador de login, no caso de coordenador e admin) e senha, e SHALL manter a sessão ativa no navegador até o logout ou a expiração.

#### Scenario: Login válido
- **WHEN** o usuário informa um RA cadastrado e a senha correta
- **THEN** o sistema inicia a sessão e leva o usuário à tela inicial do seu papel

#### Scenario: Credenciais inválidas
- **WHEN** o usuário informa um RA inexistente ou uma senha errada
- **THEN** o sistema recusa o login com a mesma mensagem genérica nos dois casos, sem revelar qual campo está errado

#### Scenario: Muitas tentativas
- **WHEN** um mesmo RA erra a senha 5 vezes seguidas em 15 minutos
- **THEN** o sistema bloqueia novas tentativas para esse RA por 15 minutos

### Requirement: Senhas protegidas
O sistema MUST armazenar senhas apenas na forma de hash com salt e MUST NOT exibir ou registrar senhas em texto puro.

#### Scenario: Senha nunca exposta
- **WHEN** qualquer resposta da API ou log contém dados de um usuário
- **THEN** nem a senha nem o hash da senha aparecem nesses dados

### Requirement: Papéis e permissões
O sistema SHALL atribuir a cada usuário exatamente um papel (aluno, coordenador ou admin) e SHALL negar acesso a telas e ações de outros papéis.

#### Scenario: Aluno tenta acessar área do coordenador
- **WHEN** um aluno autenticado acessa uma rota ou ação exclusiva de coordenador
- **THEN** o sistema nega o acesso com erro de permissão

#### Scenario: Usuário sem sessão
- **WHEN** alguém sem sessão acessa uma tela ou ação protegida
- **THEN** o sistema redireciona para o login e, após o login, retorna ao destino original

### Requirement: Coordenador vinculado a um curso
Cada coordenador SHALL estar vinculado a um curso e SHALL ver e gerenciar apenas eventos e alunos do próprio curso.

#### Scenario: Coordenador acessa evento de outro curso
- **WHEN** um coordenador tenta ver ou alterar um evento de outro curso
- **THEN** o sistema nega o acesso

### Requirement: Admin gerencia cursos e coordenadores
O admin SHALL poder cadastrar cursos e cadastrar, editar e desativar coordenadores, definindo o curso e a senha inicial de cada um.

#### Scenario: Admin cadastra coordenador
- **WHEN** o admin cadastra um coordenador com nome, login, curso e senha inicial
- **THEN** o coordenador consegue entrar com esse login e senha e vê apenas o curso atribuído

#### Scenario: Coordenador desativado
- **WHEN** o admin desativa um coordenador
- **THEN** esse coordenador não consegue mais fazer login

### Requirement: Cadastro de aluno
O sistema SHALL permitir o cadastro de aluno com nome, RA, curso e senha, e SHALL recusar um RA já cadastrado.

#### Scenario: Cadastro com RA novo
- **WHEN** um aluno se cadastra com um RA ainda não usado
- **THEN** a conta é criada e o aluno já pode entrar

#### Scenario: RA duplicado
- **WHEN** alguém tenta se cadastrar com um RA já existente
- **THEN** o sistema recusa o cadastro informando que o RA já possui conta

### Requirement: Contas de demonstração
O sistema SHALL ter contas de demonstração pré-criadas: um admin master, pelo menos um coordenador e alunos suficientes para a apresentação (incluindo jurados).

#### Scenario: Ambiente de demo pronto
- **WHEN** o banco é inicializado com os dados de demonstração
- **THEN** existem as contas de admin master, coordenador e alunos de demo, cada uma conseguindo fazer login
