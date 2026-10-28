import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  KeyRound,
  Loader2,
  LogIn,
  MapPin,
  ScanLine,
  ShieldX,
  Smartphone,
  TimerOff,
  TriangleAlert,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { LoginForm } from "../components/LoginForm";
import { Logo } from "../components/Logo";
import { Button, Card, cx } from "../components/ui";
import { ApiError, api } from "../lib/api";
import { formatHours } from "../lib/format";
import { getPosition } from "../lib/geo";
import type { Attendance, CheckinMode } from "../lib/types";

interface EventSummary {
  id: string;
  title: string;
  hours: number;
  checkinMode: CheckinMode;
}

interface Ticket {
  ticket: string;
  expiresAt: number;
  phase: "entry" | "exit";
  event: EventSummary;
}

interface CheckinResponse {
  phase: "entry" | "exit";
  event: EventSummary;
  attendance: Attendance;
  repeated?: boolean;
}

type Step =
  | { kind: "scanning" }
  | { kind: "login"; ticket: Ticket }
  | { kind: "locating"; ticket: Ticket }
  | { kind: "done"; result: CheckinResponse }
  | { kind: "error"; code: string; message: string; event?: EventSummary };

const ticketKey = (code: string) => `sfb_ticket:${code}`;

function storedTicket(code: string): Ticket | null {
  try {
    const raw = sessionStorage.getItem(ticketKey(code));
    if (!raw) return null;
    const t = JSON.parse(raw) as Ticket;
    return t.expiresAt > Date.now() ? t : null;
  } catch {
    return null;
  }
}

export function CheckInPage() {
  const { eventId = "", phase = "entry", code = "" } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>({ kind: "scanning" });
  const started = useRef(false);
  const submitting = useRef(false);

  // 1) Valida o QR no instante em que o link abre (antes do login).
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const saved = storedTicket(code);
    if (saved) {
      setStep({ kind: "login", ticket: saved });
      return;
    }
    api<Ticket>("/scan", { body: { eventId, phase, code } })
      .then((ticket) => {
        try {
          sessionStorage.setItem(ticketKey(code), JSON.stringify(ticket));
        } catch {
          /* sem storage: segue só em memória */
        }
        setStep({ kind: "login", ticket });
      })
      .catch((err: ApiError) => setStep({ kind: "error", code: err.code, message: err.message, event: err.data?.event }));
  }, [eventId, phase, code]);

  // 2) Com ticket e sessão de aluno, pega o GPS e conclui.
  useEffect(() => {
    if (step.kind !== "login" || authLoading || !user || submitting.current) return;
    if (user.role !== "student") {
      setStep({ kind: "error", code: "not_student", message: "Entre com uma conta de aluno para registrar presença." });
      return;
    }
    submitting.current = true;
    const { ticket } = step;
    setStep({ kind: "locating", ticket });
    (async () => {
      const gps = await getPosition();
      try {
        const result = await api<CheckinResponse>("/checkin", { body: { ticket: ticket.ticket, gps } });
        setStep({ kind: "done", result });
      } catch (err) {
        const e = err as ApiError;
        setStep({ kind: "error", code: e.code, message: e.message, event: e.data?.event ?? ticket.event });
      } finally {
        try {
          sessionStorage.removeItem(ticketKey(code));
        } catch {
          /* ignore */
        }
      }
    })();
  }, [step, user, authLoading, code]);

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <header className="flex justify-center px-4 py-4">
        <Logo />
      </header>
      <main className="flex flex-1 flex-col px-4 pb-8">
        {step.kind === "scanning" && <Working icon={<ScanLine className="size-12" />} text="Validando QR Code..." />}
        {step.kind === "login" && (authLoading || user) && <Working icon={<ScanLine className="size-12" />} text="QR válido!" />}
        {step.kind === "login" && !authLoading && !user && <LoginStep ticket={step.ticket} />}
        {step.kind === "locating" && (
          <Working icon={<MapPin className="size-12" />} text="Confirmando sua localização..." hint="Se o navegador pedir, permita o acesso à localização." />
        )}
        {step.kind === "done" && <SuccessResult result={step.result} />}
        {step.kind === "error" && <ErrorResult code={step.code} message={step.message} event={step.event} />}
      </main>
    </div>
  );
}

