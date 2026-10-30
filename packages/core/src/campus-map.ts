/**
 * Mapa de blocos: liga os contornos dos prédios (OpenStreetMap) aos locais cadastrados.
 * O nome de cada prédio vem dos locais que estão dentro dele, então corrigir um local
 * no Admin → Mapa também corrige as vistas "Blocos" e "3D".
 */
import { searchKey } from "./campus";

/** [longitude, latitude], na mesma ordem do GeoJSON. */
export type LngLat = [number, number];

export interface Footprint {
  id: string;
  ring: LngLat[];
}

export interface LayoutPlace {
  id: string;
  name: string;
  category: string;
  building: string | null;
  floor: string | null;
  lat: number;
  lng: number;
}

export interface CampusBlock {
  id: string;
  name: string;
  /** "block" = bloco de salas (Bloco A...); "landmark" = prédio de um serviço (Biblioteca, Teatro...). */
  kind: "block" | "landmark";
  /** Categoria do local que dá nome ao prédio (cor e ícone). */
  category: string;
  footprintIds: string[];
  /** Locais dentro do bloco, sem o próprio marcador do bloco. */
  placeIds: string[];
  labelAt: { lat: number; lng: number };
  /** Andares informados nos locais (só térreo = 1); null quando nenhum local diz o andar. */
  levels: number | null;
}

export interface CampusLayout {
  blocks: CampusBlock[];
  /** Prédios sem nenhum local por perto ficam fora deste mapa. */
  blockByFootprint: Map<string, CampusBlock>;
  blockByPlace: Map<string, CampusBlock>;
}

/** Locais ao ar livre: não pertencem a prédio nenhum. */
const OUTDOOR = new Set(["parking", "accessible_parking", "sports"]);
/** Ficam dentro de um prédio, mas não dão nome a ele. */
const NEVER_NAMES_A_BUILDING = new Set(["restroom", "accessible_restroom", "ramp"]);
const METERS_PER_DEGREE = 111_320;

export function pointInRing([x, y]: LngLat, ring: LngLat[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Projeção plana em metros a partir de `origin`; precisa o bastante na escala de um campus. */
function projector(origin: LngLat) {
  const kx = METERS_PER_DEGREE * Math.cos((origin[1] * Math.PI) / 180);
  return ([x, y]: LngLat): LngLat => [(x - origin[0]) * kx, (y - origin[1]) * METERS_PER_DEGREE];
}

function distanceToSegment([px, py]: LngLat, [ax, ay]: LngLat, [bx, by]: LngLat): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** 0 quando o ponto está dentro do prédio; senão a distância em metros até a parede mais próxima. */
export function distanceToRingMeters(point: LngLat, ring: LngLat[]): number {
  if (pointInRing(point, ring)) return 0;
  const project = projector(point);
  let best = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    best = Math.min(best, distanceToSegment([0, 0], project(ring[j]!), project(ring[i]!)));
  }
  return best;
}

export function ringAreaM2(ring: LngLat[]): number {
  if (ring.length < 3) return 0;
  const project = projector(ring[0]!);
  let twice = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = project(ring[i]!);
    const [xj, yj] = project(ring[j]!);
    twice += xj * yi - xi * yj;
  }
  return Math.abs(twice / 2);
}

/** Centro de massa do contorno (cai dentro de prédios retangulares e em "L" simples). */
export function ringCentroid(ring: LngLat[]): LngLat {
  // Conta a partir do primeiro vértice: com coordenadas absolutas a precisão se perde.
  const [ox, oy] = ring[0]!;
  let twice = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]![0] - ox;
    const yi = ring[i]![1] - oy;
    const xj = ring[j]![0] - ox;
    const yj = ring[j]![1] - oy;
    const cross = xj * yi - xi * yj;
    twice += cross;
    cx += (xj + xi) * cross;
    cy += (yj + yi) * cross;
  }
  if (Math.abs(twice) < 1e-18) {
    return [ring.reduce((s, p) => s + p[0], 0) / ring.length, ring.reduce((s, p) => s + p[1], 0) / ring.length];
  }
  return [ox + cx / (3 * twice), oy + cy / (3 * twice)];
}

/** "Térreo" → 0, "2º andar" → 2; null quando o texto não diz o andar. */
export function floorNumber(floor: string | null): number | null {
  if (!floor) return null;
  const key = searchKey(floor);
  if (/^terreo\b/.test(key)) return 0;
  const match = key.match(/(\d+)\s*[º°o]?\s*andar/);
  return match ? Number(match[1]) : null;
}

