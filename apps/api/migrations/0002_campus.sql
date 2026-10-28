-- Campus FEB: certificados saem; entram mapa, grupos de estudo, avisos, recursos e acessibilidade.
DROP TABLE IF EXISTS certificates;

-- Pontos do mapa do campus (blocos, salas, serviços e itens de acessibilidade).
CREATE TABLE places (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  building TEXT,
  floor TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  accessible INTEGER NOT NULL DEFAULT 0,
  opening_hours TEXT,
  phone TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_places_category ON places(category);

CREATE TABLE study_groups (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id),
  course_id TEXT REFERENCES courses(id),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  meets_at INTEGER NOT NULL,
  place_id TEXT REFERENCES places(id),
  online_url TEXT,
  max_members INTEGER NOT NULL DEFAULT 8,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_groups_meets ON study_groups(meets_at);

CREATE TABLE study_group_members (
  group_id TEXT NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (group_id, user_id)
);

-- Avisos: course_id NULL = para todo o campus.
CREATE TABLE announcements (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES users(id),
  course_id TEXT REFERENCES courses(id),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_announcements_created ON announcements(created_at);

CREATE TABLE announcement_reads (
  announcement_id TEXT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  read_at INTEGER NOT NULL,
  PRIMARY KEY (announcement_id, user_id)
);

-- Materiais compartilhados entre alunos (resumos, links, livros para emprestar).
CREATE TABLE resources (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id),
  course_id TEXT REFERENCES courses(id),
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  url TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_resources_created ON resources(created_at);

-- Problemas de acessibilidade relatados pelos alunos (elevador parado, rampa bloqueada...).
CREATE TABLE accessibility_reports (
  id TEXT PRIMARY KEY,
  place_id TEXT REFERENCES places(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at INTEGER NOT NULL,
  resolved_at INTEGER
);
