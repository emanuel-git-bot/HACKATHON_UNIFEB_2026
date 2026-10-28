import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Monitor,
  Pause,
  Play,
  Printer,
  Settings2,
  ShieldAlert,
  TriangleAlert,
  UserPlus,
  X,
} from "lucide-react";
import { Badge, Button, Card, EmptyState, ErrorBox, Field, Input, Spinner, StatusBadge, cx } from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { ATTEMPT_REASONS, MODE_LABELS, formatHours, formatRange, formatTime } from "../../lib/format";
import type { Attendance, EventCounts, EventInfo, Phase } from "../../lib/types";
import { useApi } from "../../lib/useApi";

type EventDetail = EventInfo & { lat: number | null; lng: number | null; radiusM: number; hasKeyword: boolean };
type AttendanceItem = Attendance & { studentName: string; studentRa: string };
interface Attempt {
  id: string;
  phase: string | null;
  result: "accepted" | "suspect" | "rejected";
  reason: string;
  ip: string | null;
  createdAt: number;
  studentName: string | null;
  studentRa: string | null;
}

const TABS = [
  { id: "presencas", label: "Presenças" },
  { id: "suspeitas", label: "Suspeitas" },
  { id: "tentativas", label: "Tentativas bloqueadas" },
  { id: "manual", label: "Lançamento manual" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export function ManageEventPage() {
  const { id = "" } = useParams();
  const detail = useApi<{ event: EventDetail; counts: EventCounts }>(`/coord/events/${id}`, 5000);
  const attendance = useApi<{ attendance: AttendanceItem[] }>(`/coord/events/${id}/attendance`, 5000);
  const [tab, setTab] = useState<Tab>("presencas");

  if (detail.loading) return <Spinner />;
  if (detail.error || !detail.data) return <ErrorBox message={detail.error?.message ?? "Evento não encontrado."} />;
  const { event, counts } = detail.data;

  async function togglePhase(phase: Phase, open: boolean) {
    await api(`/coord/events/${id}/phase`, { body: { phase, open } });
    await detail.reload();
  }

  const phases: Phase[] = event.checkinMode === "entry" ? ["entry"] : event.checkinMode === "exit" ? ["exit"] : ["entry", "exit"];
  const refresh = () => {
    void detail.reload();
    void attendance.reload();
  };

  return (
    <div className="space-y-5">
      <Link to="/coord" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-slate-600">
        <ArrowLeft className="size-4" aria-hidden /> Eventos
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{event.title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {formatRange(event.startsAt, event.endsAt)} · {event.location} · +{formatHours(event.hours)} ·{" "}
            {MODE_LABELS[event.checkinMode].title}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/coord/eventos/${id}/telao`}>
            <Button>
              <Monitor className="size-4" aria-hidden /> Abrir Telão
            </Button>
          </Link>
          <Link to={`/coord/eventos/${id}/lista`} target="_blank">
            <Button variant="secondary">
              <Printer className="size-4" aria-hidden /> Imprimir lista de presença
            </Button>
          </Link>
          <Link to={`/coord/eventos/${id}/editar`}>
            <Button variant="ghost">
              <Settings2 className="size-4" aria-hidden /> Editar
            </Button>
          </Link>
        </div>
      </div>

      {event.lat === null && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Este evento não tem localização definida: quem não estiver na rede da faculdade ficará como suspeito.{" "}
            <Link to={`/coord/eventos/${id}/editar`} className="font-semibold underline">
              Definir local
            </Link>
          </span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Card className="space-y-3">
          <h2 className="font-bold">Etapas do check-in</h2>
          {phases.map((p) => {
            const open = p === "entry" ? event.entryOpen : event.exitOpen;
            const label = p === "entry" ? "Entrada" : event.checkinMode === "entry_keyword" ? "Palavra-chave" : "Saída";
            return (
              <div key={p} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                <span className="font-semibold">
                  {label} {open ? <Badge tone="emerald">● aberta</Badge> : <Badge>fechada</Badge>}
                </span>
                <Button variant={open ? "danger" : "success"} onClick={() => void togglePhase(p, !open)}>
                  {open ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
                  {open ? "Encerrar" : "Abrir"}
                </Button>
              </div>
            );
          })}
          <dl className="grid grid-cols-2 gap-2 pt-2 text-center">
            <Count label="Inscritos" value={counts.registered} />
            <Count label="Confirmadas" value={counts.completed} tone="text-emerald-700" />
            <Count label="Suspeitas" value={counts.suspect} tone="text-amber-700" />
            <Count label="Incompletas" value={counts.incomplete} tone="text-sky-700" />
          </dl>
        </Card>

        <Card className="p-0">
          <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3 pt-3" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cx(
                  "min-h-11 shrink-0 rounded-t-lg px-4 text-sm font-semibold",
                  tab === t.id ? "border-b-2 border-brand-800 text-brand-800" : "text-slate-500 hover:text-slate-800",
                )}
              >
                {t.label}
                {t.id === "suspeitas" && counts.suspect > 0 && (
                  <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 text-xs text-white">{counts.suspect}</span>
                )}
              </button>
            ))}
          </div>
          <div className="p-4">
            {tab === "presencas" && <AttendanceTable items={attendance.data?.attendance} />}
            {tab === "suspeitas" && (
              <SuspectList items={attendance.data?.attendance.filter((a) => a.status === "suspect")} onChange={refresh} />
            )}
            {tab === "tentativas" && <AttemptsList eventId={id} />}
            {tab === "manual" && <ManualEntry eventId={id} onDone={refresh} />}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Count({ label, value, tone = "text-slate-900" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 py-2">
      <dd className={`text-2xl font-extrabold ${tone}`}>{value}</dd>
      <dt className="text-xs text-slate-500">{label}</dt>
    </div>
  );
}

const time = (ms: number | null) => (ms ? formatTime(ms) : "—");

function AttendanceTable({ items }: { items?: AttendanceItem[] }) {
  if (!items) return <Spinner />;
  if (items.length === 0) return <EmptyState icon={<UserPlus className="size-8" />} title="Nenhuma presença registrada ainda" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="text-xs uppercase text-slate-500">
          <tr>
            <th className="py-2 pr-3">Aluno</th>
            <th className="py-2 pr-3">RA</th>
            <th className="py-2 pr-3">Entrada</th>
            <th className="py-2 pr-3">Saída</th>
            <th className="py-2 pr-3">Status</th>
            <th className="py-2">Origem</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((a) => (
            <tr key={a.id}>
              <td className="py-2.5 pr-3 font-medium">{a.studentName}</td>
              <td className="py-2.5 pr-3 tabular-nums">{a.studentRa}</td>
              <td className="py-2.5 pr-3 tabular-nums">{time(a.entryAt)}</td>
              <td className="py-2.5 pr-3 tabular-nums">{a.keywordOk && !a.exitAt ? "palavra-chave" : time(a.exitAt)}</td>
              <td className="py-2.5 pr-3">
                <StatusBadge status={a.status} />
              </td>
              <td className="py-2.5">{a.origin === "manual" ? <Badge>Manual</Badge> : <Badge tone="brand">QR</Badge>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SuspectList({ items, onChange }: { items?: AttendanceItem[]; onChange: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!items) return <Spinner />;
  if (items.length === 0) return <EmptyState icon={<Check className="size-8" />} title="Nenhuma presença suspeita" />;

  async function review(id: string, decision: "confirm" | "reject") {
    setBusy(id + decision);
    setError(null);
    try {
      await api(`/coord/attendance/${id}/review`, { body: { decision } });
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao revisar.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <ul className="space-y-3">
      {error && <ErrorBox message={error} />}
      {items.map((a) => (
        <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
          <div>
            <p className="font-semibold">
              {a.studentName} <span className="font-normal text-slate-500">· RA {a.studentRa}</span>
            </p>
            <p className="flex items-center gap-1.5 text-sm text-amber-900">
              <TriangleAlert className="size-4" aria-hidden /> {a.suspectReason}
            </p>
            <p className="text-xs text-slate-500">Entrada {time(a.entryAt)}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="success" loading={busy === a.id + "confirm"} onClick={() => void review(a.id, "confirm")}>
              <Check className="size-4" aria-hidden /> Confirmar
            </Button>
            <Button variant="danger" loading={busy === a.id + "reject"} onClick={() => void review(a.id, "reject")}>
              <X className="size-4" aria-hidden /> Recusar
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function AttemptsList({ eventId }: { eventId: string }) {
  const { data, error } = useApi<{ attempts: Attempt[] }>(`/coord/events/${eventId}/attempts`, 3000);
  const [onlyBlocked, setOnlyBlocked] = useState(true);
  if (error) return <ErrorBox message={error.message} />;
  if (!data) return <Spinner />;
  const list = onlyBlocked ? data.attempts.filter((a) => a.result !== "accepted") : data.attempts;

  return (
    <div className="space-y-3">
      <label className="inline-flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={onlyBlocked} onChange={(e) => setOnlyBlocked(e.target.checked)} className="size-4" />
        Mostrar só bloqueadas e suspeitas
      </label>
      {list.length === 0 && <EmptyState icon={<ShieldAlert className="size-8" />} title="Nenhuma tentativa por aqui" />}
      <ul className="divide-y divide-slate-100">
        {list.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
            <span className="w-14 tabular-nums text-slate-500">{formatTime(a.createdAt)}</span>
            <Badge tone={a.result === "rejected" ? "red" : a.result === "suspect" ? "amber" : "emerald"}>
              {a.result === "rejected" ? "Bloqueada" : a.result === "suspect" ? "Suspeita" : "Aceita"}
            </Badge>
            <span className="font-medium">{ATTEMPT_REASONS[a.reason] ?? a.reason}</span>
            <span className="text-slate-500">
              {a.studentName ? `${a.studentName} (RA ${a.studentRa})` : "sem login"}
              {a.phase ? ` · ${a.phase === "entry" ? "entrada" : "saída"}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ManualEntry({ eventId, onDone }: { eventId: string; onDone: () => void }) {
  const [ra, setRa] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const r = await api<{ student: { name: string; ra: string } }>(`/coord/events/${eventId}/manual`, { body: { ra: ra.trim() } });
      setMessage({ ok: true, text: `Presença lançada para ${r.student.name} (RA ${r.student.ra}).` });
      setRa("");
      onDone();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : "Erro ao lançar presença." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-3">
      <p className="text-sm text-slate-600">
        Para quem assinou a lista em papel. A presença entra como concluída, marcada como “Manual”.
      </p>
      <Field label="RA do aluno">
        <Input value={ra} onChange={(e) => setRa(e.target.value)} inputMode="numeric" required />
      </Field>
      {message &&
        (message.ok ? (
          <p className="rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">{message.text}</p>
        ) : (
          <ErrorBox message={message.text} />
        ))}
      <Button type="submit" loading={busy}>
        <UserPlus className="size-4" aria-hidden /> Lançar presença
      </Button>
    </form>
  );
}