/** Identificador estável do bloco a partir do nome ("Bloco C — Informática" → "bloco-c-informatica"). */
export function blockId(name: string): string {
  return searchKey(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function mostCommon(values: string[]): string | null {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: string | null = null;
  for (const [value, count] of counts) if (best === null || count > counts.get(best)!) best = value;
  return best;
}

interface BuildingName {
  name: string;
  kind: CampusBlock["kind"];
  category: string;
  /** Marcador do tipo "Bloco" que dá nome e posição ao rótulo. */
  marker: LayoutPlace | null;
}

function nameBuilding(footprint: Footprint, inside: LayoutPlace[]): BuildingName | null {
  const marker = inside.find((p) => p.category === "block");
  if (marker) return { name: marker.name, kind: "block", category: "block", marker };
  const building = mostCommon(inside.map((p) => p.building?.trim() ?? "").filter(Boolean));
  if (building) return { name: building, kind: "block", category: "block", marker: null };
  const candidates = inside.filter((p) => !NEVER_NAMES_A_BUILDING.has(p.category));
  if (candidates.length === 0) return null;
  const [cx, cy] = ringCentroid(footprint.ring);
  const closest = candidates.reduce((a, b) =>
    Math.hypot(a.lng - cx, a.lat - cy) <= Math.hypot(b.lng - cx, b.lat - cy) ? a : b,
  );
  return { name: closest.name, kind: "landmark", category: closest.category, marker: null };
}

/**
 * Dá nome aos prédios e agrupa os que formam um mesmo bloco.
 * Cada local vai para o prédio que o contém ou para o mais próximo até `snapMeters`;
 * um local com o campo "bloco" preenchido entra nesse bloco mesmo fora do desenho.
 */
export function layoutCampus(footprints: Footprint[], places: LayoutPlace[], snapMeters = 15): CampusLayout {
  const placesByFootprint = new Map<string, LayoutPlace[]>(footprints.map((f) => [f.id, []]));
  const footprintOfPlace = new Map<string, string>();
  for (const place of places) {
    if (OUTDOOR.has(place.category)) continue;
    const point: LngLat = [place.lng, place.lat];
    let best: string | null = null;
    let bestDistance = snapMeters;
    for (const f of footprints) {
      const d = distanceToRingMeters(point, f.ring);
      if (d <= bestDistance) {
        best = f.id;
        bestDistance = d;
        if (d === 0) break;
      }
    }
    if (best) {
      placesByFootprint.get(best)!.push(place);
      footprintOfPlace.set(place.id, best);
    }
  }

  const groups = new Map<string, { name: BuildingName; footprints: Footprint[] }>();
  for (const f of footprints) {
    const name = nameBuilding(f, placesByFootprint.get(f.id)!);
    if (!name) continue;
    const id = blockId(name.name);
    const group = groups.get(id);
    if (!group) groups.set(id, { name, footprints: [f] });
    else {
      group.footprints.push(f);
      if (!group.name.marker && name.marker) group.name = name;
    }
  }

  const blocks: CampusBlock[] = [...groups].map(([id, { name, footprints: fps }]) => {
    const largest = fps.reduce((a, b) => (ringAreaM2(b.ring) > ringAreaM2(a.ring) ? b : a));
    const [lng, lat] = ringCentroid(largest.ring);
    return {
      id,
      name: name.name,
      kind: name.kind,
      category: name.category,
      footprintIds: fps.map((f) => f.id),
      placeIds: [],
      labelAt: name.marker ? { lat: name.marker.lat, lng: name.marker.lng } : { lat, lng },
      levels: null,
    };
  });

  const byId = new Map(blocks.map((b) => [b.id, b]));
  const blockByFootprint = new Map<string, CampusBlock>();
  for (const b of blocks) for (const f of b.footprintIds) blockByFootprint.set(f, b);

  const blockByPlace = new Map<string, CampusBlock>();
  for (const place of places) {
    const footprint = footprintOfPlace.get(place.id);
    const block =
      (place.building ? byId.get(blockId(place.building)) : undefined) ??
      (footprint ? blockByFootprint.get(footprint) : undefined);
    if (!block) continue;
    blockByPlace.set(place.id, block);
    if (place.category === "block") continue;
    block.placeIds.push(place.id);
    const floor = floorNumber(place.floor);
    if (floor !== null) block.levels = Math.max(block.levels ?? 1, floor + 1);
  }

  blocks.sort((a, b) =>
    a.kind === b.kind ? a.name.localeCompare(b.name, "pt-BR", { numeric: true }) : a.kind === "block" ? -1 : 1,
  );
  return { blocks, blockByFootprint, blockByPlace };
}
