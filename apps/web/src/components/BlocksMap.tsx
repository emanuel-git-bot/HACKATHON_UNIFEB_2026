import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LngLat } from "@syncfeb/core";
import type { Place } from "../lib/campus";
import { NEUTRAL_BUILDING, type CampusScene, type MapBlock } from "../lib/campusGeo";
import { pinIcon } from "./CampusMap";
import { blockTagHtml } from "./mapPins";

const toLatLng = (ring: LngLat[]) => ring.map(([lng, lat]) => [lat, lng] as [number, number]);

const SELECTED_STROKE = "#e8c25a";

function blockStyle(block: MapBlock, selected: boolean): L.PathOptions {
  return {
    color: selected ? SELECTED_STROKE : block.color,
    weight: selected ? 4 : 1.5,
    fillColor: block.color,
    fillOpacity: block.kind === "block" ? (selected ? 0.95 : 0.82) : selected ? 0.75 : 0.5,
    className: "block-shape",
  };
}

export interface BlocksMapProps {
  scene: CampusScene;
  /** Locais que passam no filtro e na busca. */
  places: Place[];
  selectedPlaceId: string | null;
  selectedBlockId: string | null;
  onSelectPlace: (place: Place) => void;
  onSelectBlock: (blockId: string) => void;
  userPosition?: { lat: number; lng: number; accuracy: number } | null;
  className?: string;
}

