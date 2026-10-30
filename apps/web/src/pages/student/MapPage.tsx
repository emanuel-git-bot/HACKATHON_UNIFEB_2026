import { Suspense, lazy, useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Accessibility,
  Blocks,
  Box,
  ChevronRight,
  Clock,
  Layers,
  LocateFixed,
  Map as MapIcon,
  Navigation,
  Phone,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import { floorNumber } from "@syncfeb/core";
import { BlocksMap } from "../../components/BlocksMap";
import { CampusMap } from "../../components/CampusMap";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { PlacePhotos } from "../../components/PlacePhotos";
import { Badge, Button, ErrorBox, cx } from "../../components/ui";
import {
  MAP_FILTERS,
  PLACE_INFO,
  isAccessibilityPlace,
  matchesSearch,
  placeSubtitle,
  walkingRouteUrl,
  type Place,
  type PlaceCategory,
} from "../../lib/campus";
import { blockMarker, buildScene, useCampusGeo, type CampusScene, type MapBlock } from "../../lib/campusGeo";
import { getPosition, type GpsReading } from "../../lib/geo";
import { useApi } from "../../lib/useApi";

// O 3D (MapLibre, ~1 MB) só é baixado quando o aluno escolhe essa vista.
const Campus3DMap = lazy(() => import("../../components/Campus3DMap"));

type MapView = "mapa" | "blocos" | "3d";

const VIEWS: { id: MapView; label: string; icon: LucideIcon }[] = [
  { id: "mapa", label: "Mapa", icon: MapIcon },
  { id: "blocos", label: "Blocos", icon: Blocks },
  { id: "3d", label: "3D", icon: Box },
];

const VIEW_KEY = "campus.mapView";
const MAP_SIZE = "h-[52vh] min-h-72 w-full";

function savedView(): MapView {
  try {
    return VIEWS.find((v) => v.id === localStorage.getItem(VIEW_KEY))?.id ?? "mapa";
  } catch {
    return "mapa";
  }
}

/** Mapa do campus. `publicMode` = aberto sem login (link da tela de entrada). */
export function MapPage({ publicMode = false }: { publicMode?: boolean }) {
  const [params, setParams] = useSearchParams();
  const { data, error } = useApi<{ places: Place[] }>("/places");
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [filter, setFilter] = useState(params.get("filtro") ?? "all");
  const [satellite, setSatellite] = useState(true);
  const [me, setMe] = useState<GpsReading | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const view = VIEWS.find((v) => v.id === params.get("vista"))?.id ?? savedView();
  const selectedId = params.get("local");
  const selectedBlockId = params.get("bloco");

  const places = useMemo(() => data?.places ?? [], [data]);
  const active = MAP_FILTERS.find((f) => f.id === filter) ?? MAP_FILTERS[0]!;
  const visible = useMemo(
    () =>
      places.filter(
        (p) => active.match(p) && matchesSearch(query, p.name, p.building, p.description, PLACE_INFO[p.category]?.label),
      ),
    [places, active, query],
  );
  const selected = places.find((p) => p.id === selectedId) ?? null;
  // Com busca ativa, o primeiro resultado já aparece destacado.
  const highlighted = selected ?? (query.trim() && visible.length > 0 ? visible[0]! : null);

  const campusGeo = useCampusGeo(view !== "mapa" || selectedBlockId !== null);
  const scene = useMemo(() => (campusGeo.geo && data ? buildScene(campusGeo.geo, places) : null), [campusGeo.geo, data, places]);
  const selectedBlock = (selectedBlockId && scene?.blockById.get(selectedBlockId)) || null;

  function update(change: (next: URLSearchParams) => void) {
    const next = new URLSearchParams(params);
    change(next);
    setParams(next, { replace: true });
  }

  function select(place: Place | null) {
    update((next) => {
      if (place) next.set("local", place.id);
      else next.delete("local");
      // Um local de fora do bloco aberto fecha a ficha do bloco.
      if (place && selectedBlockId && scene?.blockByPlace.get(place.id)?.id !== selectedBlockId) next.delete("bloco");
    });
  }

  function selectBlock(blockId: string | null) {
    update((next) => {
      next.delete("local");
      if (blockId) next.set("bloco", blockId);
      else next.delete("bloco");
    });
  }

  function clearSelection() {
    update((next) => {
      next.delete("local");
      next.delete("bloco");
    });
  }

  function chooseView(id: MapView) {
    try {
      localStorage.setItem(VIEW_KEY, id);
    } catch {
      /* sem storage: vale só a URL */
    }
    update((next) => {
      if (id === "mapa") next.delete("vista");
      else next.set("vista", id);
    });
  }

  async function locate() {
    setLocating(true);
    setLocateError(null);
    const pos = await getPosition();
    setLocating(false);
    if (pos) setMe(pos);
    else setLocateError("Não conseguimos sua localização. Permita o acesso ao GPS no navegador.");
  }

  // Nas vistas desenhadas, sem filtro nem busca, cada bloco já representa o que tem dentro.
  const drawnPlaces =
    scene && filter === "all" && !query.trim()
      ? visible.filter((p) => !scene.blockByPlace.has(p.id) || p.id === highlighted?.id)
      : visible;
  const drawnProps = scene && {
    scene,
    places: drawnPlaces,
    selectedPlaceId: highlighted?.id ?? null,
    selectedBlockId: selectedBlock?.id ?? null,
    onSelectPlace: select,
    onSelectBlock: selectBlock,
    userPosition: me,
    className: MAP_SIZE,
  };

  return (
    <div className={cx("space-y-3", publicMode && "mx-auto max-w-2xl px-4 py-4")}>
      {!publicMode && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mapa do campus</h1>
          <p className="text-sm text-slate-500">Ache sua sala, serviços e rotas acessíveis.</p>
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            clearSelection();
          }}
          placeholder="Buscar sala, bloco ou serviço (ex.: A12, biblioteca)"
          aria-label="Buscar no mapa"
          className="block min-h-12 w-full rounded-2xl border-0 bg-white pl-10 pr-10 text-base text-slate-900 shadow-sm ring-1 ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-600 focus:outline-none"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
            aria-label="Limpar busca"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Filtrar locais">
        {MAP_FILTERS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => {
              setFilter(f.id);
              clearSelection();
            }}
            className={cx(
              "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold ring-1 transition",
              filter === f.id ? "bg-brand-800 text-white ring-brand-800" : "bg-white text-slate-700 ring-slate-300",
            )}
          >
            {f.id === "a11y" && <Accessibility className="size-4" aria-hidden />}
            {f.label}
          </button>
        ))}
      </div>

      {error && <ErrorBox message={error.message} />}

      <div className="flex gap-1 rounded-2xl bg-slate-200/70 p-1" role="group" aria-label="Tipo de mapa">
        {VIEWS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => chooseView(id)}
            aria-pressed={view === id}
            className={cx(
              "inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition",
              view === id ? "bg-white text-brand-900 shadow-sm" : "text-slate-600 hover:text-slate-900",
            )}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </button>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-2xl shadow-sm ring-1 ring-slate-200">
        {view === "mapa" ? (
          <CampusMap
            places={visible}
            selectedId={highlighted?.id ?? null}
            onSelect={select}
            userPosition={me}
            satellite={satellite}
            className={MAP_SIZE}
          />
        ) : !drawnProps ? (
          <MapPlaceholder>
            {campusGeo.failed ? (
              <>
                Não deu para carregar o desenho do campus.{" "}
                <button onClick={campusGeo.retry} className="font-semibold text-brand-700 underline">
                  Tentar de novo
                </button>
              </>
            ) : (
              "Desenhando o campus..."
            )}
          </MapPlaceholder>
        ) : view === "blocos" ? (
          <BlocksMap {...drawnProps} />
        ) : (
          <ErrorBoundary fallback={<MapPlaceholder>Sem conexão para abrir o 3D. Use Mapa ou Blocos e tente mais tarde.</MapPlaceholder>}>
            <Suspense fallback={<MapPlaceholder>Montando a maquete 3D...</MapPlaceholder>}>
              <Campus3DMap {...drawnProps} />
            </Suspense>
          </ErrorBoundary>
        )}
        <div className="absolute left-2 top-2 z-[500] flex flex-col gap-2">
          <button
            onClick={() => void locate()}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-semibold text-slate-800 shadow ring-1 ring-slate-300"
          >
            <LocateFixed className={cx("size-4", locating && "animate-pulse")} aria-hidden />
            {locating ? "Localizando..." : "Onde estou"}
          </button>
          {view === "mapa" && (
            <button
              onClick={() => setSatellite((s) => !s)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-semibold text-slate-800 shadow ring-1 ring-slate-300"
              aria-pressed={satellite}
            >
              <Layers className="size-4" aria-hidden /> {satellite ? "Ruas" : "Satélite"}
            </button>
          )}
        </div>
      </div>
      {view !== "mapa" && scene && (
        <BlockLegend blocks={scene.blocks} selectedId={selectedBlock?.id ?? null} onSelect={(id) => selectBlock(id === selectedBlock?.id ? null : id)} />
      )}
      {locateError && <ErrorBox message={locateError} />}

      {highlighted ? (
        <PlaceDetails place={highlighted} publicMode={publicMode} onClose={() => select(null)} />
      ) : (
        selectedBlock &&
        scene && <BlockDetails block={selectedBlock} scene={scene} places={places} onSelectPlace={select} onClose={() => selectBlock(null)} />
      )}

      <section aria-label="Lista de locais">
        <p className="mb-2 text-sm font-medium text-slate-500">
          {visible.length} {visible.length === 1 ? "local" : "locais"}
        </p>
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          {visible.map((p) => {
            const info = PLACE_INFO[p.category];
            const Icon = info.icon;
            return (
              <li key={p.id}>
                <button
                  onClick={() => {
                    select(p);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={cx(
                    "flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50",
                    p.id === highlighted?.id && "bg-gold-50",
                  )}
                >
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ background: info.color }}
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-slate-900">{p.name}</span>
                    <span className="block truncate text-xs text-slate-500">{placeSubtitle(p)}</span>
                  </span>
                  {isAccessibilityPlace(p) && <Accessibility className="size-4 shrink-0 text-sky-700" aria-label="Acessível" />}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

/** Legenda das cores, que também serve para abrir um bloco sem precisar acertar o desenho. */
function BlockLegend({ blocks, selectedId, onSelect }: { blocks: MapBlock[]; selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Blocos e prédios do campus">
      {blocks.map((b) => {
        const Icon = PLACE_INFO[b.category as PlaceCategory]?.icon ?? Blocks;
        return (
          <button
            key={b.id}
            onClick={() => onSelect(b.id)}
            aria-pressed={b.id === selectedId}
            className={cx(
              "inline-flex min-h-10 max-w-60 shrink-0 items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 text-sm font-semibold text-slate-800 ring-1 transition",
              b.id === selectedId ? "ring-2 ring-gold-500" : "ring-slate-300",
            )}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white" style={{ background: b.color }} aria-hidden>
              {b.letter ?? <Icon className="size-3.5" />}
            </span>
            <span className="truncate">{b.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function MapPlaceholder({ children }: { children: ReactNode }) {
  return <div className={cx("flex items-center justify-center bg-slate-100 p-6 text-center text-sm text-slate-600", MAP_SIZE)}>{children}</div>;
}

function PlaceDetails({ place, publicMode, onClose }: { place: Place; publicMode: boolean; onClose: () => void }) {
  const info = PLACE_INFO[place.category];
  const Icon = info.icon;
  return (
    <article className="animate-result rounded-2xl bg-white p-4 shadow-md ring-1 ring-slate-200" aria-live="polite">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: info.color }}>
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold leading-snug">{place.name}</h2>
          <p className="text-sm text-slate-500">{placeSubtitle(place)}</p>
        </div>
        <button onClick={onClose} className="flex size-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100" aria-label="Fechar">
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <PlacePhotos photos={place.photos} placeName={place.name} />
      {isAccessibilityPlace(place) && (
        <div className="mt-2">
          <Badge tone="brand">
            <Accessibility className="size-3.5" aria-hidden /> Acessível
          </Badge>
        </div>
      )}
      {place.description && <p className="mt-3 text-sm text-slate-700">{place.description}</p>}
      <div className="mt-3 space-y-1.5 text-sm text-slate-600">
        {place.openingHours && (
          <p className="flex items-center gap-2">
            <Clock className="size-4 text-slate-400" aria-hidden /> {place.openingHours}
          </p>
        )}
        {place.phone && (
          <a href={`tel:+55${place.phone.replace(/\D/g, "")}`} className="flex w-fit items-center gap-2 font-medium text-brand-700 hover:underline">
            <Phone className="size-4" aria-hidden /> {place.phone}
          </a>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <a href={walkingRouteUrl(place)} target="_blank" rel="noreferrer" className="flex-1">
          <Button className="w-full">
            <Navigation className="size-4" aria-hidden /> Como chegar
          </Button>
        </a>
        {!publicMode && (
          <Link to={`/acessibilidade?local=${place.id}#relatar`} className="flex-1">
            <Button variant="secondary" className="w-full">
              <Accessibility className="size-4" aria-hidden /> Relatar problema
            </Button>
          </Link>
        )}
      </div>
    </article>
  );
}

function levelsLabel(levels: number | null): string | null {
  if (levels === null) return null;
  if (levels === 1) return "Só térreo";
  return `Térreo + ${levels - 1} ${levels === 2 ? "andar" : "andares"}`;
}

/** Ficha do bloco tocado nas vistas Blocos e 3D: o que tem dentro, andar por andar. */
function BlockDetails({
  block,
  scene,
  places,
  onSelectPlace,
  onClose,
}: {
  block: MapBlock;
  scene: CampusScene;
  places: Place[];
  onSelectPlace: (place: Place) => void;
  onClose: () => void;
}) {
  const marker = blockMarker(scene, block, places);
  const inside = block.placeIds
    .map((id) => places.find((p) => p.id === id))
    .filter((p): p is Place => p !== undefined)
    .sort((a, b) => (floorNumber(a.floor) ?? 99) - (floorNumber(b.floor) ?? 99) || a.name.localeCompare(b.name, "pt-BR", { numeric: true }));
  const BadgeIcon = PLACE_INFO[block.category as PlaceCategory]?.icon ?? Blocks;
  const subtitle =
    block.kind === "block"
      ? [`${inside.length} ${inside.length === 1 ? "local" : "locais"}`, levelsLabel(block.levels)].filter(Boolean).join(" · ")
      : PLACE_INFO[block.category as PlaceCategory]?.label;

  return (
    <article className="animate-result rounded-2xl bg-white p-4 shadow-md ring-1 ring-slate-200" aria-live="polite">
      <div className="flex items-start gap-3">
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-lg font-extrabold text-white"
          style={{ background: block.color }}
          aria-hidden
        >
          {block.letter ?? <BadgeIcon className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold leading-snug">{block.name}</h2>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        <button onClick={onClose} className="flex size-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100" aria-label="Fechar">
          <X className="size-4" aria-hidden />
        </button>
      </div>
      {marker && <PlacePhotos photos={marker.photos} placeName={block.name} />}
      {marker?.description && <p className="mt-3 text-sm text-slate-700">{marker.description}</p>}

      {inside.length > 0 ? (
        <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl ring-1 ring-slate-200">
          {inside.map((p) => {
            const info = PLACE_INFO[p.category];
            const Icon = info.icon;
            return (
              <li key={p.id}>
                <button onClick={() => onSelectPlace(p)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full text-white" style={{ background: info.color }}>
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">{p.name}</span>
                    <span className="block truncate text-xs text-slate-500">{[info.label, p.floor].filter(Boolean).join(" · ")}</span>
                  </span>
                  {isAccessibilityPlace(p) && <Accessibility className="size-4 shrink-0 text-sky-700" aria-label="Acessível" />}
                  <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        !marker?.description && <p className="mt-3 text-sm text-slate-500">Ainda não há salas ou serviços cadastrados neste prédio.</p>
      )}

      <a href={walkingRouteUrl(block.labelAt)} target="_blank" rel="noreferrer" className="mt-4 block">
        <Button className="w-full">
          <Navigation className="size-4" aria-hidden /> Como chegar
        </Button>
      </a>
    </article>
  );
}
