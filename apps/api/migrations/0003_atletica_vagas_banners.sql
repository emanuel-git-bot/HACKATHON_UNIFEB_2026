-- Atlética (papel "organizer"), jogos com confirmação de presença, vagas nos avisos e banners do site.

-- O SQLite não altera CHECK: recria a tabela de usuários com o papel novo (receita da documentação do D1).
-- As chaves estrangeiras das outras tabelas só são conferidas no fim, quando "users" já existe de novo.
PRAGMA defer_foreign_keys = true;
CREATE TABLE users_new (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('student', 'coordinator', 'admin', 'organizer')),
  ra TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  course_id TEXT REFERENCES courses(id),
  password_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
INSERT INTO users_new (id, role, ra, name, course_id, password_hash, active, created_at)
  SELECT id, role, ra, name, course_id, password_hash, active, created_at FROM users;
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;
PRAGMA defer_foreign_keys = false;

-- Eventos da Atlética: sem horas complementares, só confirmação de presença.
CREATE TABLE social_events (
  id TEXT PRIMARY KEY,
  organizer_id TEXT NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  starts_at INTEGER NOT NULL,
  place_id TEXT REFERENCES places(id),
  location TEXT NOT NULL,
  capacity INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_social_events_starts ON social_events(starts_at);

CREATE TABLE social_event_rsvps (
  event_id TEXT NOT NULL REFERENCES social_events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (event_id, user_id)
);

-- Vagas de estágio e emprego publicadas como aviso.
ALTER TABLE announcements ADD COLUMN company TEXT;
ALTER TABLE announcements ADD COLUMN link_url TEXT;
ALTER TABLE announcements ADD COLUMN deadline_at INTEGER;
UPDATE announcements SET category = 'internship' WHERE category = 'opportunity';

-- Banners do carrossel do site do UNIFEB (copiados periodicamente).
CREATE TABLE site_banners (
  position INTEGER PRIMARY KEY,
  image_url TEXT NOT NULL,
  link_url TEXT
);
