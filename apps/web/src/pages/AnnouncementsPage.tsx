import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Briefcase, CalendarClock, ExternalLink, Megaphone, Pin, RefreshCw, Send, Trash2 } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { BannerCarousel, type SiteBanner } from "../components/BannerCarousel";
import { Badge, Button, Card, EmptyState, ErrorBox, Field, Input, PageTitle, Select, Spinner, Textarea, cx } from "../components/ui";
import { ApiError, api } from "../lib/api";
import { ANNOUNCEMENT_INFO, isOpportunity, timeAgo, type Announcement, type AnnouncementCategory } from "../lib/campus";
import { formatDate, fromLocalInput } from "../lib/format";
import { useApi } from "../lib/useApi";

const FILTERS: { id: string; label: string; match: (a: Announcement) => boolean }[] = [
  { id: "todos", label: "Todos", match: () => true },
  { id: "vagas", label: "Vagas e estágios", match: isOpportunity },
  { id: "provas", label: "Provas", match: (a) => a.category === "exam" },
  { id: "eventos", label: "Eventos", match: (a) => a.category === "event" },
  { id: "urgentes", label: "Urgentes", match: (a) => a.category === "urgent" },
];

/** Mural de avisos com os destaques do site do UNIFEB. Aluno lê; coordenador e admin publicam. */
export function AnnouncementsPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const { data, error, loading, reload } = useApi<{ announcements: Announcement[]; unread: number }>("/announcements");
  const banners = useApi<{ banners: SiteBanner[]; syncedAt: number | null }>("/banners");
  const canPost = user?.role === "coordinator" || user?.role === "admin";
  const [justRead, setJustRead] = useState<Set<string>>(new Set());
  const filter = FILTERS.find((f) => f.id === params.get("filtro")) ?? FILTERS[0]!;
  const list = (data?.announcements ?? []).filter(filter.match);

  // Ao abrir o mural, os avisos não lidos ficam destacados nesta visita e são marcados como lidos.
  useEffect(() => {
    const unread = data?.announcements.filter((a) => !a.isRead).map((a) => a.id) ?? [];
    if (unread.length === 0) return;
    setJustRead((prev) => new Set([...prev, ...unread]));
    void api("/announcements/read", { body: { ids: unread } }).catch(() => undefined);
  }, [data]);

  async function remove(id: string) {
    if (!confirm("Excluir este aviso?")) return;
    await api(`/announcements/${id}`, { method: "DELETE" });
    await reload();
  }

  return (
    <div className="space-y-4">
      <PageTitle title="Avisos" subtitle="Destaques do UNIFEB, comunicados da coordenação e vagas." />

      {banners.data && banners.data.banners.length > 0 && (
        <div className="space-y-1">
          <BannerCarousel banners={banners.data.banners} />
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
            <span>Destaques de unifeb.edu.br</span>
            {user?.role === "admin" && <SyncBannersButton onDone={() => void banners.reload()} />}
          </div>
        </div>
      )}

      {canPost && <Composer onPosted={() => void reload()} />}

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Filtrar avisos">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filter.id === f.id}
            onClick={() => setParams(f.id === "todos" ? {} : { filtro: f.id }, { replace: true })}
            className={cx(
              "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold ring-1",
              filter.id === f.id ? "bg-brand-800 text-white ring-brand-800" : "bg-white text-slate-700 ring-slate-300",
            )}
          >
            {f.id === "vagas" && <Briefcase className="size-4" aria-hidden />}
            {f.label}
          </button>
        ))}
      </div>

      {loading && <Spinner />}
      {error && <ErrorBox message={error.message} />}
      {data && list.length === 0 && (
        <EmptyState icon={<Megaphone className="size-8" />} title={filter.id === "vagas" ? "Nenhuma vaga aberta agora" : "Nenhum aviso por aqui"} />
      )}
      <ul className="space-y-3">
        {list.map((a) => (
          <AnnouncementItem key={a.id} a={a} fresh={justRead.has(a.id)} canDelete={canPost && a.canDelete} onDelete={() => void remove(a.id)} />
        ))}
      </ul>
    </div>
  );
}

