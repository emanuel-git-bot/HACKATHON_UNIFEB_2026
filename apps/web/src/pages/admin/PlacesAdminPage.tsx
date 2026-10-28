import { useState, type FormEvent } from "react";
import { MousePointerClick, Plus, Save, Trash2 } from "lucide-react";
import { CampusMap } from "../../components/CampusMap";
import { Button, Card, ErrorBox, Field, Input, PageTitle, Select, Textarea, cx } from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { CAMPUS_CENTER, PLACE_INFO, matchesSearch, placeSubtitle, type Place, type PlaceCategory } from "../../lib/campus";
import { useApi } from "../../lib/useApi";

type Draft = Omit<Place, "id"> & { id: string | null };

const blank = (): Draft => ({
  id: null,
  name: "",
  category: "classroom",
  description: "",
  building: "",
  floor: "",
  lat: CAMPUS_CENTER.lat,
  lng: CAMPUS_CENTER.lng,
  accessible: false,
  openingHours: "",
  phone: "",
});

/** Admin cadastra e posiciona os locais clicando no mapa. */
export function PlacesAdminPage() {
  const { data, error, reload } = useApi<{ places: Place[] }>("/places");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [query, setQuery] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const places = data?.places ?? [];
  const list = places.filter((p) => matchesSearch(query, p.name, p.building, PLACE_INFO[p.category]?.label));
  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setBusy(true);
    setFormError(null);
    const { id, ...body } = draft;
    try {
      await api(id ? `/places/${id}` : "/places", { method: id ? "PUT" : "POST", body });
      setDraft(null);
      await reload();
    } catch (err) {
      setFormError((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!draft?.id || !confirm(`Excluir "${draft.name}" do mapa?`)) return;
    await api(`/places/${draft.id}`, { method: "DELETE" });
    setDraft(null);
    await reload();
  }

  return (
    <div>
      <PageTitle
        title="Mapa do campus"
        subtitle="Cadastre blocos, salas, serviços e itens de acessibilidade. Clique no mapa para posicionar."
        action={
          <Button onClick={() => setDraft(blank())}>
            <Plus className="size-4" aria-hidden /> Novo local
          </Button>
        }
      />
      {error && <ErrorBox message={error.message} />}
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-2">
          <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
            <CampusMap
              places={places}
              selectedId={draft?.id ?? null}
              onSelect={(p) => setDraft({ ...p, building: p.building ?? "", floor: p.floor ?? "", openingHours: p.openingHours ?? "", phone: p.phone ?? "" })}
              onPick={draft ? (pos) => set(pos) : undefined}
              picked={draft ? { lat: draft.lat, lng: draft.lng } : null}
              className="h-[60vh] w-full"
            />
          </div>
          {draft && (
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <MousePointerClick className="size-4" aria-hidden /> Clique no mapa para mover o ponto dourado.
            </p>
          )}
        </div>

        {draft ? (
          <Card>
            <h2 className="mb-3 font-bold">{draft.id ? "Editar local" : "Novo local"}</h2>
            <form onSubmit={save} className="space-y-3">
              <Field label="Nome">
                <Input value={draft.name} onChange={(e) => set({ name: e.target.value })} required />
              </Field>
              <Field label="Tipo">
                <Select value={draft.category} onChange={(e) => set({ category: e.target.value as PlaceCategory })}>
                  {Object.entries(PLACE_INFO).map(([id, info]) => (
                    <option key={id} value={id}>
                      {info.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Bloco">
                  <Input value={draft.building ?? ""} onChange={(e) => set({ building: e.target.value })} />
                </Field>
                <Field label="Andar">
                  <Input value={draft.floor ?? ""} onChange={(e) => set({ floor: e.target.value })} />
                </Field>
              </div>
              <Field label="Descrição">
                <Textarea rows={2} value={draft.description} onChange={(e) => set({ description: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Horário">
                  <Input value={draft.openingHours ?? ""} onChange={(e) => set({ openingHours: e.target.value })} />
                </Field>
                <Field label="Telefone">
                  <Input value={draft.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} />
                </Field>
              </div>
              <label className="flex min-h-11 items-center gap-3 text-sm text-slate-700">
                <input type="checkbox" className="size-5 accent-brand-800" checked={draft.accessible} onChange={(e) => set({ accessible: e.target.checked })} />
                Local acessível (cadeirantes)
              </label>
              <p className="text-xs text-slate-500">
                Posição: {draft.lat.toFixed(5)}, {draft.lng.toFixed(5)}
              </p>
              {formError && <ErrorBox message={formError} />}
              <div className="flex gap-2">
                <Button type="submit" loading={busy} className="flex-1">
                  <Save className="size-4" aria-hidden /> Salvar
                </Button>
                <Button type="button" variant="secondary" onClick={() => setDraft(null)}>
                  Cancelar
                </Button>
                {draft.id && (
                  <Button type="button" variant="ghost" onClick={() => void remove()} aria-label="Excluir local">
                    <Trash2 className="size-4 text-red-600" aria-hidden />
                  </Button>
                )}
              </div>
            </form>
          </Card>
        ) : (
          <Card className="p-0">
            <div className="p-3">
              <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar local" aria-label="Buscar local" />
            </div>
            <ul className="max-h-[52vh] divide-y divide-slate-100 overflow-y-auto">
              {list.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => setDraft({ ...p, building: p.building ?? "", floor: p.floor ?? "", openingHours: p.openingHours ?? "", phone: p.phone ?? "" })}
                    className={cx("flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50")}
                  >
                    <span className="size-3 shrink-0 rounded-full" style={{ background: PLACE_INFO[p.category].color }} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{p.name}</span>
                      <span className="block truncate text-xs text-slate-500">{placeSubtitle(p)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
