# Checklist de testes (para as 3 pessoas testadoras)

**Site:** https://syncfeb.roqueemanuel2018.workers.dev · contas no [README](../README.md#contas-de-demonstração)

Cada pessoa usa **um celular diferente** (ideal: 1 iPhone, 1 Android, alternando Wi-Fi e 4G) e marca o resultado. Um notebook fica com o coordenador (`coord.ec`) mostrando o Telão.

Anote para cada falha: celular/navegador, rede (Wi-Fi/4G), o que fez, o que apareceu (print).

## Preparação (coordenador)
- [ ] Entrar como `coord.ec`, editar "Minicurso de React do Zero", clicar **Usar minha localização atual** e salvar
- [ ] Gerenciar → **Abrir Telão** → passar o mouse no topo → **Abrir entrada**
- [ ] O QR troca a cada 10 s e o anel/contador regressivo anda

## Check-in (cada testador)
- [ ] Ler o QR com a **câmera nativa** abre o site sem pedir app
- [ ] Sem estar logado: aparece "QR Code válido" com o tempo para entrar; entrar com `jurado1`/`jurado2`/`jurado3`
- [ ] O navegador pede localização; ao permitir aparece **"Entrada registrada!"** (modo entrada + saída)
- [ ] O contador do Telão sobe em até 5 s
- [ ] Negar a localização (outro evento ou outro jurado): fica **"aguardando conferência"** (amarelo), não recusado

## Fraudes (devem ser bloqueadas)
- [ ] Tirar foto do QR, esperar 20 s, ler a foto → **"QR Code expirado"** (vermelho)
- [ ] No mesmo celular, Sair e entrar com outro jurado, ler o QR atual → **"Aparelho já utilizado"**
- [ ] Coordenador vê as duas em **Tentativas bloqueadas**

## Saída e certificado
- [ ] Coordenador clica **Abrir saída**; o testador lê o novo QR → **"Presença confirmada!"** com +4h
- [ ] "Ver certificado" abre o certificado; "Imprimir / salvar PDF" gera um PDF legível
- [ ] Abrir o link/QR de verificação do certificado em outro aparelho, sem login → "Certificado autêntico"
- [ ] Aba **Horas** mostra o total somado

## Palavra-chave (evento "Segurança da Informação na Prática")
- [ ] Definir o local do evento, abrir entrada, fazer check-in
- [ ] Coordenador abre a etapa **Palavra-chave**; a tela do evento no celular libera o campo sozinha (até 5 s)
- [ ] Errar 2 vezes mostra as tentativas restantes; digitar `CERBERUS` (maiúsculas/acentos tanto faz) confirma
- [ ] Errar 3 vezes (outro jurado) → fica suspeita

## Coordenador
- [ ] Aba **Suspeitas**: Confirmar e Recusar funcionam e os números atualizam
- [ ] **Imprimir lista de presença** abre a lista A4 com os inscritos e linhas em branco
- [ ] **Lançamento manual** com RA `210345` gera presença "Manual"
- [ ] RA de outro curso é recusado

## Admin (`admin`)
- [ ] Criar um curso e um coordenador novo; o novo coordenador entra e vê só o próprio curso
- [ ] Desativar esse coordenador: ele é deslogado e não entra mais
- [ ] Rede da faculdade: "Autorizar este IP" conectado ao Wi-Fi do local

Depois dos testes, para limpar os dados de produção: `npm run db:seed:remote -w apps/api` (apaga tudo e recria a demo).
