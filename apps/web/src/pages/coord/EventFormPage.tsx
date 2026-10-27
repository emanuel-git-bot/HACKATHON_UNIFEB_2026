import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Crosshair, DoorOpen, KeyRound, LogIn, LogOut, MapPin } from "lucide-react";
import { Button, Card, ErrorBox, Field, Input, PageTitle, Select, Spinner, Textarea, cx } from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { CATEGORY_LABELS, MODE_LABELS, fromLocalInput, toLocalInput } from "../../lib/format";
import { getPosition } from "../../lib/geo";
import type { CheckinMode, EventInfo } from "../../lib/types";

const MODE_ICONS: Record<CheckinMode, typeof LogIn> = {
  entry: LogIn,
  exit: LogOut,
  entry_exit: DoorOpen,
  entry_keyword: KeyRound,
};

interface FormState {
  title: string;
  description: string;
  speaker: string;
  category: string;
  location: string;
  startsAt: string;
  endsAt: string;
  hours: string;
  lat: number | null;
  lng: number | null;
  radiusM: string;
  checkinMode: CheckinMode;
  keyword: string;
}

function defaultForm(): FormState {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  return {
    title: "",
    description: "",
    speaker: "",
    category: "palestra",
    location: "",
    startsAt: toLocalInput(start.getTime()),
    endsAt: toLocalInput(start.getTime() + 2 * 60 * 60 * 1000),
    hours: "2",
    lat: null,
    lng: null,
    radiusM: "100",
    checkinMode: "entry",
    keyword: "",
  };
}

type EventDetail = EventInfo & { lat: number | null; lng: number | null; radiusM: number; hasKeyword: boolean };