function AnnouncementItem({ a, fresh, canDelete, onDelete }: { a: Announcement; fresh: boolean; canDelete: boolean; onDelete: () => void }) {
  const info = ANNOUNCEMENT_INFO[a.category];
  const closed = a.deadlineAt !== null && a.deadlineAt < Date.now();
  return (
    <li
      className={cx(
        "rounded-2xl bg-white p-4 shadow-sm ring-1",
        a.category === "urgent" ? "ring-red-300" : fresh ? "ring-gold-500" : "ring-slate-200",
      )}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <Badge tone={info.tone}>
          {isOpportunity(a) && <Briefcase className="size-3" aria-hidden />} {info.label}
        </Badge>
        {a.pinned && (
          <Badge tone="amber">
            <Pin className="size-3" aria-hidden /> Fixado
          </Badge>
        )}
        {fresh && <Badge tone="brand">Novo</Badge>}
        <span className="ml-auto text-xs text-slate-500">{timeAgo(a.createdAt)}</span>
      </div>
      <h2 className="font-bold text-slate-900">{a.title}</h2>
      {a.company && <p className="text-sm font-semibold text-brand-700">{a.company}</p>}
      <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{a.body}</p>
      {isOpportunity(a) && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {a.deadlineAt !== null && (
            <span className={cx("flex items-center gap-1.5 text-sm font-medium", closed ? "text-red-600" : "text-slate-700")}>
              <CalendarClock className="size-4" aria-hidden />
              {closed ? "Inscrições encerradas" : `Inscrições até ${formatDate(a.deadlineAt)}`}
            </span>
          )}
          {a.linkUrl && !closed && (
            <a href={a.linkUrl} target="_blank" rel="noreferrer noopener" className="ml-auto">
              <Button>
                Quero me candidatar <ExternalLink className="size-4" aria-hidden />
              </Button>
            </a>
          )}
        </div>
      )}
      {!isOpportunity(a) && a.linkUrl && (
        <a href={a.linkUrl} target="_blank" rel="noreferrer noopener" className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
          Saiba mais <ExternalLink className="size-3.5" aria-hidden />
        </a>
      )}
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          {a.authorName} · {a.courseName ?? "Todo o campus"}
        </span>
        {canDelete && (
          <button onClick={onDelete} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 font-medium text-red-600 hover:bg-red-50">
            <Trash2 className="size-3.5" aria-hidden /> Excluir
          </button>
        )}
      </div>
    </li>
  );
}

function SyncBannersButton({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function sync() {
    setBusy(true);
    setMessage(null);
    try {
      const r = await api<{ count: number }>("/banners/sync", { body: {} });
      setMessage(`${r.count} banners atualizados`);
      onDone();
    } catch (err) {
      setMessage((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <span className="flex items-center gap-2">
      {message && <span>{message}</span>}
      <button onClick={() => void sync()} disabled={busy} className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 font-semibold text-brand-700 hover:bg-brand-50">
        <RefreshCw className={cx("size-3.5", busy && "animate-spin")} aria-hidden /> Atualizar do site
      </button>
    </span>
  );
}

function Composer({ onPosted }: { onPosted: () => void }) {
  const { user } = useAuth();
  const courses = useApi<{ courses: { id: string; name: string }[] }>(user?.role === "admin" ? "/courses" : null);
  const empty = {
    title: "",
    body: "",
    category: "notice" as AnnouncementCategory,
    courseId: "",
    pinned: false,
    company: "",
    linkUrl: "",
    deadline: "",
  };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const opportunity = form.category === "internship" || form.category === "job";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/announcements", {
        body: {
          title: form.title,
          body: form.body,
          category: form.category,
          courseId: form.courseId || null,
          pinned: form.pinned,
          company: form.company || null,
          linkUrl: form.linkUrl || null,
          deadlineAt: opportunity && form.deadline ? fromLocalInput(`${form.deadline}T23:59`) : null,
        },
      });
      setForm(empty);
      onPosted();
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-3 font-bold">Publicar aviso ou vaga</h2>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tipo">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as AnnouncementCategory })}>
              {Object.entries(ANNOUNCEMENT_INFO).map(([id, info]) => (
                <option key={id} value={id}>
                  {info.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Para quem">
            {user?.role === "admin" ? (
              <Select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
                <option value="">Todo o campus</option>
                {courses.data?.courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            ) : (
              <Input value={user?.courseName ?? ""} disabled />
            )}
          </Field>
        </div>
        <Field label={opportunity ? "Cargo / vaga" : "Título"}>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder={opportunity ? "Ex.: Estágio em desenvolvimento web" : undefined}
            required
          />
        </Field>
        {opportunity && (
          <Field label="Empresa">
            <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </Field>
        )}
        <Field label={opportunity ? "Requisitos, carga horária, benefícios" : "Mensagem"}>
          <Textarea rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={opportunity ? "Link para se candidatar" : "Link (opcional)"}>
            <Input type="url" value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} placeholder="https://" />
          </Field>
          {opportunity && (
            <Field label="Inscrições até (opcional)">
              <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </Field>
          )}
        </div>
        <label className="flex min-h-11 items-center gap-3 text-sm text-slate-700">
          <input type="checkbox" className="size-5 accent-brand-800" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
          Fixar no topo
        </label>
        {error && <ErrorBox message={error} />}
        <Button type="submit" loading={busy}>
          <Send className="size-4" aria-hidden /> Publicar
        </Button>
      </form>
    </Card>
  );
}
