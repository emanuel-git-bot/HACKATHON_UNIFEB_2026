import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Award, Clock, KeyRound, MapPin, Mic } from "lucide-react";
import { Badge, Button, Card, ErrorBox, Field, Input, Spinner, StatusBadge } from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { CATEGORY_LABELS, MODE_LABELS, formatHours, formatRange } from "../../lib/format";
import { getPosition } from "../../lib/geo";
import type { Attendance, StudentEvent } from "../../lib/types";
import { useApi } from "../../lib/useApi";

export function EventDetailPage() {
  const { id } = useParams();
  const [pollMs, setPollMs] = useState<number | undefined>();
  const { data, error, loading, reload, setData } = useApi<{ event: StudentEvent }>(`/events/${id}`, pollMs);
  const event = data?.event;
  const att = event?.attendance ?? null;
  const waitingForKeywordPhase = Boolean(
    event?.checkinMode === "entry_keyword" && att?.entryAt && !att.keywordOk && att.status !== "rejected" && !event.exitOpen,
  );

  // Enquanto espera a palavra-chave, atualiza sozinho para ver quando o coordenador libera.
  useEffect(() => setPollMs(waitingForKeywordPhase ? 5000 : undefined), [waitingForKeywordPhase]);

  if (loading) return <Spinner />;
  if (error || !event) return <ErrorBox message={error?.message ?? "Evento não encontrado."} />;

  async function toggleRegistration() {
    if (!event) return;
    const r = await api<{ registered: boolean }>(`/events/${event.id}/register`, {
      method: event.registered ? "DELETE" : "POST",
      body: event.registered ? undefined : {},
    });
    setData({ event: { ...event, registered: r.registered } });
  }

  return (
    <div className="space-y-4">
      <Link to="/eventos" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-slate-600">
        <ArrowLeft className="size-4" aria-hidden /> Voltar
      </Link>

      <Card>
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge tone="brand">{CATEGORY_LABELS[event.category] ?? event.category}</Badge>
          {att && <StatusBadge status={att.status} />}
        </div>
        <h1 className="text-2xl font-bold leading-tight">{event.title}</h1>
        <p className="mt-3 inline-flex rounded-xl bg-emerald-50 px-3 py-1.5 text-2xl font-extrabold text-emerald-700 ring-1 ring-emerald-200">
          +{formatHours(event.hours)} complementares
        </p>
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <p className="flex items-center gap-2">
            <Clock className="size-4 text-slate-400" aria-hidden /> {formatRange(event.startsAt, event.endsAt)}
          </p>
          <Link
            to={`/mapa?q=${encodeURIComponent(event.location)}`}
            className="flex w-fit items-center gap-2 underline decoration-slate-300 underline-offset-2 hover:text-brand-800"
          >
            <MapPin className="size-4 text-slate-400" aria-hidden /> {event.location}
          </Link>
          {event.speaker && (
            <p className="flex items-center gap-2">
              <Mic className="size-4 text-slate-400" aria-hidden /> {event.speaker}
            </p>
          )}
        </div>
        {event.description && <p className="mt-4 whitespace-pre-line text-slate-600">{event.description}</p>}
        <p className="mt-4 text-xs text-slate-500">Presença: {MODE_LABELS[event.checkinMode].title}</p>

        {!att && (
          <Button variant={event.registered ? "secondary" : "primary"} className="mt-5 w-full" onClick={toggleRegistration}>
            {event.registered ? "Inscrito · cancelar inscrição" : "Inscrever-se"}
          </Button>
        )}
      </Card>

      {att && <AttendanceCard event={event} attendance={att} onUpdate={() => void reload()} />}
    </div>
  );
}

function AttendanceCard({ event, attendance, onUpdate }: { event: StudentEvent; attendance: Attendance; onUpdate: () => void }) {
  const needsKeyword = event.checkinMode === "entry_keyword" && attendance.entryAt && !attendance.keywordOk;
  const needsExit = event.checkinMode === "entry_exit" && attendance.entryAt && !attendance.exitAt;

  return (
    <Card>
      <h2 className="mb-2 font-bold">Sua presença</h2>
      {attendance.status === "completed" && (
        <p className="flex items-center gap-2 text-emerald-700">
          <Award className="size-5" aria-hidden /> Presença confirmada. As horas já estão em{" "}
          <Link to="/horas" className="font-semibold underline">
            Horas
          </Link>
          .
        </p>
      )}
      {attendance.status === "suspect" && (
        <p className="text-amber-800">Registrada e aguardando conferência do coordenador.</p>
      )}
      {attendance.status === "rejected" && <p className="text-red-700">Presença recusada pelo coordenador.</p>}
      {needsExit && attendance.status !== "rejected" && (
        <p className="text-sky-800">Entrada registrada. Leia o QR de saída no telão no final do evento.</p>
      )}
      {needsKeyword && attendance.status !== "rejected" && <KeywordForm event={event} attendance={attendance} onDone={onUpdate} />}
    </Card>
  );
}

function KeywordForm({ event, attendance, onDone }: { event: StudentEvent; attendance: Attendance; onDone: () => void }) {
  const [keyword, setKeyword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [triesLeft, setTriesLeft] = useState(3 - attendance.keywordTries);

  if (triesLeft <= 0) {
    return <p className="text-amber-800">Tentativas esgotadas. O coordenador vai conferir sua presença.</p>;
  }
  if (!event.exitOpen) {
    return (
      <p className="flex items-center gap-2 text-sky-800">
        <KeyRound className="size-5 shrink-0" aria-hidden />
        Entrada registrada. No final, o palestrante vai falar uma palavra-chave. Esta tela libera sozinha quando chegar a hora.
      </p>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const gps = await getPosition();
      await api(`/events/${event.id}/keyword`, { body: { keyword, gps } });
      onDone();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (typeof err.data.triesLeft === "number") setTriesLeft(err.data.triesLeft);
        if (err.code === "keyword_locked") setTriesLeft(0);
      } else setError("Erro ao enviar. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Digite a palavra dita pelo palestrante">
        <Input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="text-center text-xl font-bold uppercase tracking-widest"
          autoCapitalize="characters"
          autoComplete="off"
          required
        />
      </Field>
      <p className="text-xs text-slate-500">{triesLeft === 1 ? "1 tentativa restante" : `${triesLeft} tentativas restantes`}</p>
      {error && <ErrorBox message={error} />}
      <Button type="submit" loading={busy} className="w-full">
        Confirmar presença
      </Button>
    </form>
  );
}