function Working({ icon, text, hint }: { icon: ReactNode; text: string; hint?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center" role="status">
      <div className="relative flex size-28 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        {icon}
        <Loader2 className="absolute size-28 animate-spin text-brand-200" strokeWidth={1} aria-hidden />
      </div>
      <p className="text-xl font-bold">{text}</p>
      {hint && <p className="max-w-xs text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

function useSecondsLeft(until: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return Math.max(0, Math.round((until - now) / 1000));
}

function LoginStep({ ticket }: { ticket: Ticket }) {
  const left = useSecondsLeft(ticket.expiresAt);
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, "0");
  return (
    <div className="mx-auto w-full max-w-sm space-y-4">
      <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-900 ring-1 ring-emerald-200">
        <p className="flex items-center gap-2 font-bold">
          <CheckCircle2 className="size-5" aria-hidden /> QR Code válido
        </p>
        <p className="mt-1 text-sm">{ticket.event.title}</p>
        <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold">
          <Clock className="size-4" aria-hidden /> Entre em até {mm}:{ss} para concluir
        </p>
      </div>
      <Card>
        <h1 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <LogIn className="size-5" aria-hidden /> Entre para registrar presença
        </h1>
        <LoginForm onSuccess={() => undefined} />
        <p className="mt-4 text-center text-sm text-slate-600">
          Sem conta?{" "}
          <Link
            to={`/cadastro?next=${encodeURIComponent(location.pathname)}`}
            className="font-semibold text-brand-700 hover:underline"
          >
            Criar conta
          </Link>
        </p>
      </Card>
    </div>
  );
}

function ResultScreen({
  tone,
  icon,
  title,
  children,
}: {
  tone: "green" | "amber" | "red" | "blue";
  icon: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  const tones = {
    green: "bg-emerald-600",
    amber: "bg-amber-500",
    red: "bg-red-600",
    blue: "bg-brand-700",
  };
  return (
    <div className="animate-result flex flex-1 flex-col items-center justify-center gap-5 text-center">
      <div className={cx("flex size-36 items-center justify-center rounded-full text-white shadow-xl", tones[tone])}>{icon}</div>
      <h1 className="max-w-sm text-3xl font-extrabold leading-tight">{title}</h1>
      <div className="w-full max-w-sm space-y-3 text-slate-600">{children}</div>
    </div>
  );
}

function SuccessResult({ result }: { result: CheckinResponse }) {
  const { attendance, event } = result;
  const eventLine = (
    <p className="text-lg">
      <span className="font-semibold text-slate-900">{event.title}</span>
    </p>
  );

  if (attendance.status === "completed") {
    return (
      <ResultScreen tone="green" icon={<CheckCircle2 className="size-20" strokeWidth={2.5} />} title="Presença confirmada!">
        {eventLine}
        <p className="text-4xl font-extrabold text-emerald-700">+{formatHours(event.hours)}</p>
        <p>{result.repeated ? "Você já tinha registrado esta etapa." : "As horas já entraram na sua conta."}</p>
        <Link to="/horas">
          <Button variant="success" className="mt-2 w-full">
            Ver minhas horas
          </Button>
        </Link>
      </ResultScreen>
    );
  }
  if (attendance.status === "suspect") {
    return (
      <ResultScreen tone="amber" icon={<TriangleAlert className="size-20" strokeWidth={2.5} />} title="Presença registrada, aguardando conferência">
        {eventLine}
        <p>Não conseguimos confirmar sua localização. O coordenador vai revisar e confirmar.</p>
        <MyEventsButton />
      </ResultScreen>
    );
  }
  if (attendance.status === "rejected") {
    return <ErrorResult code="attendance_rejected" message="Sua presença neste evento foi recusada pelo coordenador." event={event} />;
  }
  // Incompleta: falta a saída ou a palavra-chave.
  const keyword = event.checkinMode === "entry_keyword";
  return (
    <ResultScreen
      tone="blue"
      icon={keyword ? <KeyRound className="size-20" strokeWidth={2.5} /> : <Clock className="size-20" strokeWidth={2.5} />}
      title="Entrada registrada!"
    >
      {eventLine}
      <p className="text-lg font-semibold text-slate-800">
        {keyword
          ? "No final, digite a palavra-chave que o palestrante vai falar."
          : "Volte a ler o QR Code do telão no final do evento."}
      </p>
      <p className="text-sm">A presença só vale com as duas etapas.</p>
      <Link to={`/eventos/${event.id}`}>
        <Button className="mt-2 w-full">Abrir evento</Button>
      </Link>
    </ResultScreen>
  );
}

function MyEventsButton() {
  return (
    <Link to="/meus-eventos">
      <Button variant="secondary" className="mt-2 w-full">
        Ir para Meus eventos
      </Button>
    </Link>
  );
}

function ErrorResult({ code, message, event }: { code: string; message: string; event?: EventSummary }) {
  const eventLine = event && <p className="font-semibold text-slate-900">{event.title}</p>;
  switch (code) {
    case "qr_expired":
      return (
        <ResultScreen tone="red" icon={<TimerOff className="size-20" strokeWidth={2.5} />} title="QR Code expirado">
          {eventLine}
          <p className="text-lg font-semibold text-red-700">Presença NÃO registrada.</p>
          <p>Este código não vale mais. Leia o QR que está no telão agora.</p>
        </ResultScreen>
      );
    case "qr_invalid":
      return (
        <ResultScreen tone="red" icon={<ShieldX className="size-20" strokeWidth={2.5} />} title="QR Code inválido">
          <p className="text-lg font-semibold text-red-700">Presença NÃO registrada.</p>
          <p>Este código não foi gerado pelo telão do evento.</p>
        </ResultScreen>
      );
    case "device_reused":
      return (
        <ResultScreen tone="red" icon={<Smartphone className="size-20" strokeWidth={2.5} />} title="Aparelho já utilizado">
          {eventLine}
          <p className="text-lg font-semibold text-red-700">Presença NÃO registrada.</p>
          <p>Este celular já registrou presença de outra conta neste evento.</p>
        </ResultScreen>
      );
    case "phase_closed":
      return (
        <ResultScreen tone="red" icon={<Clock className="size-20" strokeWidth={2.5} />} title="Check-in fechado">
          {eventLine}
          <p>O coordenador ainda não abriu (ou já encerrou) esta etapa.</p>
        </ResultScreen>
      );
    case "ticket_expired":
    case "ticket_used":
    case "ticket_invalid":
      return (
        <ResultScreen tone="red" icon={<TimerOff className="size-20" strokeWidth={2.5} />} title="Leia o QR de novo">
          {eventLine}
          <p>{message}</p>
        </ResultScreen>
      );
    default:
      return (
        <ResultScreen tone="red" icon={<ShieldX className="size-20" strokeWidth={2.5} />} title="Não foi possível registrar">
          {eventLine}
          <p>{message}</p>
          <MyEventsButton />
        </ResultScreen>
      );
  }
}
