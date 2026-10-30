/**
 * Baixa do OpenStreetMap o desenho do campus (contorno, prédios, caminhos, gramados)
 * e grava em src/data/campus-osm.json, usado pelas vistas "Blocos" e "3D" do mapa.
 *
 * Uso: node scripts/fetch-campus-osm.mjs            (baixa da Overpass API)
 *      node scripts/fetch-campus-osm.mjs raw.json   (reaproveita uma resposta salva)
 *
 * Dados © colaboradores do OpenStreetMap, licença ODbL (atribuição no mapa).
 */
import { readFileSync, writeFileSync } from "node:fs";

const CAMPUS_WAY_ID = 544219137; // "Unifeb" (amenity=university)
const BBOX = "-20.5790,-48.5665,-20.5715,-48.5580";
const PAD = 0.0012; // ~130 m de ruas em volta do campus
const OVERPASS = "https://overpass-api.de/api/interpreter";

const query = `[out:json][timeout:60];(
  way["amenity"="university"](${BBOX});
  way["building"](${BBOX});
  way["highway"](${BBOX});
  way["leisure"](${BBOX});
  way["amenity"="parking"](${BBOX});
  way["landuse"](${BBOX});
);out geom tags;`;

async function download() {
  const res = await fetch(OVERPASS, {
    method: "POST",
    body: new URLSearchParams({ data: query }),
    headers: { "User-Agent": "CampusFEB/1.0 (hackathon UNIFEB)" },
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`Overpass respondeu ${res.status}`);
  return res.json();
}

const input = process.argv[2];
const data = input ? JSON.parse(readFileSync(input, "utf8")) : await download();

const round = (v) => Math.round(v * 1e6) / 1e6;
const coords = (el) => el.geometry.map((p) => [round(p.lon), round(p.lat)]);

function inside([x, y], ring) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
const center = (ring) => [ring.reduce((s, p) => s + p[0], 0) / ring.length, ring.reduce((s, p) => s + p[1], 0) / ring.length];

const campusEl = data.elements.find((e) => e.id === CAMPUS_WAY_ID);
if (!campusEl) throw new Error("Contorno do campus não encontrado na resposta.");
const campus = coords(campusEl);

const lngs = campus.map((p) => p[0]);
const lats = campus.map((p) => p[1]);
const view = {
  west: round(Math.min(...lngs) - PAD),
  south: round(Math.min(...lats) - PAD),
  east: round(Math.max(...lngs) + PAD),
  north: round(Math.max(...lats) + PAD),
};
const inView = ([x, y]) => x >= view.west && x <= view.east && y >= view.south && y <= view.north;

const ways = data.elements.filter((e) => e.type === "way" && e.geometry && e.id !== CAMPUS_WAY_ID);
const areasInCampus = (pred) => ways.filter((e) => pred(e.tags ?? {}) && inside(center(coords(e)), campus)).map(coords);

/** Corta a linha para os trechos dentro da área visível (mantém um ponto de cada lado). */
function clip(line) {
  const parts = [];
  let current = [];
  line.forEach((p, i) => {
    const keep = inView(p) || (line[i - 1] && inView(line[i - 1])) || (line[i + 1] && inView(line[i + 1]));
    if (keep) current.push(p);
    else if (current.length) {
      if (current.length > 1) parts.push(current);
      current = [];
    }
  });
  if (current.length > 1) parts.push(current);
  return parts;
}

const CAMPUS_PATHS = new Set(["service", "footway", "path", "pedestrian", "steps"]);
const paths = [];
const streets = [];
for (const e of ways.filter((w) => w.tags?.highway)) {
  const line = coords(e);
  const onCampus = line.some((p) => inside(p, campus));
  if (onCampus && CAMPUS_PATHS.has(e.tags.highway)) {
    paths.push({ kind: e.tags.highway === "service" ? "service" : "footway", line });
  } else if (!onCampus) {
    for (const part of clip(line)) streets.push({ kind: e.tags.highway, name: e.tags.name ?? null, line: part });
  }
}

const buildings = ways
  .filter((e) => e.tags?.building && inside(center(coords(e)), campus))
  .map((e) => ({
    id: String(e.id),
    kind: e.tags.building,
    levels: e.tags["building:levels"] ? Number(e.tags["building:levels"]) : null,
    ring: coords(e),
  }));

const out = {
  attribution: "© colaboradores do OpenStreetMap",
  fetchedAt: new Date().toISOString().slice(0, 10),
  view,
  campus,
  buildings,
  paths,
  streets,
  green: areasInCampus((t) => t.landuse === "grass" || t.leisure === "park" || t.leisure === "garden"),
  pitches: areasInCampus((t) => t.leisure === "pitch"),
  pools: areasInCampus((t) => t.leisure === "swimming_pool"),
  parking: areasInCampus((t) => t.amenity === "parking"),
};

const target = new URL("../src/data/campus-osm.json", import.meta.url);
writeFileSync(target, JSON.stringify(out));
console.log(
  `campus-osm.json: ${buildings.length} prédios, ${paths.length} caminhos, ${streets.length} trechos de rua, ${out.green.length} gramados`,
);
