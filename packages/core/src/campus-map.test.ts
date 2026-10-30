import { describe, expect, it } from "vitest";
import {
  blockId,
  distanceToRingMeters,
  floorNumber,
  layoutCampus,
  pointInRing,
  ringAreaM2,
  ringCentroid,
  type LayoutPlace,
  type LngLat,
} from "./campus-map";

// Perto do campus: 1 m ≈ 0,000009° de latitude e ≈ 0,0000096° de longitude.
const LAT = -20.574;
const LNG = -48.561;
const M_LAT = 1 / 111_320;
const M_LNG = 1 / (111_320 * Math.cos((LAT * Math.PI) / 180));

/** Quadrado de `size` metros com o canto sudoeste a (east, north) metros do ponto base. */
function square(east: number, north: number, size: number): LngLat[] {
  const x = LNG + east * M_LNG;
  const y = LAT + north * M_LAT;
  return [
    [x, y],
    [x + size * M_LNG, y],
    [x + size * M_LNG, y + size * M_LAT],
    [x, y + size * M_LAT],
  ];
}

/** Local a (east, north) metros do ponto base. */
function place(id: string, east: number, north: number, extra: Partial<LayoutPlace> = {}): LayoutPlace {
  return { id, name: id, category: "classroom", building: null, floor: null, lng: LNG + east * M_LNG, lat: LAT + north * M_LAT, ...extra };
}

describe("geometria dos prédios", () => {
  const ring = square(0, 0, 20);

  it("sabe se o ponto está dentro do prédio", () => {
    expect(pointInRing([LNG + 10 * M_LNG, LAT + 10 * M_LAT], ring)).toBe(true);
    expect(pointInRing([LNG + 30 * M_LNG, LAT + 10 * M_LAT], ring)).toBe(false);
  });

  it("mede a distância até a parede em metros", () => {
    expect(distanceToRingMeters([LNG + 10 * M_LNG, LAT + 10 * M_LAT], ring)).toBe(0);
    expect(distanceToRingMeters([LNG + 30 * M_LNG, LAT + 10 * M_LAT], ring)).toBeCloseTo(10, 0);
  });

  it("calcula área e centro", () => {
    expect(ringAreaM2(ring)).toBeCloseTo(400, -1);
    const [cx, cy] = ringCentroid(ring);
    expect(cx).toBeCloseTo(LNG + 10 * M_LNG, 7);
    expect(cy).toBeCloseTo(LAT + 10 * M_LAT, 7);
  });
});

describe("andares e nomes", () => {
  it("entende o andar escrito pelo admin", () => {
    expect(floorNumber("Térreo")).toBe(0);
    expect(floorNumber("1º andar")).toBe(1);
    expect(floorNumber("2° Andar")).toBe(2);
    expect(floorNumber("Todos os andares")).toBeNull();
    expect(floorNumber(null)).toBeNull();
  });

  it("gera um identificador sem acentos", () => {
    expect(blockId("Bloco C — Informática")).toBe("bloco-c-informatica");
  });
});

describe("mapa de blocos", () => {
  const footprints = [
    { id: "a1", ring: square(0, 0, 30) },
    { id: "a2", ring: square(40, 0, 10) },
    { id: "bib", ring: square(0, 60, 25) },
    { id: "vazio", ring: square(100, 100, 10) },
  ];
  const places = [
    place("bloco_a", 15, 15, { name: "Bloco A", category: "block" }),
    place("a21", 5, 5, { building: "Bloco A", floor: "2º andar" }),
    place("a_anexo", 45, 5, { building: "Bloco A", floor: "Térreo" }),
    place("a_longe", 200, 200, { building: "Bloco A" }),
    place("biblioteca", 12, 72, { name: "Biblioteca", category: "library" }),
    place("wc_bib", 3, 63, { category: "restroom" }),
    place("rampa_bib", 12, 57, { category: "ramp" }),
    place("estac", 15, 32, { category: "parking" }),
  ];
  const layout = layoutCampus(footprints, places);
  const blockA = layout.blocks.find((b) => b.id === "bloco-a")!;
  const library = layout.blocks.find((b) => b.id === "biblioteca")!;

  it("junta os prédios de um mesmo bloco", () => {
    expect(layout.blocks.map((b) => b.name)).toEqual(["Bloco A", "Biblioteca"]);
    expect(blockA.footprintIds).toEqual(["a1", "a2"]);
    expect(blockA.kind).toBe("block");
  });

  it("põe o rótulo no marcador do bloco e conta os andares", () => {
    expect(blockA.labelAt).toEqual({ lat: places[0]!.lat, lng: places[0]!.lng });
    expect(blockA.levels).toBe(3);
  });

  it("lista os locais pelo campo bloco, mesmo fora do desenho", () => {
    expect(blockA.placeIds).toEqual(["a21", "a_anexo", "a_longe"]);
    expect(layout.blockByPlace.get("bloco_a")).toBe(blockA);
  });

  it("dá ao prédio o nome do serviço, sem usar banheiro ou rampa", () => {
    expect(library.kind).toBe("landmark");
    expect(library.category).toBe("library");
    expect(library.placeIds).toEqual(["biblioteca", "wc_bib", "rampa_bib"]);
  });

  it("deixa de fora o estacionamento e o prédio sem locais", () => {
    expect(layout.blockByPlace.has("estac")).toBe(false);
    expect(layout.blockByFootprint.has("vazio")).toBe(false);
  });

  it("só encosta no prédio o local que está a poucos metros", () => {
    const near = layoutCampus([{ id: "x", ring: square(0, 0, 10) }], [place("perto", 18, 5, { name: "Cantina", category: "food" })]);
    const far = layoutCampus([{ id: "x", ring: square(0, 0, 10) }], [place("longe", 40, 5, { name: "Cantina", category: "food" })]);
    expect(near.blocks.map((b) => b.name)).toEqual(["Cantina"]);
    expect(far.blocks).toEqual([]);
  });
});