export function EventFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [loaded, setLoaded] = useState(!editing);
  const [hasKeyword, setHasKeyword] = useState(false);
  const [modeLocked, setModeLocked] = useState(false);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    api<{ event: EventDetail; counts: { attendance: number } }>(`/coord/events/${id}`)
      .then(({ event, counts }) => {
        setForm({
          title: event.title,
          description: event.description,
          speaker: event.speaker,
          category: event.category,
          location: event.location,
          startsAt: toLocalInput(event.startsAt),
          endsAt: toLocalInput(event.endsAt),
          hours: String(event.hours),
          lat: event.lat,
          lng: event.lng,
          radiusM: String(event.radiusM),
          checkinMode: event.checkinMode,
          keyword: "",
        });
        setHasKeyword(event.hasKeyword);
        setModeLocked(counts.attendance > 0);
        setLoaded(true);
      })
      .catch((err: ApiError) => setError({ message: err.message }));
  }, [id]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function useMyLocation() {
    setLocating(true);
    const gps = await getPosition(15_000);
    setLocating(false);
    if (!gps) {
      setError({ message: "Não foi possível ler a localização. Permita o acesso no navegador.", field: "lat" });
      return;
    }
    setForm((f) => ({ ...f, lat: gps.lat, lng: gps.lng }));
    setAccuracy(Math.round(gps.accuracy));
    setError(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = {
      title: form.title,
      description: form.description,
      speaker: form.speaker,
      category: form.category,
      location: form.location,
      startsAt: fromLocalInput(form.startsAt),
      endsAt: fromLocalInput(form.endsAt),
      hours: Number(form.hours.replace(",", ".")),
      lat: form.lat,
      lng: form.lng,
      radiusM: Number(form.radiusM),
      checkinMode: form.checkinMode,
      keyword: form.keyword.trim() || undefined,
    };
    try {
      const r = await api<{ event: EventInfo }>(editing ? `/coord/events/${id}` : "/coord/events", {
        method: editing ? "PUT" : "POST",
        body,
      });
      navigate(`/coord/eventos/${r.event.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? { message: err.message, field: err.data.field } : { message: "Erro ao salvar." });
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return error ? <ErrorBox message={error.message} /> : <Spinner />;
  const fieldError = (f: string) => (error?.field === f ? error.message : undefined);

  return (
    <div className="mx-auto max-w-3xl">
      <Link to={editing ? `/coord/eventos/${id}` : "/coord"} className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-slate-600">
        <ArrowLeft className="size-4" aria-hidden /> Voltar
      </Link>
      <PageTitle title={editing ? "Editar evento" : "Novo evento"} />

      <form onSubmit={submit} className="space-y-5">
        <Card className="space-y-4">
          <Field label="Título" error={fieldError("title")}>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} required />
          </Field>
          <Field label="Descrição">
            <Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Palestrante / responsável">
              <Input value={form.speaker} onChange={(e) => set("speaker", e.target.value)} />
            </Field>
            <Field label="Tipo">
              <Select value={form.category} onChange={(e) => set("category", e.target.value)}>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Início" error={fieldError("startsAt")}>
              <Input type="datetime-local" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} required />
            </Field>
            <Field label="Fim" error={fieldError("endsAt")}>
              <Input type="datetime-local" value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} required />
            </Field>
            <Field label="Horas complementares" error={fieldError("hours")}>
              <Input inputMode="decimal" value={form.hours} onChange={(e) => set("hours", e.target.value)} required />
            </Field>
          </div>
          <Field label="Local" error={fieldError("location")}>
            <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Ex.: Tribunal do Júri" required />
          </Field>
        </Card>

        <Card className="space-y-4">
          <div>
            <h2 className="flex items-center gap-2 font-bold">
              <MapPin className="size-4" aria-hidden /> Localização para a trava de distância
            </h2>
            <p className="text-sm text-slate-500">
              Faça isso de dentro do local do evento. Nenhum mapa é mostrado aos alunos.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" onClick={useMyLocation} loading={locating}>
              <Crosshair className="size-4" aria-hidden /> Usar minha localização atual
            </Button>
            {form.lat !== null ? (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
                <Check className="size-4" aria-hidden /> Local definido{accuracy !== null ? ` (precisão ±${accuracy} m)` : ""}
              </span>
            ) : (
              <span className="text-sm font-medium text-amber-700">
                Sem local: só a rede da faculdade valida a presença.
              </span>
            )}
          </div>
          {fieldError("lat") && <ErrorBox message={fieldError("lat")!} />}
          <Field label="Raio aceito (metros)" error={fieldError("radiusM")}>
            <Input type="number" min={10} max={5000} value={form.radiusM} onChange={(e) => set("radiusM", e.target.value)} className="max-w-40" />
          </Field>
        </Card>

        <Card className="space-y-4">
          <div>
            <h2 className="font-bold">Modo de check-in</h2>
            {modeLocked && <p className="text-sm text-amber-700">O modo não pode mudar: já há presenças registradas.</p>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Modo de check-in">
            {(Object.keys(MODE_LABELS) as CheckinMode[]).map((mode) => {
              const Icon = MODE_ICONS[mode];
              const selected = form.checkinMode === mode;
              return (
                <button
                  type="button"
                  key={mode}
                  role="radio"
                  aria-checked={selected}
                  disabled={modeLocked && !selected}
                  onClick={() => set("checkinMode", mode)}
                  className={cx(
                    "flex items-start gap-3 rounded-2xl p-4 text-left ring-2 transition disabled:opacity-40",
                    selected ? "bg-brand-50 ring-brand-700" : "bg-white ring-slate-200 hover:ring-slate-300",
                  )}
                >
                  <span className={cx("rounded-xl p-2", selected ? "bg-brand-800 text-white" : "bg-slate-100 text-slate-600")}>
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-semibold">{MODE_LABELS[mode].title}</span>
                    <span className="block text-sm text-slate-500">{MODE_LABELS[mode].description}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {form.checkinMode === "entry_keyword" && (
            <Field
              label="Palavra-chave"
              hint={hasKeyword ? "Deixe em branco para manter a atual. Não é mostrada aos alunos." : "Não é mostrada aos alunos. Fale no final do evento."}
              error={fieldError("keyword")}
            >
              <Input value={form.keyword} onChange={(e) => set("keyword", e.target.value)} autoComplete="off" className="max-w-xs" />
            </Field>
          )}
        </Card>

        {error && !["title", "startsAt", "endsAt", "hours", "location", "keyword", "radiusM", "lat"].includes(error.field ?? "") && (
          <ErrorBox message={error.message} />
        )}
        <div className="flex justify-end gap-3">
          <Link to={editing ? `/coord/eventos/${id}` : "/coord"}>
            <Button type="button" variant="secondary">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" loading={busy}>
            {editing ? "Salvar alterações" : "Criar evento"}
          </Button>
        </div>
      </form>
    </div>
  );
}
