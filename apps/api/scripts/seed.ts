/**
 * Gera o SQL das contas e eventos de demonstração.
 * Uso: npm run db:seed:local  (ou db:seed:remote para produção)
 * As senhas de demo estão documentadas no README.
 */
import { hashKeyword, hashPassword, randomToken } from "@syncfeb/core";

const now = Date.now();
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const q = (v: string | number | null) => (v === null ? "NULL" : typeof v === "number" ? String(v) : `'${v.replace(/'/g, "''")}'`);

const courses = [
  { id: "course_ec", name: "Engenharia de Computação" },
  { id: "course_si", name: "Sistemas de Informação" },
];

const users = [
  { id: "user_admin", role: "admin", ra: "admin", name: "Admin Master", course: null, password: "admin@sfb2026" },
  { id: "user_coord_ec", role: "coordinator", ra: "coord.ec", name: "Prof. Ana Ribeiro", course: "course_ec", password: "coord@2026" },
  { id: "user_coord_si", role: "coordinator", ra: "coord.si", name: "Prof. Carlos Mendes", course: "course_si", password: "coord@2026" },
  { id: "user_lucas", role: "student", ra: "210345", name: "Lucas Martins", course: "course_ec", password: "123456" },
  { id: "user_beatriz", role: "student", ra: "210812", name: "Beatriz Souza", course: "course_ec", password: "123456" },
  { id: "user_rafael", role: "student", ra: "220117", name: "Rafael Lima", course: "course_ec", password: "123456" },
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `user_jurado${i + 1}`,
    role: "student",
    ra: `jurado${i + 1}`,
    name: `Jurado ${i + 1}`,
    course: "course_ec",
    password: "123456",
  })),
];

const events = [
  {
    id: "evt_sesinfo",
    title: "Segurança da Informação na Prática",
    description: "Palestra da SESINFO 2026 sobre ataques reais, engenharia social e como se proteger.",
    speaker: "Equipe Vulneri",
    category: "palestra",
    location: "Tribunal do Júri",
    startsAt: now - HOUR,
    endsAt: now + 4 * DAY,
    hours: 4,
    mode: "entry_keyword",
    keyword: "cerberus",
  },
  {
    id: "evt_react",
    title: "Minicurso de React do Zero",
    description: "Monte sua primeira aplicação React com componentes, estado e rotas.",
    speaker: "Prof. Ana Ribeiro",
    category: "minicurso",
    location: "Laboratório 3",
    startsAt: now + DAY,
    endsAt: now + DAY + 4 * HOUR,
    hours: 4,
    mode: "entry_exit",
    keyword: null,
  },
  {
    id: "evt_atletica",
    title: "Torneio Interatléticas — Atlética Cerberus",
    description: "Abertura do torneio com apresentação das equipes.",
    speaker: "Atlética Cerberus",
    category: "atletica",
    location: "Ginásio",
    startsAt: now + 3 * DAY,
    endsAt: now + 3 * DAY + 3 * HOUR,
    hours: 2,
    mode: "entry",
    keyword: null,
  },
];

const lines: string[] = [
  "-- Dados de demonstração (gerado por scripts/seed.ts)",
  "DELETE FROM certificates; DELETE FROM checkin_attempts; DELETE FROM attendance; DELETE FROM scan_tickets;",
  "DELETE FROM registrations; DELETE FROM events; DELETE FROM sessions; DELETE FROM login_attempts;",
  "DELETE FROM users; DELETE FROM courses;",
];

for (const c of courses) lines.push(`INSERT INTO courses (id, name) VALUES (${q(c.id)}, ${q(c.name)});`);

for (const u of users) {
  lines.push(
    `INSERT INTO users (id, role, ra, name, course_id, password_hash, active, created_at) VALUES (${q(u.id)}, ${q(u.role)}, ${q(u.ra)}, ${q(u.name)}, ${q(u.course)}, ${q(await hashPassword(u.password))}, 1, ${now});`,
  );
}

for (const e of events) {
  const keywordHash = e.keyword ? await hashKeyword(e.id, e.keyword) : null;
  lines.push(
    `INSERT INTO events (id, course_id, coordinator_id, title, description, speaker, category, location, starts_at, ends_at, hours, lat, lng, radius_m, checkin_mode, keyword_hash, qr_secret, created_at) VALUES (${q(e.id)}, 'course_ec', 'user_coord_ec', ${q(e.title)}, ${q(e.description)}, ${q(e.speaker)}, ${q(e.category)}, ${q(e.location)}, ${e.startsAt}, ${e.endsAt}, ${e.hours}, NULL, NULL, 100, ${q(e.mode)}, ${q(keywordHash)}, ${q(randomToken())}, ${now});`,
  );
}

lines.push(
  "INSERT INTO settings (key, value) VALUES ('allowed_ips', '[]') ON CONFLICT(key) DO UPDATE SET value = excluded.value;",
);

console.log(lines.join("\n"));
