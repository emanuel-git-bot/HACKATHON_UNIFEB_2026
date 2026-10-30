import { useEffect, useRef, useState } from "react";
import { Map as MapLibre, Marker, NavigationControl, setWorkerUrl, type MapOptions } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { Box, Pause, RotateCw, Square } from "lucide-react";
import { ringAreaM2, type LngLat } from "@syncfeb/core";
import { SATELLITE_TILES, type Place } from "../lib/campus";
import { NEUTRAL_BUILDING, type CampusGeo, type CampusScene, type MapBlock } from "../lib/campusGeo";
import { blockTagHtml, placePinHtml } from "./mapPins";
import type { BlocksMapProps } from "./BlocksMap";

// O Vite copia o worker do MapLibre para /assets; sem isso o mapa procura o arquivo no lugar errado.
setWorkerUrl(workerUrl);

type StyleSpec = Exclude<MapOptions["style"], string | undefined>;

const PITCH_3D = 60;
const LEVEL_HEIGHT_M = 3.6;
const SELECTED_COLOR = "#facc15";

/** Altura estimada: andares informados nos locais ou, sem isso, pelo tamanho do prédio. */
function buildingHeight(b: CampusGeo["buildings"][number], block: MapBlock | undefined): number {
  if (b.kind === "carport") return 3;
  const area = ringAreaM2(b.ring);
  if (area < 40) return 3;
  const levels = b.levels ?? block?.levels ?? (block?.kind === "block" || area > 500 ? 2 : 1);
  return levels * LEVEL_HEIGHT_M + 1;
}

/** Mistura a cor com branco (telhado um pouco mais claro que as paredes). */
function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix((n >> 16) & 255)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}

const closeRing = (ring: LngLat[]) => {
  const first = ring[0]!;
  const last = ring[ring.length - 1]!;
  return first[0] === last[0] && first[1] === last[1] ? ring : [...ring, first];
};

function buildingsGeoJson(scene: CampusScene) {
  return {
    type: "FeatureCollection" as const,
    features: scene.geo.buildings.map((b) => {
      const block = scene.blockByFootprint.get(b.id);
      const color = block?.color ?? NEUTRAL_BUILDING;
      return {
        type: "Feature" as const,
        properties: { blockId: block?.id ?? "", color, roof: lighten(color, block ? 0.35 : 0.5), height: buildingHeight(b, block) },
        geometry: { type: "Polygon" as const, coordinates: [closeRing(b.ring)] },
      };
    }),
  };
}

function createStyle(scene: CampusScene): StyleSpec {
  return {
    version: 8,
    sources: {
      satellite: { type: "raster", tiles: [SATELLITE_TILES], tileSize: 256, maxzoom: 18, attribution: "Imagens © Esri" },
      campus: {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: closeRing(scene.geo.campus) } },
      },
      buildings: { type: "geojson", data: buildingsGeoJson(scene), attribution: `Prédios ${scene.geo.attribution}` },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": "#d9e2d3" } },
      { id: "satellite", type: "raster", source: "satellite", paint: { "raster-saturation": -0.2, "raster-contrast": 0.05 } },
      { id: "campus", type: "line", source: "campus", paint: { "line-color": "#fde68a", "line-width": 2, "line-dasharray": [2, 2] } },
      {
        id: "buildings",
        type: "fill-extrusion",
        source: "buildings",
        paint: {
          "fill-extrusion-color": ["get", "color"],
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-base": 0,
          "fill-extrusion-opacity": 0.93,
        },
      },
      {
        id: "roofs",
        type: "fill-extrusion",
        source: "buildings",
        paint: {
          "fill-extrusion-color": ["get", "roof"],
          "fill-extrusion-base": ["get", "height"],
          "fill-extrusion-height": ["+", ["get", "height"], 0.4],
          "fill-extrusion-opacity": 0.93,
        },
      },
    ],
    sky: {
      "sky-color": "#7cc4f5",
      "horizon-color": "#e3f1fb",
      "fog-color": "#e9eef2",
      "sky-horizon-blend": 0.6,
      "horizon-fog-blend": 0.4,
      "fog-ground-blend": 0.8,
      "atmosphere-blend": 0.8,
    },
    light: { anchor: "viewport", color: "#ffffff", intensity: 0.32, position: [1.2, 200, 40] },
  };
}

const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("a11y-reduce-motion");

function element(html: string, onClick: () => void, label: string): HTMLElement {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "maplibre-html-marker";
  el.setAttribute("aria-label", label);
  el.innerHTML = html;
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick();
  });
  return el;
}

