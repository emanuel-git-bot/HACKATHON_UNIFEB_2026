import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Clock, MapPin, Plus, Search, Trash2, Users, Video } from "lucide-react";
import { Badge, Button, Card, EmptyState, ErrorBox, Field, Input, PageTitle, Select, Spinner, Textarea, cx } from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { matchesSearch, type Place, type StudyGroup } from "../../lib/campus";
import { formatShortDay, formatTime, fromLocalInput, toLocalInput } from "../../lib/format";
import { useApi } from "../../lib/useApi";

function GroupWhere({ group }: { group: StudyGroup }) {
  if (group.place) {
    return (
      <Link
        to={`/mapa?local=${group.place.id}`}
        className="flex w-fit items-center gap-1.5 underline decoration-slate-300 underline-offset-2 hover:text-brand-800"
      >
        <MapPin className="size-4 text-slate-400" aria-hidden /> {group.place.name}
      </Link>
    );
  }
  return (
    <p className="flex items-center gap-1.5">
      <Video className="size-4 text-slate-400" aria-hidden /> Online
    </p>
  );
}

function Vacancies({ group }: { group: StudyGroup }) {
  const left = group.maxMembers - group.members;
  return (
    <span className={cx("text-sm font-semibold", left === 0 ? "text-red-600" : "text-emerald-700")}>
      {left === 0 ? "Lotado" : `${left} vaga${left === 1 ? "" : "s"}`}
    </span>
  );
}

