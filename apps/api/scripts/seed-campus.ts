/**
 * Dados de demonstração do Campus FEB: mapa, grupos de estudo, avisos, materiais e relatos.
 * As posições vêm dos prédios do campus no OpenStreetMap; os nomes de blocos e salas são exemplos
 * (o admin corrige pelo mapa). Contatos e horários vêm do site oficial do UNIFEB.
 */

type Sql = (v: string | number | null) => string;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

interface SeedPlace {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  description?: string;
  building?: string;
  floor?: string;
  accessible?: boolean;
  hours?: string;
  phone?: string;
}

export const places: SeedPlace[] = [
  { id: "pl_entrada", name: "Portaria principal", category: "office", lat: -20.57345, lng: -48.56105, description: "Entrada pela Av. Prof. Roberto Frade Monte, 389.", accessible: true },
  { id: "pl_bloco_a", name: "Bloco A", category: "block", lat: -20.57414, lng: -48.56035, description: "Salas de aula, coordenação de cursos e auditório.", accessible: true },
  { id: "pl_bloco_b", name: "Bloco B", category: "block", lat: -20.57492, lng: -48.56041, description: "Salas de aula climatizadas." },
  { id: "pl_bloco_c", name: "Bloco C — Informática", category: "block", lat: -20.57369, lng: -48.56212, description: "Laboratórios de informática e salas de Engenharia e Sistemas.", accessible: true },
  { id: "pl_bloco_d", name: "Bloco D", category: "block", lat: -20.5739, lng: -48.56295, description: "Salas de aula e laboratórios de saúde." },
  { id: "pl_bloco_e", name: "Bloco E", category: "block", lat: -20.57385, lng: -48.5634, description: "Laboratórios de química e biomedicina." },
  { id: "pl_biblioteca", name: "Biblioteca Prof. Roberto Rossi Zuccolo", category: "library", lat: -20.57404, lng: -48.56254, description: "Quase 50 mil volumes, cabines para estudo em grupo e computadores. Empréstimo só para alunos.", accessible: true, hours: "Seg a sex, 9h às 22h", phone: "(17) 3321-6458" },
  { id: "pl_teatro", name: "Teatro Jorge Andrade", category: "auditorium", lat: -20.57562, lng: -48.56267, description: "750 lugares, climatizado e com acessibilidade. Palestras, eventos e formaturas.", accessible: true },
  { id: "pl_odonto", name: "Clínica Odontológica", category: "health", lat: -20.57638, lng: -48.56195, description: "76 consultórios; atendimento à comunidade.", phone: "(17) 3321-6328" },
  { id: "pl_fablab", name: "FAB LAB — FEB 360°", category: "lab", lat: -20.57521, lng: -48.56185, description: "Espaço maker da rede do MIT: impressoras 3D, corte a laser, CNC. Aberto a alunos e comunidade." },
  { id: "pl_vet", name: "Núcleo de Medicina Veterinária", category: "lab", lat: -20.57489, lng: -48.56329, description: "Laboratórios e clínica de pequenos e grandes animais." },
  { id: "pl_cantina", name: "Cantina", category: "food", lat: -20.57468, lng: -48.56269, description: "Lanches, almoço e café.", accessible: true },
  { id: "pl_secretaria", name: "Secretaria Acadêmica", category: "office", lat: -20.57398, lng: -48.56062, building: "Bloco A", floor: "Térreo", description: "Matrícula, declarações, histórico e documentos.", accessible: true, phone: "(17) 3321-6372" },
  { id: "pl_proaluno", name: "Pró-Aluno", category: "office", lat: -20.57426, lng: -48.56052, building: "Bloco A", floor: "Térreo", description: "Acolhimento e apoio psicológico, social e pedagógico; orientação sobre bolsas e adaptação.", phone: "(17) 3321-6330" },
  { id: "pl_nape", name: "NAPE", category: "office", lat: -20.57432, lng: -48.5603, building: "Bloco A", floor: "Térreo", description: "Núcleo de apoio psicopedagógico ao estudante.", phone: "(17) 3321-6388" },
  { id: "pl_bolsas", name: "Bolsas e Financiamento (FIES, ProUni)", category: "office", lat: -20.57408, lng: -48.56121, description: "Programas de incentivo: FIES, ProUni, Bolsas Santander e bolsas do UNIFEB.", phone: "(17) 3321-6353" },
  { id: "pl_neu", name: "NEU — Núcleo de Empregabilidade", category: "office", lat: -20.57425, lng: -48.56119, description: "Estágios não obrigatórios, convênios e vagas de emprego.", accessible: true },
  { id: "pl_dti", name: "DTI — Suporte de TI", category: "office", lat: -20.57366, lng: -48.56196, building: "Bloco C — Informática", description: "Wi-Fi, e-mail @unifeb.edu.br e acesso ao Portal do Aluno.", phone: "(17) 3321-6370" },
  { id: "pl_npj", name: "Núcleo de Prática Jurídica", category: "office", lat: -20.57434, lng: -48.56222, description: "Atendimento jurídico gratuito supervisionado pelo curso de Direito.", phone: "(17) 3321-6383" },
  { id: "pl_juri", name: "Tribunal do Júri", category: "auditorium", lat: -20.57442, lng: -48.56232, description: "Sala de júri simulado do curso de Direito; usada em palestras e apresentações.", accessible: true },
  { id: "pl_quadra", name: "Quadra poliesportiva", category: "sports", lat: -20.57602, lng: -48.56125, description: "Jogos e treinos da Atlética Cerberus." },
  { id: "pl_estac", name: "Estacionamento", category: "parking", lat: -20.5746, lng: -48.5614, description: "Estacionamento interno do campus." },
  { id: "pl_lab_info1", name: "Laboratório de Informática 1", category: "lab", lat: -20.57374, lng: -48.56218, building: "Bloco C — Informática", floor: "Térreo", accessible: true, phone: "(17) 3321-6385" },
  { id: "pl_lab_info2", name: "Laboratório de Informática 2", category: "lab", lat: -20.57364, lng: -48.56206, building: "Bloco C — Informática", floor: "1º andar" },
  { id: "pl_auditorio_a", name: "Auditório do Bloco A", category: "auditorium", lat: -20.5742, lng: -48.56018, building: "Bloco A", floor: "Térreo", accessible: true },
  { id: "pl_sala_a12", name: "Sala A12", category: "classroom", lat: -20.57409, lng: -48.56042, building: "Bloco A", floor: "1º andar" },
  { id: "pl_sala_a21", name: "Sala A21", category: "classroom", lat: -20.57418, lng: -48.56028, building: "Bloco A", floor: "2º andar" },
  { id: "pl_sala_b03", name: "Sala B03", category: "classroom", lat: -20.57496, lng: -48.56046, building: "Bloco B", floor: "Térreo", accessible: true },
  { id: "pl_sala_c14", name: "Sala C14", category: "classroom", lat: -20.57372, lng: -48.56224, building: "Bloco C — Informática", floor: "1º andar" },
  { id: "pl_sala_d05", name: "Sala D05", category: "classroom", lat: -20.57394, lng: -48.56299, building: "Bloco D", floor: "Térreo", accessible: true },
  { id: "pl_wc_a", name: "Banheiros do Bloco A", category: "restroom", lat: -20.57405, lng: -48.56025, building: "Bloco A", floor: "Todos os andares" },
  { id: "pl_wc_cantina", name: "Banheiros da Cantina", category: "restroom", lat: -20.57472, lng: -48.56262 },
  { id: "pl_wcpcd_a", name: "Banheiro acessível — Bloco A", category: "accessible_restroom", lat: -20.57411, lng: -48.56022, building: "Bloco A", floor: "Térreo", description: "Barras de apoio, porta larga e pia rebaixada." },
  { id: "pl_wcpcd_c", name: "Banheiro acessível — Bloco C", category: "accessible_restroom", lat: -20.57363, lng: -48.56219, building: "Bloco C — Informática", floor: "Térreo" },
  { id: "pl_wcpcd_bib", name: "Banheiro acessível — Biblioteca", category: "accessible_restroom", lat: -20.57409, lng: -48.56248, floor: "Térreo" },
  { id: "pl_wcpcd_teatro", name: "Banheiro acessível — Teatro", category: "accessible_restroom", lat: -20.57556, lng: -48.56259 },
  { id: "pl_rampa_entrada", name: "Rampa da portaria", category: "ramp", lat: -20.57352, lng: -48.56098, description: "Rampa com corrimão da portaria até o pátio." },
  { id: "pl_rampa_bib", name: "Rampa da Biblioteca", category: "ramp", lat: -20.57398, lng: -48.56244 },
  { id: "pl_rampa_teatro", name: "Rampa do Teatro", category: "ramp", lat: -20.57549, lng: -48.56272 },
  { id: "pl_vaga_pcd", name: "Vagas PcD e idosos", category: "accessible_parking", lat: -20.57452, lng: -48.56125, description: "Vagas reservadas perto do Bloco A." },
];

