import { useState, type FormEvent } from "react";
import { BookOpen, ExternalLink, FileText, Library, Link2, Plus, Search, Trash2, X } from "lucide-react";
import { Badge, Button, Card, EmptyState, ErrorBox, Field, Input, PageTitle, Select, Spinner, Textarea, cx } from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { RESOURCE_LABELS, matchesSearch, timeAgo, type ResourceKind, type SharedResource } from "../../lib/campus";
import { useApi } from "../../lib/useApi";

const KIND_ICONS: Record<ResourceKind, typeof FileText> = {
  summary: FileText,
  handout: BookOpen,
  book: Library,
  link: Link2,
  other: FileText,
};

export function ResourcesPage() {
  const { data, error, loading, reload } = useApi<{ resources: SharedResource[] }>("/resources");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<ResourceKind | "all">("all");
  const [adding, setAdding] = useState(false);

  const list = (data?.resources ?? []).filter(
    (r) => (kind === "all" || r.kind === kind) && matchesSearch(query, r.title, r.subject, r.description),
  );

  async function remove(id: string) {
    if (!confirm("Remover este material?")) return;
    await api(`/resources/${id}`, { method: "DELETE" });
    await reload();
  }

  return (
    <div className="space-y-4">
      <PageTitle
        title="Materiais"
        subtitle="Resumos, apostilas, links e livros que a galera compartilha."
        action={
          <Button onClick={() => setAdding((a) => !a)} variant={adding ? "secondary" : "primary"}>
            {adding ? <X className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
            {adding ? "Fechar" : "Compartilhar"}
          </Button>
        }
      />

      {adding && (
        <NewResource
          onDone={() => {
            setAdding(false);
            void reload();
          }}
        />
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por matéria ou título" aria-label="Buscar materiais" className="pl-10" />
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Filtrar por tipo">
        {(["all", ...Object.keys(RESOURCE_LABELS)] as const).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={kind === k}
            onClick={() => setKind(k as ResourceKind | "all")}
            className={cx(
              "min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold ring-1",
              kind === k ? "bg-brand-800 text-white ring-brand-800" : "bg-white text-slate-700 ring-slate-300",
            )}
          >
            {k === "all" ? "Todos" : RESOURCE_LABELS[k as ResourceKind]}
          </button>
        ))}
      </div>

      {loading && <Spinner />}
      {error && <ErrorBox message={error.message} />}
      {data && list.length === 0 && (
        <EmptyState icon={<BookOpen className="size-8" />} title="Nada por aqui ainda">
          Compartilhe um resumo e ajude quem está começando.
        </EmptyState>
      )}
      <ul className="space-y-3">
        {list.map((r) => {
          const Icon = KIND_ICONS[r.kind];
          return (
            <li key={r.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold-50 text-gold-700">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap gap-1.5">
                    <Badge tone="brand">{r.subject}</Badge>
                    <Badge>{RESOURCE_LABELS[r.kind]}</Badge>
                  </div>
                  <h2 className="font-bold leading-snug text-slate-900">{r.title}</h2>
                  {r.description && <p className="mt-1 text-sm text-slate-600">{r.description}</p>}
                  <p className="mt-2 text-xs text-slate-500">
                    {r.ownerName}
                    {r.ownerCourse ? ` · ${r.ownerCourse}` : ""} · {timeAgo(r.createdAt)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {r.url && (
                  <a href={r.url} target="_blank" rel="noreferrer noopener" className="flex-1">
                    <Button variant="secondary" className="w-full">
                      <ExternalLink className="size-4" aria-hidden /> Abrir
                    </Button>
                  </a>
                )}
                {r.canDelete && (
                  <Button variant="ghost" onClick={() => void remove(r.id)} aria-label={`Remover ${r.title}`}>
                    <Trash2 className="size-4 text-red-600" aria-hidden />
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function NewResource({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ title: "", subject: "", kind: "summary" as ResourceKind, description: "", url: "", courseOnly: false });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/resources", { body: { ...form, url: form.url || null } });
      onDone();
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Título">
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Resumo de Física I" required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Matéria">
            <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
          </Field>
          <Field label="Tipo">
            <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as ResourceKind })}>
              {Object.entries(RESOURCE_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={form.kind === "book" ? "Link (opcional)" : "Link"} hint="Google Drive, PDF, site...">
          <Input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://" required={form.kind !== "book"} />
        </Field>
        <Field label={form.kind === "book" ? "Como combinar o empréstimo" : "Descrição (opcional)"}>
          <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <label className="flex min-h-11 items-center gap-3 text-sm text-slate-700">
          <input type="checkbox" className="size-5 accent-brand-800" checked={form.courseOnly} onChange={(e) => setForm({ ...form, courseOnly: e.target.checked })} />
          Só para alunos do meu curso
        </label>
        {error && <ErrorBox message={error} />}
        <Button type="submit" loading={busy} className="w-full">
          Compartilhar
        </Button>
      </form>
    </Card>
  );
}
