import { createElement, useEffect, useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CAMPUS_CENTER, PLACE_INFO, type Place, type PlaceCategory } from "../lib/campus";

const SATELLITE = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const STREETS = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

const iconCache = new Map<string, L.DivIcon>();

function pinIcon(category: PlaceCategory, selected: boolean): L.DivIcon {
  const key = `${category}:${selected}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  const info = PLACE_INFO[category] ?? PLACE_INFO.block;
  const size = category === "block" ? 34 : 28;
  const svg = renderToStaticMarkup(createElement(info.icon, { size: size * 0.55, strokeWidth: 2.4, "aria-hidden": true }));
  const icon = L.divIcon({
    className: "",
    html: `<div class="campus-pin${selected ? " is-selected" : ""}" style="width:${size}px;height:${size}px;background:${info.color}">${svg}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
  iconCache.set(key, icon);
  return icon;
}

export interface CampusMapProps {
  places: Place[];
  selectedId?: string | null;
  onSelect?: (place: Place) => void;
  /** Modo de edição do admin: clique no mapa devolve a posição. */
  onPick?: (pos: { lat: number; lng: number }) => void;
  picked?: { lat: number; lng: number } | null;
  userPosition?: { lat: number; lng: number; accuracy: number } | null;
  satellite?: boolean;
  className?: string;
}

export function CampusMap({
  places,
  selectedId,
  onSelect,
  onPick,
  picked,
  userPosition,
  satellite = true,
  className,
}: CampusMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tilesRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const extrasRef = useRef<L.LayerGroup | null>(null);
  const handlersRef = useRef({ onSelect, onPick });
  handlersRef.current = { onSelect, onPick };

  // Cria o mapa uma vez.
  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, {
      center: [CAMPUS_CENTER.lat, CAMPUS_CENTER.lng],
      zoom: 18,
      maxZoom: 20,
      zoomControl: false,
      attributionControl: true,
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    extrasRef.current = L.layerGroup().addTo(map);
    map.on("click", (e: L.LeafletMouseEvent) => handlersRef.current.onPick?.({ lat: e.latlng.lat, lng: e.latlng.lng }));
    mapRef.current = map;
    // O contêiner pode mudar de tamanho depois do primeiro desenho (layout flex).
    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(containerRef.current);
    return () => {
      resize.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    tilesRef.current?.remove();
    tilesRef.current = satellite
      ? L.tileLayer(SATELLITE, { maxZoom: 20, maxNativeZoom: 18, attribution: "Imagens © Esri" })
      : L.tileLayer(STREETS, { maxZoom: 20, maxNativeZoom: 19, attribution: "© OpenStreetMap" });
    tilesRef.current.addTo(map);
  }, [satellite]);

  useEffect(() => {
    const group = markersRef.current;
    if (!group) return;
    group.clearLayers();
    for (const place of places) {
      const selected = place.id === selectedId;
      const marker = L.marker([place.lat, place.lng], {
        icon: pinIcon(place.category, selected),
        title: place.name,
        alt: place.name,
        keyboard: true,
        zIndexOffset: selected ? 1000 : place.category === "block" ? 100 : 0,
      });
      if (place.category === "block" || selected) {
        marker.bindTooltip(place.name, { permanent: true, direction: "top", offset: [0, -16], className: "campus-label" });
      }
      marker.on("click", () => handlersRef.current.onSelect?.(place));
      group.addLayer(marker);
    }
  }, [places, selectedId]);

  // Enquadra os locais visíveis sempre que o filtro muda (sem local escolhido).
  const placesKey = places.map((p) => p.id).join(",");
  useEffect(() => {
    const map = mapRef.current;
    if (!map || selectedId || places.length === 0) return;
    map.fitBounds(L.latLngBounds(places.map((p) => [p.lat, p.lng] as [number, number])), { padding: [40, 40], maxZoom: 19 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placesKey]);

  // Centraliza no local escolhido.
  useEffect(() => {
    const map = mapRef.current;
    const place = places.find((p) => p.id === selectedId);
    if (map && place) map.flyTo([place.lat, place.lng], Math.max(map.getZoom(), 19), { duration: 0.6 });
  }, [selectedId, places]);

  useEffect(() => {
    const group = extrasRef.current;
    if (!group) return;
    group.clearLayers();
    if (userPosition) {
      L.circle([userPosition.lat, userPosition.lng], {
        radius: Math.min(userPosition.accuracy, 150),
        color: "#2563eb",
        weight: 1,
        fillOpacity: 0.12,
      }).addTo(group);
      L.circleMarker([userPosition.lat, userPosition.lng], {
        radius: 8,
        color: "#fff",
        weight: 3,
        fillColor: "#2563eb",
        fillOpacity: 1,
      })
        .bindTooltip("Você está aqui", { direction: "top" })
        .addTo(group);
    }
    if (picked) {
      L.circleMarker([picked.lat, picked.lng], { radius: 10, color: "#fff", weight: 3, fillColor: "#d4a72c", fillOpacity: 1 }).addTo(group);
    }
  }, [userPosition, picked]);

  useEffect(() => {
    if (userPosition) mapRef.current?.flyTo([userPosition.lat, userPosition.lng], 19, { duration: 0.6 });
  }, [userPosition]);

  return <div ref={containerRef} className={className} role="application" aria-label="Mapa do campus do UNIFEB" />;
}