/** Vista "Blocos": o campus desenhado como num GPS, com cada bloco numa cor. Não depende de imagens. */
export function BlocksMap({
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
  const mapRef = useRef<L.Map | null>(null);
  const baseRef = useRef<L.LayerGroup | null>(null);
  const shapesRef = useRef(new Map<string, L.Polygon[]>());
  const tagsRef = useRef<L.LayerGroup | null>(null);
  const pinsRef = useRef<L.LayerGroup | null>(null);
  const extrasRef = useRef<L.LayerGroup | null>(null);
  const handlersRef = useRef({ onSelectPlace, onSelectBlock });
  handlersRef.current = { onSelectPlace, onSelectBlock };

  // Cria o mapa uma vez, sem camada de imagens: o fundo é o próprio desenho.
  useEffect(() => {
    if (!containerRef.current) return;
    const { view } = scene.geo;
    const bounds = L.latLngBounds([view.south, view.west], [view.north, view.east]);
    const map = L.map(containerRef.current, {
      zoomControl: false,
      zoomSnap: 0.25,
      minZoom: 15.5,
      maxZoom: 21,
      maxBounds: bounds.pad(0.2),
      maxBoundsViscosity: 0.8,
    });
    map.attributionControl.addAttribution(`Desenho ${scene.geo.attribution}`);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    map.createPane("blockTags").style.zIndex = "550";
    baseRef.current = L.layerGroup().addTo(map);
    tagsRef.current = L.layerGroup().addTo(map);
    pinsRef.current = L.layerGroup().addTo(map);
    extrasRef.current = L.layerGroup().addTo(map);

    const labelled = scene.blocks.map((b) => [b.labelAt.lat, b.labelAt.lng] as [number, number]);
    // Folga lateral maior: as etiquetas dos blocos das pontas não podem ficar cortadas.
    map.fitBounds(labelled.length ? L.latLngBounds(labelled) : bounds, { padding: [64, 32], maxZoom: 18 });

    const zoomClass = () => {
      const z = map.getZoom();
      containerRef.current?.classList.toggle("zoom-far", z < 17);
      containerRef.current?.classList.toggle("zoom-mid", z >= 17 && z < 18);
    };
    map.on("zoomend", zoomClass);
    zoomClass();
    mapRef.current = map;
    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(containerRef.current);
    return () => {
      resize.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // O desenho do campus é estático; o mapa é criado uma única vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Desenho do campus e dos prédios (refeito quando os locais mudam o nome dos blocos).
  useEffect(() => {
    const base = baseRef.current;
    if (!base) return;
    base.clearLayers();
    shapesRef.current.clear();
    const { geo } = scene;
    const quiet = { interactive: false } as const;

    for (const s of geo.streets) {
      const major = s.kind === "secondary" || s.kind === "tertiary" || s.kind.endsWith("_link");
      L.polyline(toLatLng(s.line), { ...quiet, color: "#d6d3cd", weight: major ? 11 : 8, lineCap: "round" }).addTo(base);
    }
    for (const s of geo.streets) {
      const major = s.kind === "secondary" || s.kind === "tertiary" || s.kind.endsWith("_link");
      L.polyline(toLatLng(s.line), { ...quiet, color: "#ffffff", weight: major ? 8 : 5, lineCap: "round" }).addTo(base);
    }
    L.polygon(toLatLng(geo.campus), { ...quiet, color: "#c9bfa9", weight: 2, dashArray: "6 6", fillColor: "#f4efe3", fillOpacity: 1 }).addTo(base);
    for (const ring of geo.green) L.polygon(toLatLng(ring), { ...quiet, stroke: false, fillColor: "#cfe6c2", fillOpacity: 1 }).addTo(base);
    for (const ring of geo.pitches) L.polygon(toLatLng(ring), { ...quiet, color: "#ffffff", weight: 2, fillColor: "#8fcf86", fillOpacity: 1 }).addTo(base);
    for (const ring of geo.pools) L.polygon(toLatLng(ring), { ...quiet, color: "#ffffff", weight: 1, fillColor: "#8ccdf0", fillOpacity: 1 }).addTo(base);
    for (const ring of geo.parking) L.polygon(toLatLng(ring), { ...quiet, stroke: false, fillColor: "#e2e0db", fillOpacity: 1 }).addTo(base);
    for (const p of geo.paths) {
      if (p.kind === "service") {
        L.polyline(toLatLng(p.line), { ...quiet, color: "#e4ddd0", weight: 7, lineCap: "round" }).addTo(base);
        L.polyline(toLatLng(p.line), { ...quiet, color: "#ffffff", weight: 4, lineCap: "round" }).addTo(base);
      } else {
        L.polyline(toLatLng(p.line), { ...quiet, color: "#a8a29e", weight: 2, dashArray: "3 5" }).addTo(base);
      }
    }

    for (const b of geo.buildings) {
      const block = scene.blockByFootprint.get(b.id);
      if (!block) {
        L.polygon(toLatLng(b.ring), { ...quiet, color: "#b7b0a4", weight: 1, fillColor: NEUTRAL_BUILDING, fillOpacity: 1, className: "block-shape" }).addTo(base);
        continue;
      }
      const shape = L.polygon(toLatLng(b.ring), blockStyle(block, false));
      shape.on("click", () => handlersRef.current.onSelectBlock(block.id));
      shape.addTo(base);
      shapesRef.current.set(block.id, [...(shapesRef.current.get(block.id) ?? []), shape]);
    }
  }, [scene]);

  // Bloco em destaque: o escolhido ou o do local escolhido.
  const activeBlockId = selectedBlockId ?? (selectedPlaceId ? (scene.blockByPlace.get(selectedPlaceId)?.id ?? null) : null);

  useEffect(() => {
    for (const [id, shapes] of shapesRef.current) {
      const block = scene.blockById.get(id);
      if (!block) continue;
      for (const s of shapes) {
        s.setStyle(blockStyle(block, id === activeBlockId));
        if (id === activeBlockId) s.bringToFront();
      }
    }
    const tags = tagsRef.current;
    if (!tags) return;
    tags.clearLayers();
    for (const block of scene.blocks) {
      const tag = L.marker([block.labelAt.lat, block.labelAt.lng], {
        pane: "blockTags",
        icon: L.divIcon({ className: "block-tag-anchor", html: blockTagHtml(block, block.id === activeBlockId), iconSize: [0, 0] }),
        title: block.name,
        alt: block.name,
        keyboard: true,
        riseOnHover: true,
      });
      tag.on("click", () => handlersRef.current.onSelectBlock(block.id));
      tags.addLayer(tag);
    }
  }, [scene, activeBlockId]);

  // Locais filtrados: pinos pequenos; o escolhido ganha o pino grande com o nome.
  useEffect(() => {
    const pins = pinsRef.current;
    if (!pins) return;
    pins.clearLayers();
    for (const place of places) {
      if (place.category === "block") continue;
      const selected = place.id === selectedPlaceId;
      const marker = L.marker([place.lat, place.lng], {
        icon: pinIcon(place.category, selected, selected ? 32 : 22),
        title: place.name,
        alt: place.name,
        keyboard: true,
        zIndexOffset: selected ? 1000 : 0,
      });
      if (selected) marker.bindTooltip(place.name, { permanent: true, direction: "top", offset: [0, -18], className: "campus-label" });
      marker.on("click", () => handlersRef.current.onSelectPlace(place));
      pins.addLayer(marker);
    }
  }, [places, selectedPlaceId]);

  useEffect(() => {
    const map = mapRef.current;
    const place = places.find((p) => p.id === selectedPlaceId);
    if (map && place) map.flyTo([place.lat, place.lng], Math.max(map.getZoom(), 19), { duration: 0.6 });
  }, [selectedPlaceId, places]);

  useEffect(() => {
    const map = mapRef.current;
    const shapes = selectedBlockId ? shapesRef.current.get(selectedBlockId) : undefined;
    if (!map || !shapes?.length || selectedPlaceId) return;
    // Zoom 18 no máximo: o bloco aparece com os vizinhos em volta, para o aluno se situar.
    map.flyToBounds(L.featureGroup(shapes).getBounds(), { padding: [48, 48], maxZoom: 18, duration: 0.6 });
  }, [selectedBlockId, selectedPlaceId, scene]);

  useEffect(() => {
    const extras = extrasRef.current;
    if (!extras) return;
    extras.clearLayers();
    if (!userPosition) return;
    L.circle([userPosition.lat, userPosition.lng], { radius: Math.min(userPosition.accuracy, 150), color: "#2563eb", weight: 1, fillOpacity: 0.12 }).addTo(extras);
    L.circleMarker([userPosition.lat, userPosition.lng], { radius: 8, color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 })
      .bindTooltip("Você está aqui", { direction: "top" })
      .addTo(extras);
    mapRef.current?.flyTo([userPosition.lat, userPosition.lng], 19, { duration: 0.6 });
  }, [userPosition]);

  return <div ref={containerRef} className={`blocks-map ${className ?? ""}`} role="application" aria-label="Mapa de blocos do campus do UNIFEB" />;
}
