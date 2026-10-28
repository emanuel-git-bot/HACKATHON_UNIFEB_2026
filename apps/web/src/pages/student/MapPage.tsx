import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Accessibility, Clock, Layers, LocateFixed, Navigation, Phone, Search, X } from "lucide-react";
import { CampusMap } from "../../components/CampusMap";
import { Badge, Button, ErrorBox, cx } from "../../components/ui";
import {
  MAP_FILTERS,
  PLACE_INFO,
  isAccessibilityPlace,
  matchesSearch,
  placeSubtitle,
  walkingRouteUrl,
  type Place,
} from "../../lib/campus";
import { getPosition, type GpsReading } from "../../lib/geo";
import { useApi } from "../../lib/useApi";

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
  const selectedId = params.get("local");

  const places = data?.places ?? [];
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

  function select(place: Place | null) {
    const next = new URLSearchParams(params);
    if (place) next.set("local", place.id);
    else next.delete("local");
    setParams(next, { replace: true });
  }

  async function locate() {
    setLocating(true);
    setLocateError(null);
    const pos = await getPosition();
    setLocating(false);
    if (pos) setMe(pos);
    else setLocateError("Não conseguimos sua localização. Permita o acesso ao GPS no navegador.");
  }

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
            select(null);
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
              select(null);
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

      <div className="relative overflow-hidden rounded-2xl shadow-sm ring-1 ring-slate-200">
        <CampusMap
          places={visible}
          selectedId={highlighted?.id ?? null}
          onSelect={select}
          userPosition={me}
          satellite={satellite}
          className="h-[52vh] min-h-72 w-full"
        />
        <div className="absolute left-2 top-2 z-[500] flex flex-col gap-2">
          <button
            onClick={() => void locate()}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-semibold text-slate-800 shadow ring-1 ring-slate-300"
          >
            <LocateFixed className={cx("size-4", locating && "animate-pulse")} aria-hidden />
            {locating ? "Localizando..." : "Onde estou"}
          </button>
          <button
            onClick={() => setSatellite((s) => !s)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-semibold text-slate-800 shadow ring-1 ring-slate-300"
            aria-pressed={satellite}
          >
            <Layers className="size-4" aria-hidden /> {satellite ? "Ruas" : "Satélite"}
          </button>
        </div>
      </div>
      {locateError && <ErrorBox message={locateError} />}

      {highlighted && <PlaceDetails place={highlighted} publicMode={publicMode} onClose={() => select(null)} />}

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
