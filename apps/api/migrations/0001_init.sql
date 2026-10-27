-- Esquema inicial do SyncFEB. Datas em epoch ms (INTEGER).

CREATE TABLE courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('student', 'coordinator', 'admin')),
  ra TEXT NOT NULL UNIQUE, -- RA do aluno ou login do coordenador/admin
  name TEXT NOT NULL,
  course_id TEXT REFERENCES courses(id),
  password_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);

CREATE TABLE login_attempts (
  ra TEXT NOT NULL,
  attempted_at INTEGER NOT NULL,
  success INTEGER NOT NULL
);
CREATE INDEX login_attempts_ra ON login_attempts(ra, attempted_at);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id),
  coordinator_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  speaker TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'palestra',
  location TEXT NOT NULL,
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  hours REAL NOT NULL,
  lat REAL,
  lng REAL,
  radius_m INTEGER NOT NULL DEFAULT 100,
  checkin_mode TEXT NOT NULL CHECK (checkin_mode IN ('entry', 'exit', 'entry_exit', 'entry_keyword')),
  keyword_hash TEXT,
  qr_secret TEXT NOT NULL,
  entry_open INTEGER NOT NULL DEFAULT 0,
  exit_open INTEGER NOT NULL DEFAULT 0,
  allowed_ips TEXT, -- JSON; quando NULL usa a configuração global
  created_at INTEGER NOT NULL
);
CREATE INDEX events_course ON events(course_id, starts_at);

CREATE TABLE registrations (
  event_id TEXT NOT NULL REFERENCES events(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (event_id, user_id)
);

CREATE TABLE scan_tickets (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id),
  phase TEXT NOT NULL CHECK (phase IN ('entry', 'exit')),
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);

CREATE TABLE attendance (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  device_token TEXT NOT NULL,
  entry_at INTEGER,
  exit_at INTEGER,
  keyword_ok INTEGER NOT NULL DEFAULT 0,
  keyword_tries INTEGER NOT NULL DEFAULT 0,
  suspect_reason TEXT,
  review TEXT NOT NULL DEFAULT 'pending' CHECK (review IN ('pending', 'confirmed', 'rejected')),
  status TEXT NOT NULL CHECK (status IN ('incomplete', 'suspect', 'completed', 'rejected')),
  origin TEXT NOT NULL DEFAULT 'qr' CHECK (origin IN ('qr', 'manual')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (event_id, user_id),
  UNIQUE (event_id, device_token)
);
CREATE INDEX attendance_event_status ON attendance(event_id, status);

CREATE TABLE checkin_attempts (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  user_id TEXT,
  device_token TEXT,
  ip TEXT,
  phase TEXT,
  result TEXT NOT NULL CHECK (result IN ('accepted', 'suspect', 'rejected')),
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX checkin_attempts_event ON checkin_attempts(event_id, created_at);

CREATE TABLE certificates (
  id TEXT PRIMARY KEY,
  attendance_id TEXT NOT NULL UNIQUE REFERENCES attendance(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  event_id TEXT NOT NULL REFERENCES events(id),
  hours REAL NOT NULL,
  verification_code TEXT NOT NULL UNIQUE,
  issued_at INTEGER NOT NULL
);
CREATE INDEX certificates_user ON certificates(user_id);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
