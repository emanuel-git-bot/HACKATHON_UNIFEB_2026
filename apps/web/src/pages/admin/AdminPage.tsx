import { useState, type FormEvent } from "react";
import { GraduationCap, Plus, Trash2, Users, Wifi } from "lucide-react";
import { Badge, Button, Card, ErrorBox, Field, Input, PageTitle, Select, Spinner, cx } from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { useApi } from "../../lib/useApi";

interface Course {
  id: string;
  name: string;
}
interface Coordinator {
  id: string;
  name: string;
  login: string;
  courseId: string;
  courseName: string;
  active: boolean;
}

const TABS = [
  { id: "coord", label: "Coordenadores", icon: Users },
  { id: "courses", label: "Cursos", icon: GraduationCap },
  { id: "network", label: "Rede da faculdade", icon: Wifi },
] as const;

export function AdminPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("coord");
  const courses = useApi<{ courses: Course[] }>("/courses");

  return (
    <div>
      <PageTitle title="Administração" subtitle="Cursos, coordenadores e rede autorizada." />
      <div className="mb-5 flex gap-2 overflow-x-auto" role="tablist">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cx(
              "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold ring-1",
              tab === id ? "bg-brand-800 text-white ring-brand-800" : "bg-white text-slate-700 ring-slate-300",
            )}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </button>
        ))}
      </div>
      {tab === "coord" && <CoordinatorsTab courses={courses.data?.courses ?? []} />}
      {tab === "courses" && <CoursesTab courses={courses.data?.courses} onCreated={() => void courses.reload()} />}
      {tab === "network" && <NetworkTab />}
    </div>
  );
}

function CoordinatorsTab({ courses }: { courses: Course[] }) {
  const list = useApi<{ coordinators: Coordinator[] }>("/admin/coordinators");
  const [form, setForm] = useState({ name: "", login: "", courseId: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/admin/coordinators", { body: form });
      setForm({ name: "", login: "", courseId: "", password: "" });
      await list.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao cadastrar.");
    } finally {
      setBusy(false);
    }
  }

  async function update(id: string, body: Record<string, unknown>) {
    setError(null);
    try {
      await api(`/admin/coordinators/${id}`, { method: "PUT", body });
      await list.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar.");
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
      <Card className="p-0">
        {list.loading && <Spinner />}
        <ul className="divide-y divide-slate-100">
          {list.data?.coordinators.map((c) => (
            <li key={c.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {c.name} {c.active ? <Badge tone="emerald">Ativo</Badge> : <Badge tone="red">Inativo</Badge>}
                  </p>
                  <p className="text-sm text-slate-500">
                    Login <span className="font-mono">{c.login}</span> · {c.courseName}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setEditing(editing === c.id ? null : c.id)}>
                    Editar
                  </Button>
                  <Button variant={c.active ? "danger" : "success"} onClick={() => void update(c.id, { active: !c.active })}>
                    {c.active ? "Desativar" : "Reativar"}
                  </Button>
                </div>
              </div>
              {editing === c.id && (
                <EditCoordinator
                  coordinator={c}
                  courses={courses}
                  onSave={async (body) => {
                    await update(c.id, body);
                    setEditing(null);
                  }}
                />
              )}
            </li>
          ))}
        </ul>
        {list.data?.coordinators.length === 0 && <p className="p-6 text-center text-sm text-slate-500">Nenhum coordenador.</p>}
      </Card>

      <Card>
        <h2 className="mb-4 font-bold">Novo coordenador</h2>
        <form onSubmit={create} className="space-y-3">
          <Field label="Nome">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Login" hint="Usado no lugar do RA para entrar.">
            <Input value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} autoCapitalize="none" required />
          </Field>
          <Field label="Curso">
            <Select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })} required>
              <option value="">Selecione...</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Senha inicial">
            <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={6} required autoComplete="off" />
          </Field>
          {error && <ErrorBox message={error} />}
          <Button type="submit" loading={busy} className="w-full">
            <Plus className="size-4" aria-hidden /> Cadastrar
          </Button>
        </form>
      </Card>
    </div>
  );
}

function EditCoordinator({
  coordinator,
  courses,
  onSave,
}: {
  coordinator: Coordinator;
  courses: Course[];
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [name, setName] = useState(coordinator.name);
  const [courseId, setCourseId] = useState(coordinator.courseId);
  const [password, setPassword] = useState("");
  return (
    <form
      className="mt-3 grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave({ name, courseId, ...(password ? { password } : {}) });
      }}
    >
      <Field label="Nome">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Curso">
        <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Nova senha (opcional)">
        <Input value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} autoComplete="off" />
      </Field>
      <div className="sm:col-span-3">
        <Button type="submit">Salvar</Button>
      </div>
    </form>
  );
}

function CoursesTab({ courses, onCreated }: { courses?: Course[]; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api("/admin/courses", { body: { name } });
      setName("");
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao cadastrar.");
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
      <Card className="p-0">
        {!courses && <Spinner />}
        <ul className="divide-y divide-slate-100">
          {courses?.map((c) => (
            <li key={c.id} className="flex items-center gap-3 p-4 font-medium">
              <GraduationCap className="size-5 text-brand-700" aria-hidden /> {c.name}
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <h2 className="mb-4 font-bold">Novo curso</h2>
        <form onSubmit={create} className="space-y-3">
          <Field label="Nome do curso">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          {error && <ErrorBox message={error} />}
          <Button type="submit" className="w-full">
            <Plus className="size-4" aria-hidden /> Cadastrar
          </Button>
        </form>
      </Card>
    </div>
  );
}

function NetworkTab() {
  const { data, reload } = useApi<{ allowedIps: string[]; currentIp: string | null }>("/admin/settings/network");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function save(list: string[]) {
    setError(null);
    try {
      await api("/admin/settings/network", { method: "PUT", body: { allowedIps: list } });
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar.");
    }
  }

  if (!data) return <Spinner />;
  const add = (ip: string) => ip && !data.allowedIps.includes(ip) && void save([...data.allowedIps, ip]);

  return (
    <Card className="max-w-2xl space-y-4">
      <div>
        <h2 className="font-bold">IPs autorizados do Wi-Fi da faculdade</h2>
        <p className="text-sm text-slate-500">
          Quem fizer check-in por uma destas redes passa na trava de local mesmo sem GPS. Para descobrir o IP, conecte este
          computador ao Wi-Fi do local e use o botão abaixo.
        </p>
      </div>
      {data.currentIp && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-brand-50 p-3 text-sm ring-1 ring-brand-100">
          <span>
            Seu IP agora: <strong className="font-mono">{data.currentIp}</strong>
          </span>
          <Button variant="secondary" onClick={() => add(data.currentIp!)}>
            <Plus className="size-4" aria-hidden /> Autorizar este IP
          </Button>
        </div>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add(value.trim());
          setValue("");
        }}
      >
        <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Ex.: 200.150.10.0/24" className="font-mono" aria-label="IP ou faixa" />
        <Button type="submit">Adicionar</Button>
      </form>
      {error && <ErrorBox message={error} />}
      <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
        {data.allowedIps.length === 0 && <li className="p-4 text-sm text-slate-500">Nenhum IP autorizado: vale só o GPS.</li>}
        {data.allowedIps.map((ip) => (
          <li key={ip} className="flex items-center justify-between p-3 font-mono text-sm">
            {ip}
            <Button variant="ghost" aria-label={`Remover ${ip}`} onClick={() => void save(data.allowedIps.filter((x) => x !== ip))}>
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
