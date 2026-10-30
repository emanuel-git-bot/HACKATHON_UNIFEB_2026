-- Fotos opcionais dos locais do mapa. Os arquivos ficam no KV (binding PHOTOS);
-- aqui ficam os dados para listar, contar e apagar.
CREATE TABLE place_photos (
  id TEXT PRIMARY KEY,
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  caption TEXT,
  width INTEGER,
  height INTEGER,
  size_bytes INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_place_photos_place ON place_photos (place_id, created_at);
