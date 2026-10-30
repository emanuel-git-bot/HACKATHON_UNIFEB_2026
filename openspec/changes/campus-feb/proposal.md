# Proposal

## Why

A conversa com o coordenador mostrou que a lista de presença já tem uma solução que funciona para ele. O desafio do hackathon é **Campus Inteligente & Vida Universitária**: reduzir atritos na vida do aluno, como integração de calouros, compartilhamento de recursos, localização de serviços, grupos de estudo, acessibilidade, eventos e comunicação acadêmica. O projeto 2 vira o **Campus FEB**: um app único que cobre esses pontos e reaproveita o que já funcionava no projeto 1 (eventos, check-in por QR, coordenadores e admin). A apresentação é na sexta, 30/10/2026.

## What Changes

- **BREAKING:** sai a geração de certificados. A tabela `certificates`, as rotas `/certificates` e `/verify` e as telas de certificado e verificação foram removidas. As horas do aluno passam a ser a soma das presenças concluídas (`GET /me/hours`).
- **Mapa do campus**:
  - mapa de satélite com os prédios reais do OpenStreetMap;
  - busca de sala, bloco ou serviço;
  - filtros (blocos e salas, serviços, comer, banheiros, acessibilidade);
  - "Onde estou" e "Como chegar" (rota a pé);
  - versão pública sem login;
  - o admin cadastra e posiciona os locais clicando no mapa;
  - três vistas, escolhidas num seletor acima do mapa: **Mapa** (a original, satélite ou ruas, sem mudanças), **Blocos** (o campus desenhado como num GPS, cada bloco numa cor, com legenda e ficha do bloco) e **3D** (maquete dos prédios sobre o satélite, com giro e inclinação);
  - o nome e a cor de cada prédio nas vistas Blocos e 3D vêm dos locais cadastrados, então corrigir um local no editor também corrige o desenho;
  - **fotos opcionais** de cada local (até 6), enviadas pelo admin e mostradas na ficha do local, com tela cheia.
- **Grupos de estudo**: o aluno cria grupos (matéria, data, local no campus ou link online, vagas, opção "só meu curso"), entra e sai. Grupo lotado ou com encontro já passado bloqueia a entrada.
- **Avisos**:
  - o coordenador publica para o próprio curso e o admin para o campus todo ou para um curso;
  - categorias aviso, prova, evento, oportunidade e urgente, com opção de fixar no topo;
  - marcação de lido e contador de não lidos na navegação.
- **Materiais**: os alunos compartilham resumos, apostilas, links e livros para emprestar. Os links precisam ser http(s) e só o dono ou o admin remove.
- **Acessibilidade**:
  - camada de banheiros acessíveis, rampas e vagas PcD no mapa (o UNIFEB não tem elevadores);
  - ajustes do app (letras maiores, alto contraste, menos animações);
  - relato de problemas (rampa bloqueada, banheiro fechado) que o admin marca como resolvido.
- **Palestras**: o UNIFEB não tem minicursos; os eventos acadêmicos com horas complementares são palestras (categorias `palestra` e `outro`).
- **Atlética** (papel novo `organizer`, criado pelo admin):
  - cria jogos e festas (futsal, basquete, vôlei, handebol, integração) com data, local do mapa ou endereço e vagas opcionais;
  - esses eventos **não valem horas**: o aluno só confirma presença ou cancela;
  - link público `/confirmar/:id` e botão que abre o WhatsApp com a mensagem pronta para os grupos;
  - a Atlética vê a lista de quem confirmou.
- **Vagas nos avisos**: categorias Estágio e Emprego com empresa, link para se candidatar e prazo. O coordenador publica para o próprio curso e o admin para todos. Filtro "Vagas e estágios" no mural.
- **Banners do site**: o carrossel da página inicial de unifeb.edu.br aparece no topo dos Avisos. O Worker copia a lista de banners a cada 6 horas (ou quando o admin pede) e mantém os antigos se o site falhar.
- **Guia do Calouro**: checklist da primeira semana, perguntas frequentes, telefones, siglas e links oficiais, tudo tirado do site do UNIFEB.
- **Tela inicial do aluno**: busca rápida, atalhos, horas, últimos avisos, próximos eventos e meus grupos.
- Identidade visual **Campus FEB** em azul-marinho e dourado (cores do UNIFEB e do pôster do desafio).
- Worker e banco **separados** do projeto 1 (`campusfeb`), para não afetar o SyncFEB publicado.

## Capabilities

### New Capabilities
- `campus-map`: locais do campus com categoria, bloco, andar, horário, telefone e acessibilidade; leitura pública e edição pelo admin.
- `study-groups`: criação, listagem, entrada e saída de grupos de estudo com limite de vagas.
- `announcements`: avisos por curso ou para o campus, com fixação e leitura.
- `shared-resources`: materiais compartilhados entre alunos.
- `accessibility`: camada acessível do mapa, preferências de leitura e relatos de problemas.
- `freshman-guide`: guia do calouro (conteúdo estático).
- `athletics-events`: eventos da Atlética com confirmação de presença e compartilhamento no WhatsApp.
- `site-banners`: cópia periódica dos banners do site do UNIFEB.
- `place-photos`: fotos opcionais dos locais do mapa, enviadas pelo admin e públicas como o mapa.

### Modified Capabilities
- `certificates`: removida. A soma de horas passa para `events` (`/me/hours`).

## Impact

- API: migrações `0002_campus.sql` e `0003_atletica_vagas_banners.sql` (recria `users` para aceitar o papel `organizer`, seguindo a receita do D1 com `defer_foreign_keys`); rotas em `routes/campus.ts`, `routes/social.ts` e `routes/banners.ts`. Saem `routes/certificates.ts` e a emissão de certificado em `services/attendance.ts`.
- Core: `packages/core/src/campus.ts` (categorias, regra de entrada em grupo, busca sem acento).
- Web: Leaflet com tiles da Esri (satélite) e do OpenStreetMap; novas páginas em `apps/web/src/pages`.
- Dados de demo em `apps/api/scripts/seed-campus.ts`: os nomes de blocos e salas são exemplos, e as posições vêm dos prédios do OpenStreetMap.
- Vistas do mapa: `packages/core/src/campus-map.ts` (geometria e agrupamento dos blocos), `apps/web/src/data/campus-osm.json` (desenho do campus, ODbL, com atribuição no mapa), `BlocksMap.tsx` (Leaflet sem imagens) e `Campus3DMap.tsx` (MapLibre GL, carregado sob demanda). A altura dos prédios no 3D é estimada pelos andares informados nos locais.
- Fotos: migração `0004_place_photos.sql` (dados) e KV `campusfeb-photos` (binding `PHOTOS`, arquivos). O ideal seria o R2, mas ele não está ativado na conta; o KV atende a este volume (até 6 fotos por local, cerca de 300 KB cada).