/** Dia `days` à frente, na hora `hour` de Brasília (UTC-3). */
export function brasiliaAt(now: number, hour: number, days: number): number {
  const d = new Date(now - 3 * HOUR);
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour, 0, 0, 0);
  return d.getTime() + 3 * HOUR;
}

export function campusSeedLines(q: Sql, now: number): string[] {
  const lines: string[] = [];

  for (const p of places) {
    lines.push(
      `INSERT INTO places (id, name, category, description, building, floor, lat, lng, accessible, opening_hours, phone, created_at) VALUES (${q(p.id)}, ${q(p.name)}, ${q(p.category)}, ${q(p.description ?? "")}, ${q(p.building ?? null)}, ${q(p.floor ?? null)}, ${p.lat}, ${p.lng}, ${p.accessible ? 1 : 0}, ${q(p.hours ?? null)}, ${q(p.phone ?? null)}, ${now});`,
    );
  }

  const groups = [
    { id: "grp_calc", owner: "user_lucas", course: null, title: "Lista 3 de Cálculo I", subject: "Cálculo I", description: "Vamos resolver juntos a lista de derivadas antes da prova. Traga a calculadora!", meetsAt: brasiliaAt(now, 19, 1), place: "pl_biblioteca", url: null, max: 6, members: ["user_lucas", "user_beatriz"] },
    { id: "grp_alg", owner: "user_beatriz", course: "course_ec", title: "Ponteiros em C sem medo", subject: "Algoritmos", description: "Revisão de ponteiros e alocação dinâmica no laboratório.", meetsAt: brasiliaAt(now, 14, 2), place: "pl_lab_info1", url: null, max: 8, members: ["user_beatriz"] },
    { id: "grp_ing", owner: "user_rafael", course: null, title: "Conversação em inglês", subject: "Inglês", description: "Encontro online para treinar conversação. Todos os níveis.", meetsAt: brasiliaAt(now, 20, 3), place: null, url: "https://meet.google.com/", max: 10, members: ["user_rafael", "user_lucas"] },
  ];
  for (const g of groups) {
    lines.push(
      `INSERT INTO study_groups (id, owner_id, course_id, title, subject, description, meets_at, place_id, online_url, max_members, created_at) VALUES (${q(g.id)}, ${q(g.owner)}, ${q(g.course)}, ${q(g.title)}, ${q(g.subject)}, ${q(g.description)}, ${g.meetsAt}, ${q(g.place)}, ${q(g.url)}, ${g.max}, ${now});`,
    );
    for (const m of g.members) {
      lines.push(`INSERT INTO study_group_members (group_id, user_id, joined_at) VALUES (${q(g.id)}, ${q(m)}, ${now});`);
    }
  }

  const announcements = [
    { author: "user_admin", course: null, category: "notice", pinned: 1, ago: 2 * DAY, title: "Bem-vindo(a) ao Campus FEB!", body: "Aqui você encontra o mapa do campus, eventos, grupos de estudo, materiais da galera e os avisos da coordenação. Calouro? Comece pelo Guia do Calouro na tela inicial." },
    { author: "user_admin", course: null, category: "urgent", pinned: 0, ago: 3 * HOUR, title: "Bloco D sem energia hoje à noite", body: "Por causa de manutenção na rede elétrica, as aulas do Bloco D de hoje à noite foram remanejadas para o Bloco B. Confira sua sala no mapa." },
    { author: "user_coord_ec", course: "course_ec", category: "event", pinned: 0, ago: 1 * DAY, title: "Hackathon XXIII SESINFO: desafio revelado dia 30/10", body: "O tema é Campus Inteligente & Vida Universitária. Premiação para as 3 melhores soluções." },
    { author: "user_coord_ec", course: "course_ec", category: "exam", pinned: 0, ago: 5 * HOUR, title: "P1 de Cálculo I remarcada", body: "A P1 de Cálculo I foi remarcada para a próxima terça, 19h, na Sala A12." },
    { author: "user_coord_ec", course: "course_ec", category: "internship", pinned: 0, ago: 8 * HOUR, title: "Estágio em desenvolvimento web", body: "Vaga de estágio de 6 horas para alunos a partir do 3º semestre. Conhecimento básico de HTML, CSS e JavaScript. Bolsa-auxílio e vale-transporte.", company: "Empresa de software de Barretos (exemplo)", link: "https://www.unifeb.edu.br/institucional/neu", deadlineDays: 10 },
    { author: "user_coord_ec", course: "course_ec", category: "job", pinned: 0, ago: 2 * DAY, title: "Analista de suporte de TI júnior", body: "Atendimento a usuários, manutenção de computadores e redes. Vaga efetiva, presencial em Barretos.", company: "Provedor de internet da região (exemplo)", link: "https://www.unifeb.edu.br/institucional/neu", deadlineDays: 5 },
    { author: "user_admin", course: null, category: "internship", pinned: 0, ago: 4 * DAY, title: "NEU: banco de vagas de estágio remunerado", body: "O Núcleo de Empregabilidade tem parceria com mais de 900 empresas e órgãos públicos. Procure o NEU para vagas de estágio em todas as áreas.", company: "NEU — Núcleo de Empregabilidade do UNIFEB", link: "https://www.unifeb.edu.br/institucional/neu", deadlineDays: null },
    { author: "user_admin", course: null, category: "notice", pinned: 0, ago: 6 * DAY, title: "FIES: aditamento de renovação", body: "Alunos com FIES devem fazer o aditamento de renovação. Dúvidas: setor de Bolsas e Financiamento, (17) 3321-6353." },
  ];
  announcements.forEach((a, i) => {
    const job = "company" in a ? a : null;
    const deadline = job?.deadlineDays ? brasiliaAt(now, 23, job.deadlineDays) : null;
    lines.push(
      `INSERT INTO announcements (id, author_id, course_id, category, title, body, pinned, created_at, company, link_url, deadline_at) VALUES ('ann_${i + 1}', ${q(a.author)}, ${q(a.course)}, ${q(a.category)}, ${q(a.title)}, ${q(a.body)}, ${a.pinned}, ${now - a.ago}, ${q(job?.company ?? null)}, ${q(job?.link ?? null)}, ${deadline ?? "NULL"});`,
    );
  });

  const socialEvents = [
    { id: "soc_futsal", kind: "futsal", title: "Futsal: Engenharia x Sistemas", description: "Amistoso entre os cursos. Venha jogar ou torcer! Leve água e chegue 15 min antes para montar os times.", startsAt: brasiliaAt(now, 19, 1), place: "pl_quadra", location: "Quadra poliesportiva", capacity: null, rsvps: ["user_lucas", "user_beatriz", "user_jurado1", "user_jurado2", "user_jurado3", "user_jurado4", "user_jurado5", "user_jurado6"] },
    { id: "soc_basquete", kind: "basketball", title: "Basquete 3x3: treino aberto", description: "Treino para iniciantes e veteranos. Vamos formar o time da Cerberus para os jogos universitários.", startsAt: brasiliaAt(now, 18, 2), place: "pl_quadra", location: "Quadra poliesportiva", capacity: 12, rsvps: ["user_rafael", "user_jurado7"] },
    { id: "soc_volei", kind: "volleyball", title: "Vôlei misto da Cerberus", description: "Partidas rápidas, times sorteados na hora. Todos os níveis.", startsAt: brasiliaAt(now, 19, 4), place: "pl_quadra", location: "Quadra poliesportiva", capacity: 18, rsvps: ["user_beatriz"] },
    { id: "soc_calouros", kind: "party", title: "Integração dos calouros", description: "Recepção da Atlética Cerberus para quem acabou de chegar: música, jogos e apresentação das modalidades.", startsAt: brasiliaAt(now, 20, 6), place: "pl_cantina", location: "Pátio da Cantina", capacity: null, rsvps: [] as string[] },
  ];
  for (const s of socialEvents) {
    lines.push(
      `INSERT INTO social_events (id, organizer_id, kind, title, description, starts_at, place_id, location, capacity, created_at) VALUES (${q(s.id)}, 'user_atletica', ${q(s.kind)}, ${q(s.title)}, ${q(s.description)}, ${s.startsAt}, ${q(s.place)}, ${q(s.location)}, ${s.capacity ?? "NULL"}, ${now});`,
    );
    for (const u of s.rsvps) {
      lines.push(`INSERT INTO social_event_rsvps (event_id, user_id, created_at) VALUES (${q(s.id)}, ${q(u)}, ${now});`);
    }
  }

  // Carrossel do site do UNIFEB em 28/10/2026; o Worker atualiza sozinho a cada 6 horas.
  const banners = [
    ["banner_313_1.png", "https://febinscricao.crmeducacional.com/login/204"],
    ["banner_315_1.png", "https://www.unifeb.edu.br/uploads/arquivos/CARTILHA.pdf"],
    ["banner_316_1.png", "https://www.unifeb.edu.br/pos-graduacao/simposio-sip"],
    ["banner_314_1.png", "https://sistema.unifeb.edu.br/"],
    ["banner_312_1.png", "https://www.unifeb.edu.br/colegiofeb/"],
    ["banner_306_1.png", "https://unifeb.edu.br/cursos-capacitacao/"],
    ["banner_307_1.jpg", null],
    ["banner_270_1.png", "https://api.whatsapp.com/send?phone=5517991009927"],
    ["banner_277_1.png", null],
    ["banner_241_1.png", "https://www.unifeb.edu.br/conselhocurador/"],
    ["banner_172_1_1.jpg", "https://sistema.unifeb.edu.br/"],
  ] as const;
  banners.forEach(([file, link], i) => {
    lines.push(
      `INSERT INTO site_banners (position, image_url, link_url) VALUES (${i}, ${q(`https://www.unifeb.edu.br/uploads/banners/${file}`)}, ${q(link)});`,
    );
  });
  lines.push(
    `INSERT INTO settings (key, value) VALUES ('banners_synced_at', '${now}') ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
  );

  const resources = [
    { owner: "user_beatriz", kind: "summary", title: "Resumo de Cálculo I: limites e derivadas", subject: "Cálculo I", description: "Fórmulas e exemplos resolvidos, 6 páginas.", url: "https://drive.google.com/" },
    { owner: "user_lucas", kind: "book", title: "Livro Algoritmos (Cormen) para emprestar", subject: "Algoritmos", description: "Tenho uma cópia física. Me procure na Sala C14 nos intervalos.", url: null },
    { owner: "user_rafael", kind: "link", title: "Calendário acadêmico 2026 (oficial)", subject: "Geral", description: "Datas de provas, feriados e recessos.", url: "https://www.unifeb.edu.br/uploads/arquivos/CALEND%C3%81RIO%20ACADEMICO%20-%202026.pdf" },
    { owner: "user_beatriz", kind: "handout", title: "Apostila de Lógica de Programação", subject: "Lógica de Programação", description: "Exercícios com gabarito.", url: "https://drive.google.com/" },
  ];
  resources.forEach((r, i) => {
    lines.push(
      `INSERT INTO resources (id, owner_id, course_id, kind, title, subject, description, url, created_at) VALUES ('res_${i + 1}', ${q(r.owner)}, NULL, ${q(r.kind)}, ${q(r.title)}, ${q(r.subject)}, ${q(r.description)}, ${q(r.url)}, ${now - (i + 1) * DAY});`,
    );
  });

  lines.push(
    `INSERT INTO accessibility_reports (id, place_id, user_id, description, status, created_at) VALUES ('rep_1', 'pl_rampa_bib', 'user_rafael', ${q("Tem uma moto estacionada bloqueando a rampa da Biblioteca à noite.")}, 'open', ${now - 2 * HOUR});`,
  );

  return lines;
}
