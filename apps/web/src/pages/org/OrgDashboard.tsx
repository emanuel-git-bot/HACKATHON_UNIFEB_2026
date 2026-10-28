import { useState, type FormEvent } from "react";
import { Check, Copy, Pencil, Plus, Share2, Trash2, Users, X } from "lucide-react";
import { socialWhen } from "../../components/SocialEventCard";
import { Badge, Button, Card, EmptyState, ErrorBox, Field, Input, PageTitle, Select, Spinner, Textarea } from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { SOCIAL_KIND_INFO, confirmUrl, whatsappShareUrl, type Place, type SocialEvent, type SocialEventKind } from "../../lib/campus";
import { fromLocalInput, toLocalInput } from "../../lib/format";
import { useApi } from "../../lib/useApi";

/** Painel da Atlética: jogos e festas com confirmação de presença e link para os grupos de WhatsApp. */
export function OrgDashboard() {
  const { data, error, loading, reload } = useApi<{ events: SocialEvent[] }>("/social-events/mine");
  const [editing, setEditing] = useState<SocialEvent | "new" | null>(null);
  const upcoming = (data?.events ?? []).filter((e) => e.startsAt > Date.now() - 4 * 60 * 60 * 1000).reverse();
  const past = (data?.events ?? []).filter((e) => e.startsAt <= Date.now() - 4 * 60 * 60 * 1000);

  async function remove(e: SocialEvent) {
    if (!confirm(`Excluir "${e.title}"? Quem confirmou deixa de ver o evento.`)) return;
    await api(`/social-events/${e.id}`, { method: "DELETE" });
    await reload();
  }

  return (
    <div>
      <PageTitle
        title="Eventos da Atlética"
        subtitle="Jogos e encontros com confirmação de presença. Não valem horas complementares."
        action={
          editing === null && (
            <Button onClick={() => setEditing("new")}>
              <Plus className="size-4" aria-hidden /> Novo evento
            </Button>
          )
        }
      />

      {editing !== null && (
        <div className="mb-6">
          <EventForm
            event={editing === "new" ? null : editing}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              void reload();
            }}
          />
        </div>
      )}

      {loading && <Spinner />}
      {error && <ErrorBox message={error.message} />}
      {data && upcoming.length === 0 && editing === null && (
        <EmptyState icon={<Users className="size-8" />} title="Nenhum evento marcado">
          Crie um jogo e mande o link nos grupos de WhatsApp da turma.
        </EmptyState>
      )}
      <ul className="grid gap-4 lg:grid-cols-2">
        {upcoming.map((e) => (
          <OrgEventItem key={e.id} event={e} onEdit={() => setEditing(e)} onDelete={() => void remove(e)} />
        ))}
      </ul>

      {past.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-slate-600">Já aconteceram</h2>
          <ul className="grid gap-4 lg:grid-cols-2">
            {past.map((e) => (
              <OrgEventItem key={e.id} event={e} onDelete={() => void remove(e)} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function OrgEventItem({ event, onEdit, onDelete }: { event: SocialEvent; onEdit?: () => void; onDelete: () => void }) {
  const [showList, setShowList] = useState(false);
  const [copied, setCopied] = useState(false);
  const rsvps = useApi<{ rsvps: { name: string; ra: string; courseName: string | null }[] }>(showList ? `/social-events/${event.id}/rsvps` : null);
  const info = SOCIAL_KIND_INFO[event.kind];

  async function copy() {
    try {
      await navigator.clipboard.writeText(confirmUrl(event));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt("Copie o link:", confirmUrl(event));
    }
  }

  return (
    <li className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="mb-1 flex items-center gap-2">
        <Badge tone="amber">
          <span aria-hidden>{info.emoji}</span> {info.label}
        </Badge>
        <span className="ml-auto text-sm text-slate-500">{socialWhen(event)}</span>
      </div>
      <h3 className="text-lg font-bold">{event.title}</h3>
      <p className="text-sm text-slate-600">{event.location}</p>
      <p className="mt-3 text-3xl font-extrabold text-brand-900">
        {event.confirmed}
        <span className="text-base font-semibold text-slate-500">
          {" "}
          confirmado{event.confirmed === 1 ? "" : "s"}
          {event.capacity ? ` de ${event.capacity} vagas` : ""}
        </span>
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <a href={whatsappShareUrl(event, socialWhen(event))} target="_blank" rel="noreferrer">
          <Button variant="success" className="w-full">
            <Share2 className="size-4" aria-hidden /> Mandar no WhatsApp
          </Button>
        </a>
        <Button variant="secondary" onClick={() => void copy()}>
          {copied ? <Check className="size-4 text-emerald-600" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? "Link copiado" : "Copiar link"}
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button variant="ghost" onClick={() => setShowList((s) => !s)}>
          <Users className="size-4" aria-hidden /> {showList ? "Esconder lista" : "Quem confirmou"}
        </Button>
        {onEdit && (
          <Button variant="ghost" onClick={onEdit}>
            <Pencil className="size-4" aria-hidden /> Editar
          </Button>
        )}
        <Button variant="ghost" onClick={onDelete} aria-label={`Excluir ${event.title}`}>
          <Trash2 className="size-4 text-red-600" aria-hidden />
        </Button>
      </div>

      {showList && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3">
          {rsvps.loading && <Spinner />}
          {rsvps.data && rsvps.data.rsvps.length === 0 && <p className="text-sm text-slate-500">Ninguém confirmou ainda.</p>}
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {rsvps.data?.rsvps.map((r) => (
              <li key={r.ra}>
                <span className="font-semibold">{r.name}</span> <span className="text-slate-500">· RA {r.ra}{r.courseName ? ` · ${r.courseName}` : ""}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </li>
  );
}

function EventForm({ event, onCancel, onSaved }: { event: SocialEvent | null; onCancel: () => void; onSaved: () => void }) {
  const places = useApi<{ places: Place[] }>("/places");
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  tomorrow.setHours(19, 0, 0, 0);
  const [form, setForm] = useState({
    kind: (event?.kind ?? "futsal") as SocialEventKind,
    title: event?.title ?? "",
    description: event?.description ?? "",
    startsAt: toLocalInput(event?.startsAt ?? tomorrow.getTime()),
    placeId: event ? (event.placeId ?? "") : "pl_quadra",
    location: event && !event.placeId ? event.location : "",
    capacity: event?.capacity ? String(event.capacity) : "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(event ? `/social-events/${event.id}` : "/social-events", {
        method: event ? "PUT" : "POST",
        body: {
          kind: form.kind,
          title: form.title,
          description: form.description,
          startsAt: fromLocalInput(form.startsAt),
          placeId: form.placeId || null,
          location: form.placeId ? null : form.location,
          capacity: form.capacity ? Number(form.capacity) : null,
        },
      });
      onSaved();
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold">{event ? "Editar evento" : "Novo evento"}</h2>
        <button onClick={onCancel} className="flex size-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100" aria-label="Fechar">
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <Field label="Modalidade">
          <Select value={form.kind} onChange={(e) => set({ kind: e.target.value as SocialEventKind })}>
            {Object.entries(SOCIAL_KIND_INFO).map(([id, info]) => (
              <option key={id} value={id}>
                {info.emoji} {info.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Nome do evento">
          <Input value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Ex.: Futsal: Engenharia x Sistemas" required />
        </Field>
        <Field label="Data e hora">
          <Input type="datetime-local" value={form.startsAt} onChange={(e) => set({ startsAt: e.target.value })} required />
        </Field>
        <Field label="Vagas" hint="Deixe vazio para não limitar.">
          <Input type="number" min={2} value={form.capacity} onChange={(e) => set({ capacity: e.target.value })} />
        </Field>
        <Field label="Onde">
          <Select value={form.placeId} onChange={(e) => set({ placeId: e.target.value })}>
            {places.data?.places.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value="">Outro lugar (fora do mapa)</option>
          </Select>
        </Field>
        {!form.placeId && (
          <Field label="Endereço ou nome do lugar">
            <Input value={form.location} onChange={(e) => set({ location: e.target.value })} placeholder="Ex.: Ginásio Municipal" required />
          </Field>
        )}
        <div className="sm:col-span-2">
          <Field label="Recado para a galera (opcional)">
            <Textarea rows={2} value={form.description} onChange={(e) => set({ description: e.target.value })} />
          </Field>
        </div>
        {error && (
          <div className="sm:col-span-2">
            <ErrorBox message={error} />
          </div>
        )}
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" loading={busy}>
            {event ? "Salvar" : "Criar evento"}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