/** Vista "3D": maquete dos prédios sobre o satélite, com giro e inclinação. */
export default function Campus3DMap({
  scene,
  places,
  selectedPlaceId,
  selectedBlockId,
  onSelectPlace,
  onSelectBlock,
  userPosition,
  className,
}: BlocksMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibre | null>(null);
  const tagMarkers = useRef<Marker[]>([]);
  const placeMarkers = useRef<Marker[]>([]);
  const userMarker = useRef<Marker | null>(null);
  const spinRef = useRef<number | null>(null);
  const handlersRef = useRef({ onSelectPlace, onSelectBlock });
  handlersRef.current = { onSelectPlace, onSelectBlock };
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [tilted, setTilted] = useState(true);

  const activeBlockId = selectedBlockId ?? (selectedPlaceId ? (scene.blockByPlace.get(selectedPlaceId)?.id ?? null) : null);

  useEffect(() => {
    if (!containerRef.current) return;
    const { view } = scene.geo;
    // Começa de cima, enquadrando os blocos; depois inclina para a maquete.
    const lngs = scene.blocks.map((b) => b.labelAt.lng);
    const lats = scene.blocks.map((b) => b.labelAt.lat);
    const start: [[number, number], [number, number]] = lngs.length
      ? [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ]
      : [
          [view.west, view.south],
          [view.east, view.north],
        ];
    let map: MapLibre;
    try {
      map = new MapLibre({
        container: containerRef.current,
        style: createStyle(scene),
        bounds: start,
        fitBoundsOptions: { padding: 40 },
        maxBounds: [
          [view.west - 0.004, view.south - 0.004],
          [view.east + 0.004, view.north + 0.004],
        ],
        minZoom: 15,
        maxZoom: 20.5,
        maxPitch: 70,
        attributionControl: { compact: true },
      });
    } catch {
      setFailed(true);
      return;
    }
    map.addControl(new NavigationControl({ visualizePitch: true }), "bottom-right");
    // Pronto assim que o estilo carrega; as imagens de satélite chegam depois, sem travar a maquete.
    let started = false;
    const start3d = () => {
      if (started) return;
      started = true;
      setReady(true);
      // Entrada de cima para a maquete inclinada (sem animação para quem pediu menos movimento).
      const camera = { zoom: map.getZoom() + 0.3, pitch: PITCH_3D, bearing: -28 };
      if (prefersReducedMotion()) map.jumpTo(camera);
      else map.easeTo({ ...camera, duration: 2000 });
    };
    map.once("style.load", start3d);
    if (map.isStyleLoaded()) start3d();
    // Afastado, as etiquetas mostram só a letra/ícone (a mesma regra da vista Blocos).
    const zoomClass = () => {
      const z = map.getZoom();
      containerRef.current?.classList.toggle("zoom-far", z < 17);
      containerRef.current?.classList.toggle("zoom-mid", z >= 17 && z < 18);
    };
    map.on("zoom", zoomClass);
    zoomClass();
    map.on("click", "buildings", (e) => {
      const blockId = e.features?.[0]?.properties?.blockId;
      if (typeof blockId === "string" && blockId) handlersRef.current.onSelectBlock(blockId);
    });
    map.on("mouseenter", "buildings", () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", "buildings", () => (map.getCanvas().style.cursor = ""));
    map.on("pitchend", () => setTilted(map.getPitch() > 10));
    // Qualquer toque do aluno para o giro automático.
    const stopSpin = () => setSpinning(false);
    containerRef.current.addEventListener("pointerdown", stopSpin);
    map.on("webglcontextlost", () => setFailed(true));
    mapRef.current = map;
    const container = containerRef.current;
    const resize = new ResizeObserver(() => map.resize());
    resize.observe(container);
    return () => {
      resize.disconnect();
      container.removeEventListener("pointerdown", stopSpin);
      map.remove();
      mapRef.current = null;
    };
    // O mapa é criado uma única vez; a cena muda pelos efeitos abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Locais renomeados pelo admin mudam cor e nome dos prédios.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource("buildings");
    if (source && "setData" in source && typeof source.setData === "function") source.setData(buildingsGeoJson(scene));
  }, [scene, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    // Prédios sem nome têm blockId "", então "nenhum selecionado" usa um valor que nenhum id de bloco tem.
    const active = activeBlockId ?? "(nenhum)";
    map.setPaintProperty("buildings", "fill-extrusion-color", ["case", ["==", ["get", "blockId"], active], SELECTED_COLOR, ["get", "color"]]);
    map.setPaintProperty("roofs", "fill-extrusion-color", ["case", ["==", ["get", "blockId"], active], "#fde68a", ["get", "roof"]]);
    for (const m of tagMarkers.current) m.remove();
    tagMarkers.current = scene.blocks.map((block) =>
      new Marker({ element: element(blockTagHtml(block, block.id === activeBlockId), () => handlersRef.current.onSelectBlock(block.id), block.name) })
        .setLngLat([block.labelAt.lng, block.labelAt.lat])
        .addTo(map),
    );
  }, [scene, activeBlockId, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    for (const m of placeMarkers.current) m.remove();
    placeMarkers.current = places
      .filter((p) => p.category !== "block")
      .map((place: Place) => {
        const selected = place.id === selectedPlaceId;
        const marker = new Marker({
          element: element(placePinHtml(place.category, selected ? 32 : 22, selected), () => handlersRef.current.onSelectPlace(place), place.name),
        }).setLngLat([place.lng, place.lat]);
        if (selected) marker.getElement().style.zIndex = "5";
        return marker.addTo(map);
      });
  }, [places, selectedPlaceId, ready]);

  useEffect(() => {
    const map = mapRef.current;
    const place = places.find((p) => p.id === selectedPlaceId);
    if (!map || !ready || !place) return;
    setSpinning(false);
    map.flyTo({ center: [place.lng, place.lat], zoom: Math.max(map.getZoom(), 18.3), duration: 900 });
  }, [selectedPlaceId, places, ready]);

  useEffect(() => {
    const map = mapRef.current;
    const block = selectedBlockId ? scene.blockById.get(selectedBlockId) : undefined;
    if (!map || !ready || !block || selectedPlaceId) return;
    setSpinning(false);
    map.flyTo({ center: [block.labelAt.lng, block.labelAt.lat], zoom: Math.max(map.getZoom(), 18), duration: 900 });
  }, [selectedBlockId, selectedPlaceId, scene, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    userMarker.current?.remove();
    userMarker.current = null;
    if (!userPosition) return;
    const dot = document.createElement("div");
    dot.className = "user-dot";
    dot.title = "Você está aqui";
    userMarker.current = new Marker({ element: dot }).setLngLat([userPosition.lng, userPosition.lat]).addTo(map);
    map.flyTo({ center: [userPosition.lng, userPosition.lat], zoom: 18.5, duration: 900 });
  }, [userPosition, ready]);

  // Giro 360° automático (botão "Girar").
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !spinning) return;
    let last = performance.now();
    const step = (now: number) => {
      map.setBearing(map.getBearing() + (now - last) * 0.006);
      last = now;
      spinRef.current = requestAnimationFrame(step);
    };
    spinRef.current = requestAnimationFrame(step);
    return () => {
      if (spinRef.current !== null) cancelAnimationFrame(spinRef.current);
    };
  }, [spinning]);

  function toggleTilt() {
    const map = mapRef.current;
    if (!map) return;
    const next = !tilted;
    setTilted(next);
    map.easeTo({ pitch: next ? PITCH_3D : 0, duration: prefersReducedMotion() ? 0 : 700 });
  }

  if (failed) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 p-6 text-center text-sm text-slate-600 ${className ?? ""}`}>
        Este aparelho não conseguiu abrir o 3D. Use as vistas Mapa ou Blocos.
      </div>
    );
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      {/* h-full em vez de absolute: o CSS do MapLibre força position: relative no contêiner. */}
      <div ref={containerRef} className="h-full w-full" role="application" aria-label="Maquete 3D do campus do UNIFEB" />
      {ready && (
        <div className="absolute right-2 top-2 z-10 flex flex-col gap-2">
          <button
            onClick={() => setSpinning((s) => !s)}
            aria-pressed={spinning}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-semibold text-slate-800 shadow ring-1 ring-slate-300"
          >
            {spinning ? <Pause className="size-4" aria-hidden /> : <RotateCw className="size-4" aria-hidden />}
            {spinning ? "Parar" : "Girar"}
          </button>
          <button
            onClick={toggleTilt}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-semibold text-slate-800 shadow ring-1 ring-slate-300"
          >
            {tilted ? <Square className="size-4" aria-hidden /> : <Box className="size-4" aria-hidden />}
            {tilted ? "De cima" : "Inclinar"}
          </button>
        </div>
      )}
      {!ready && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-100/70 text-sm font-medium text-slate-600">
          Montando a maquete 3D...
        </div>
      )}
    </div>
  );
}
