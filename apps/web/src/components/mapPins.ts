import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PLACE_INFO, type PlaceCategory } from "../lib/campus";
import type { MapBlock } from "../lib/campusGeo";

const svgCache = new Map<string, string>();

/** Ícone lucide do local como SVG, para marcadores feitos de HTML (Leaflet e MapLibre). */
function placeIconSvg(category: PlaceCategory, size: number): string {
  const key = `${category}:${size}`;
  let svg = svgCache.get(key);
  if (!svg) {
    const info = PLACE_INFO[category] ?? PLACE_INFO.block;
    svg = renderToStaticMarkup(createElement(info.icon, { size, strokeWidth: 2.4, "aria-hidden": true }));
    svgCache.set(key, svg);
  }
  return svg;
}

/** Bolinha colorida com o ícone da categoria (a mesma do mapa de satélite). */
export function placePinHtml(category: PlaceCategory, size: number, selected: boolean): string {
  const info = PLACE_INFO[category] ?? PLACE_INFO.block;
  return `<div class="campus-pin${selected ? " is-selected" : ""}" style="width:${size}px;height:${size}px;background:${info.color}">${placeIconSvg(category, size * 0.55)}</div>`;
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

/** Etiqueta do bloco: letra (ou ícone do serviço) na cor do bloco e o nome ao lado. */
export function blockTagHtml(block: MapBlock, selected: boolean): string {
  const badge = block.letter ?? placeIconSvg(block.category as PlaceCategory, 13);
  const classes = ["block-tag", block.kind === "landmark" && "is-landmark", selected && "is-selected"].filter(Boolean).join(" ");
  return `<div class="${classes}" style="--c:${block.color}"><span class="block-tag-badge">${badge}</span><span class="block-tag-name">${escapeHtml(block.name)}</span></div>`;
}
