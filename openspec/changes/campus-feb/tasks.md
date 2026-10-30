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

## 6. Novas vistas do mapa e fotos dos locais

- [x] 6.1 Desenho do campus tirado do OpenStreetMap (`apps/web/scripts/fetch-campus-osm.mjs` gera `src/data/campus-osm.json`)
- [x] 6.2 Regra no core que dá nome aos prédios a partir dos locais e junta os prédios de um mesmo bloco (`campus-map.ts`, com testes)
- [x] 6.3 Vista "Blocos": campus desenhado como num GPS, um bloco por cor, etiquetas, legenda e ficha do bloco
- [x] 6.4 Vista "3D": maquete com MapLibre sobre o satélite, baixada só quando o aluno escolhe; botões Girar e De cima
- [x] 6.5 Fotos opcionais dos locais: o admin envia (o navegador reduz antes), o aluno vê na ficha do local e em tela cheia
- [x] 6.6 Testes (`test/photos.test.ts`, `campus-map.test.ts`, `photos.test.ts`)
- [x] 6.7 Publicar: migração `0004_place_photos.sql` em produção e deploy (KV `campusfeb-photos`)

## 5. Entrega

- [x] 5.1 Worker e D1 separados (`campusfeb`) e deploy
- [ ] 5.2 Conferir no campus os nomes reais de blocos e salas e corrigir pelo editor do mapa
- [ ] 5.3 Testar em celulares reais (iPhone e Android)
- [ ] 5.4 Ensaiar o pitch de 3 minutos
