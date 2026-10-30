import { useEffect, useState } from "react";
import { layoutCampus, type CampusBlock, type LngLat } from "@syncfeb/core";
import { PLACE_INFO, type Place, type PlaceCategory } from "./campus";

/** Desenho do campus gerado por `scripts/fetch-campus-osm.mjs` (OpenStreetMap). */
export interface CampusGeo {
  attribution: string;
  view: { west: number; south: number; east: number; north: number };
  campus: LngLat[];
  buildings: { id: string; kind: string; levels: number | null; ring: LngLat[] }[];
  paths: { kind: string; line: LngLat[] }[];
  streets: { kind: string; name: string | null; line: LngLat[] }[];
  green: LngLat[][];
  pitches: LngLat[][];
  pools: LngLat[][];
  parking: LngLat[][];
}

let pending: Promise<CampusGeo> | null = null;

/** O desenho (~40 KB) só é baixado quando o aluno abre "Blocos" ou "3D". */
function loadCampusGeo(): Promise<CampusGeo> {
  pending ??= import("../data/campus-osm.json")
    .then((m) => m.default as unknown as CampusGeo)
    .catch((err: unknown) => {
      pending = null;
      throw err;
    });
  return pending;
}

export function useCampusGeo(enabled: boolean) {
  const [geo, setGeo] = useState<CampusGeo | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled || geo) return;
    let alive = true;
    setFailed(false);
    loadCampusGeo()
      .then((g) => alive && setGeo(g))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [enabled, geo, attempt]);
  return { geo, failed, retry: () => setAttempt((n) => n + 1) };
}

/** Cores fortes para os blocos de salas; todas com contraste AA para texto branco. */
const BLOCK_COLORS = ["#1d4ed8", "#047857", "#b45309", "#be123c", "#6d28d9", "#0e7490", "#4338ca", "#a16207"];

export interface MapBlock extends CampusBlock {
  color: string;
  /** Letra do bloco ("A" em "Bloco A"); null nos prédios de serviço, que usam o ícone. */
  letter: string | null;
}

export interface CampusScene {
  geo: CampusGeo;
  blocks: MapBlock[];
  blockById: Map<string, MapBlock>;
  blockByFootprint: Map<string, MapBlock>;
  blockByPlace: Map<string, MapBlock>;
}

export function buildScene(geo: CampusGeo, places: Place[]): CampusScene {
  const layout = layoutCampus(geo.buildings, places);
  const blockById = new Map<string, MapBlock>();
  let nextColor = 0;
  const blocks = layout.blocks.map((b) => {
    const block: MapBlock = {
      ...b,
      color:
        b.kind === "block"
          ? BLOCK_COLORS[nextColor++ % BLOCK_COLORS.length]!
          : (PLACE_INFO[b.category as PlaceCategory]?.color ?? "#475569"),
      letter: /^bloco\s+([a-z0-9]{1,3})\b/i.exec(b.name)?.[1]?.toUpperCase() ?? null,
    };
    blockById.set(b.id, block);
    return block;
  });
  const decorate = (source: Map<string, CampusBlock>) => new Map([...source].map(([key, b]) => [key, blockById.get(b.id)!]));
  return {
    geo,
    blocks,
    blockById,
    blockByFootprint: decorate(layout.blockByFootprint),
    blockByPlace: decorate(layout.blockByPlace),
  };
}

/** Marcador do tipo "Bloco" que descreve o próprio bloco (descrição e fotos). */
export function blockMarker(scene: CampusScene, block: MapBlock, places: Place[]): Place | null {
  return places.find((p) => p.category === "block" && scene.blockByPlace.get(p.id)?.id === block.id) ?? null;
}

export const NEUTRAL_BUILDING = "#cfcac1";
