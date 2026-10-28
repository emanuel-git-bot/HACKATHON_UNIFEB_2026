## 1. Remover certificados

- [x] 1.1 Migração que apaga `certificates`; remover rotas, emissão e telas de certificado e verificação
- [x] 1.2 Trocar `/me/certificates` por `/me/hours` e ajustar a tela de horas e o resultado do check-in

## 2. API do campus

- [x] 2.1 Regras no core: categorias, `groupJoinBlock` e busca sem acento (com testes)
- [x] 2.2 Locais: listagem pública e CRUD do admin
- [x] 2.3 Grupos de estudo: criar, listar, detalhar, entrar, sair e excluir
- [x] 2.4 Avisos: publicar (coordenador e admin), listar por público, marcar lido e excluir
- [x] 2.5 Materiais: compartilhar, listar e excluir
- [x] 2.6 Relatos de acessibilidade: criar, listar e resolver
- [x] 2.7 Testes da API (`test/campus.test.ts`)
- [x] 2.8 Dados de demo com locais reais, grupos, avisos, materiais e um relato

## 3. Web

- [x] 3.1 Identidade Campus FEB (azul-marinho e dourado) e nova navegação do aluno
- [x] 3.2 Tela inicial do aluno
- [x] 3.3 Mapa (Leaflet): busca, filtros, detalhe, rota a pé, onde estou, versão pública
- [x] 3.4 Grupos de estudo (lista, detalhe, criar)
- [x] 3.5 Avisos (aluno lê; coordenador e admin publicam)
- [x] 3.6 Materiais
- [x] 3.7 Acessibilidade (preferências, pontos acessíveis, relatos)
- [x] 3.8 Guia do Calouro
- [x] 3.9 Admin: editor do mapa e relatos de acessibilidade

## 4. Ajustes depois da revisão do time

- [x] 4.1 Tirar elevadores (o UNIFEB não tem) e minicursos (só palestras valem horas)
- [x] 4.2 Banners do site do UNIFEB no topo dos Avisos, copiados pelo Worker
- [x] 4.3 Vagas de estágio e emprego nos avisos (empresa, link, prazo, filtro)
- [x] 4.4 Papel Atlética: jogos com confirmação de presença, link de WhatsApp e lista de confirmados
- [x] 4.5 Testes (`test/social.test.ts` e regras do core)

## 5. Entrega

- [x] 5.1 Worker e D1 separados (`campusfeb`) e deploy
- [ ] 5.2 Conferir no campus os nomes reais de blocos e salas e corrigir pelo editor do mapa
- [ ] 5.3 Testar em celulares reais (iPhone e Android)
- [ ] 5.4 Ensaiar o pitch de 3 minutos