export function GroupsPage() {
  const { data, error, loading } = useApi<{ groups: StudyGroup[] }>("/groups");
  const [tab, setTab] = useState<"all" | "mine">("all");
  const [query, setQuery] = useState("");
  const groups = (data?.groups ?? []).filter(
    (g) => (tab === "all" || g.isMember) && matchesSearch(query, g.title, g.subject, g.description),
  );

  return (
    <div className="space-y-4">
      <PageTitle
        title="Grupos de estudo"
        subtitle="Junte-se a colegas para estudar ou crie o seu."
        action={
          <Link to="/grupos/novo">
            <Button>
              <Plus className="size-4" aria-hidden /> Criar
            </Button>
          </Link>
        }
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por matéria (ex.: cálculo)"
          aria-label="Buscar grupos"
          className="pl-10"
        />
      </div>

      <div className="flex gap-2" role="tablist">
        {(
          [
            ["all", "Próximos encontros"],
            ["mine", "Meus grupos"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cx(
              "min-h-10 rounded-full px-4 text-sm font-semibold ring-1",
              tab === id ? "bg-brand-800 text-white ring-brand-800" : "bg-white text-slate-700 ring-slate-300",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <Spinner />}
      {error && <ErrorBox message={error.message} />}
      {data && groups.length === 0 && (
        <EmptyState icon={<Users className="size-8" />} title={tab === "mine" ? "Você ainda não está em nenhum grupo" : "Nenhum grupo encontrado"}>
          Que tal criar um e chamar a turma?
        </EmptyState>
      )}

      <ul className="space-y-3">
        {groups.map((g) => (
          <li key={g.id}>
            <Link to={`/grupos/${g.id}`} className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 hover:ring-brand-500">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <Badge tone="brand">{g.subject}</Badge>
                {g.isMember && <Badge tone="emerald">Você participa</Badge>}
                {g.courseName && <Badge>Só {g.courseName}</Badge>}
              </div>
              <h3 className="font-bold text-slate-900">{g.title}</h3>
              <div className="mt-2 flex items-end justify-between gap-3 text-sm text-slate-600">
                <div className="space-y-1">
                  <p className="flex items-center gap-1.5">
                    <Clock className="size-4 text-slate-400" aria-hidden /> {formatShortDay(g.meetsAt)} · {formatTime(g.meetsAt)}
                  </p>
                  <p className="flex items-center gap-1.5">
                    {g.place ? <MapPin className="size-4 text-slate-400" aria-hidden /> : <Video className="size-4 text-slate-400" aria-hidden />}
                    {g.place?.name ?? "Online"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="flex items-center justify-end gap-1 text-slate-500">
                    <Users className="size-4" aria-hidden /> {g.members}/{g.maxMembers}
                  </p>
                  <Vacancies group={g} />
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GroupDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useApi<{ group: StudyGroup; members: { name: string; courseName: string | null }[] }>(
    `/groups/${id}`,
  );
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function act(method: "POST" | "DELETE", path: string, after?: () => void) {
    setBusy(true);
    setActionError(null);
    try {
      await api(path, { method, body: method === "POST" ? {} : undefined });
      if (after) after();
      else await reload();
    } catch (err) {
      setActionError((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error?.message ?? "Grupo não encontrado."} />;
  const { group, members } = data;
  const full = group.members >= group.maxMembers;

  return (
    <div className="space-y-4">
      <Link to="/grupos" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-slate-600">
        <ArrowLeft className="size-4" aria-hidden /> Grupos
      </Link>

      <Card>
        <div className="mb-2 flex flex-wrap gap-2">
          <Badge tone="brand">{group.subject}</Badge>
          {group.courseName && <Badge>Só {group.courseName}</Badge>}
        </div>
        <h1 className="text-xl font-bold">{group.title}</h1>
        <p className="mt-1 text-sm text-slate-500">Criado por {group.ownerName}</p>
        {group.description && <p className="mt-3 text-slate-700">{group.description}</p>}
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <p className="flex items-center gap-1.5">
            <Clock className="size-4 text-slate-400" aria-hidden /> {formatShortDay(group.meetsAt)} às {formatTime(group.meetsAt)}
          </p>
          <GroupWhere group={group} />
          {group.onlineUrl && group.isMember && (
            <a href={group.onlineUrl} target="_blank" rel="noreferrer" className="flex w-fit items-center gap-1.5 font-semibold text-brand-700 hover:underline">
              <Video className="size-4" aria-hidden /> Entrar na chamada
            </a>
          )}
        </div>

        {actionError && (
          <div className="mt-4">
            <ErrorBox message={actionError} />
          </div>
        )}
        <div className="mt-5">
          {group.isOwner ? (
            <Button
              variant="danger"
              loading={busy}
              className="w-full"
              onClick={() => {
                if (confirm("Excluir o grupo? Os participantes deixam de vê-lo.")) {
                  void act("DELETE", `/groups/${group.id}`, () => navigate("/grupos", { replace: true }));
                }
              }}
            >
              <Trash2 className="size-4" aria-hidden /> Excluir grupo
            </Button>
          ) : group.isMember ? (
            <Button variant="secondary" loading={busy} className="w-full" onClick={() => void act("DELETE", `/groups/${group.id}/join`)}>
              Sair do grupo
            </Button>
          ) : (
            <Button loading={busy} disabled={full} className="w-full" onClick={() => void act("POST", `/groups/${group.id}/join`)}>
              {full ? "Grupo lotado" : "Participar"}
            </Button>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 flex items-center justify-between font-bold">
          Participantes
          <span className="text-sm font-medium text-slate-500">
            {group.members}/{group.maxMembers}
          </span>
        </h2>
        <ul className="space-y-2">
          {members.map((m, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-800">
                {m.name.charAt(0)}
              </span>
              <span>
                <span className="block text-sm font-semibold">{m.name}</span>
                <span className="block text-xs text-slate-500">{m.courseName}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export function NewGroupPage() {
  const navigate = useNavigate();
  const places = useApi<{ places: Place[] }>("/places");
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  tomorrow.setHours(19, 0, 0, 0);
  const [form, setForm] = useState({
    title: "",
    subject: "",
    description: "",
    meetsAt: toLocalInput(tomorrow.getTime()),
    where: "place" as "place" | "online",
    placeId: "pl_biblioteca",
    onlineUrl: "",
    maxMembers: "6",
    courseOnly: false,
  });
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const studyPlaces = (places.data?.places ?? []).filter((p) => ["library", "classroom", "lab", "food", "block", "auditorium"].includes(p.category));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ group: StudyGroup }>("/groups", {
        body: {
          title: form.title,
          subject: form.subject,
          description: form.description,
          meetsAt: fromLocalInput(form.meetsAt),
          placeId: form.where === "place" ? form.placeId : null,
          onlineUrl: form.where === "online" ? form.onlineUrl : null,
          maxMembers: Number(form.maxMembers),
          courseOnly: form.courseOnly,
        },
      });
      navigate(`/grupos/${r.group.id}`, { replace: true });
    } catch (err) {
      const apiErr = err as ApiError;
      setError({ message: apiErr.message, field: apiErr.data.field });
    } finally {
      setBusy(false);
    }
  }

  const fieldError = (name: string) => (error?.field === name ? error.message : undefined);

  return (
    <div className="space-y-4">
      <Link to="/grupos" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-slate-600">
        <ArrowLeft className="size-4" aria-hidden /> Grupos
      </Link>
      <PageTitle title="Criar grupo de estudo" />
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nome do grupo" error={fieldError("title")}>
            <Input value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Ex.: Lista 3 de Cálculo I" required />
          </Field>
          <Field label="Matéria" error={fieldError("subject")}>
            <Input value={form.subject} onChange={(e) => set({ subject: e.target.value })} placeholder="Ex.: Cálculo I" required />
          </Field>
          <Field label="O que vão estudar (opcional)">
            <Textarea rows={3} value={form.description} onChange={(e) => set({ description: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quando" error={fieldError("meetsAt")}>
              <Input type="datetime-local" value={form.meetsAt} onChange={(e) => set({ meetsAt: e.target.value })} required />
            </Field>
            <Field label="Vagas" error={fieldError("maxMembers")}>
              <Input type="number" min={2} max={50} value={form.maxMembers} onChange={(e) => set({ maxMembers: e.target.value })} required />
            </Field>
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-slate-700">Onde</legend>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["place", "No campus", MapPin],
                  ["online", "Online", Video],
                ] as const
              ).map(([id, label, Icon]) => (
                <label
                  key={id}
                  className={cx(
                    "flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-semibold ring-1",
                    form.where === id ? "bg-brand-800 text-white ring-brand-800" : "bg-white text-slate-700 ring-slate-300",
                  )}
                >
                  <input type="radio" name="where" className="sr-only" checked={form.where === id} onChange={() => set({ where: id })} />
                  <Icon className="size-4" aria-hidden /> {label}
                </label>
              ))}
            </div>
          </fieldset>
          {form.where === "place" ? (
            <Field label="Local no campus" error={fieldError("placeId")}>
              <Select value={form.placeId} onChange={(e) => set({ placeId: e.target.value })}>
                {studyPlaces.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.building && p.building !== p.name ? ` (${p.building})` : ""}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field label="Link da chamada" error={fieldError("onlineUrl")} hint="Google Meet, Teams, Discord...">
              <Input type="url" value={form.onlineUrl} onChange={(e) => set({ onlineUrl: e.target.value })} placeholder="https://meet.google.com/..." />
            </Field>
          )}

          <label className="flex min-h-11 items-center gap-3 text-sm text-slate-700">
            <input type="checkbox" className="size-5 accent-brand-800" checked={form.courseOnly} onChange={(e) => set({ courseOnly: e.target.checked })} />
            Só para alunos do meu curso
          </label>

          {error && !error.field && <ErrorBox message={error.message} />}
          <Button type="submit" loading={busy} className="w-full">
            Criar grupo
          </Button>
        </form>
      </Card>
    </div>
  );
}
