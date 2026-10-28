import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, KeyRound, Maximize, Pause, Play, Users } from "lucide-react";
import { Logo } from "../../components/Logo";
import { cx } from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import type { CheckinMode, Phase } from "../../lib/types";

interface QrState {
  title: string;
  mode: CheckinMode;
  windowMs: number;
  phase: Phase | null;
  code: string | null;
  msRemaining: number | null;
  count: number;
  keywordPhase?: boolean;
}

const POLL_MS = 1000;

export function TelaoPage() {
  const { id = "" } = useParams();
  const [qr, setQr] = useState<QrState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [bump, setBump] = useState(0);
  const lastCount = useRef<number | null>(null);

  async function load() {
    try {
      const data = await api<QrState>(`/coord/events/${id}/qr`);
      setQr(data);
      setError(null);
      setDeadline(data.msRemaining !== null ? Date.now() + data.msRemaining : null);
      if (lastCount.current !== null && data.count > lastCount.current) setBump((b) => b + 1);
      lastCount.current = data.count;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sem conexão com o servidor.");
    }
  }

  useEffect(() => {
    void load();
    const poll = window.setInterval(() => void load(), POLL_MS);
    const tick = window.setInterval(() => setNow(Date.now()), 100);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function setPhase(phase: Phase, open: boolean) {
    await api(`/coord/events/${id}/phase`, { body: { phase, open } }).catch((e: ApiError) => setError(e.message));
    await load();
  }

  const windowMs = qr?.windowMs ?? 10_000;
  const remaining = deadline !== null ? Math.max(0, deadline - now) : 0;
  const progress = remaining / windowMs;
  const url = qr?.code && qr.phase ? `${window.location.origin}/c/${id}/${qr.phase}/${qr.code}` : null;
  const phases: Phase[] = qr?.mode === "entry" ? ["entry"] : qr?.mode === "exit" ? ["exit"] : ["entry", "exit"];

  return (
    <div className="group relative flex min-h-dvh flex-col bg-slate-950 text-white">
      {/* Controles discretos: aparecem com o mouse. */}
      <div className="absolute inset-x-0 top-0 z-10 flex flex-wrap items-center justify-between gap-2 p-4 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
        <Link
          to={`/coord/eventos/${id}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-semibold hover:bg-white/20"
        >
          <ArrowLeft className="size-4" aria-hidden /> Sair do telão
        </Link>
        <div className="flex flex-wrap gap-2">
          {phases.map((p) => {
            const open = qr?.phase === p;
            const label = p === "entry" ? "entrada" : qr?.mode === "entry_keyword" ? "palavra-chave" : "saída";
            return (
              <button
                key={p}
                onClick={() => void setPhase(p, !open)}
                className={cx(
                  "inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold",
                  open ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700",
                )}
              >
                {open ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
                {open ? `Encerrar ${label}` : `Abrir ${label}`}
              </button>
            );
          })}
          <button
            onClick={() => void document.documentElement.requestFullscreen?.()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-semibold hover:bg-white/20"
          >
            <Maximize className="size-4" aria-hidden /> Tela cheia
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10 text-center">
        <div className="flex items-center gap-4">
          <Logo light />
          {qr?.phase && (
            <span
              className={cx(
                "rounded-full px-5 py-1.5 text-xl font-black tracking-[0.2em]",
                qr.phase === "entry" ? "bg-accent text-slate-950" : "bg-amber-400 text-slate-950",
              )}
            >
              {qr.phase === "entry" ? "ENTRADA" : qr.keywordPhase ? "PALAVRA-CHAVE" : "SAÍDA"}
            </span>
          )}
        </div>
        <h1 className="max-w-5xl text-3xl font-bold leading-tight text-slate-100 lg:text-5xl">{qr?.title ?? "Carregando..."}</h1>

        {error && <p className="rounded-xl bg-red-600/20 px-4 py-2 text-red-200">{error}</p>}

        {qr && !qr.phase && (
          <div className="flex h-[min(60vh,60vw)] w-[min(60vh,60vw)] items-center justify-center rounded-3xl border-4 border-dashed border-white/20 p-8">
            <p className="text-2xl font-semibold text-slate-400">
              Check-in fechado.
              <br />
              <span className="text-lg">Passe o mouse no topo e clique em “Abrir entrada”.</span>
            </p>
          </div>
        )}

        {qr?.keywordPhase && (
          <div className="flex max-w-3xl flex-col items-center gap-4 rounded-3xl bg-white/5 p-10 ring-1 ring-white/10">
            <KeyRound className="size-24 text-amber-400" aria-hidden />
            <p className="text-4xl font-extrabold">Digite a palavra-chave no app</p>
            <p className="text-xl text-slate-300">Abra o Campus FEB → Meus eventos → este evento, e digite a palavra dita pelo palestrante.</p>
          </div>
        )}

        {url && (
          <div className="relative">
            <CountdownRing progress={progress} />
            <div className="rounded-3xl bg-white p-5 shadow-2xl">
              <QRCodeSVG
                value={url}
                level="M"
                marginSize={0}
                className="h-[min(56vh,56vw)] w-[min(56vh,56vw)]"
                aria-label="QR Code de presença"
              />
            </div>
          </div>
        )}

        {qr?.phase && (
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {url && (
              <p className="text-2xl font-semibold text-slate-300">
                Novo código em <span className="font-black tabular-nums text-white">{Math.ceil(remaining / 1000)}s</span>
              </p>
            )}
            <p className="flex items-center gap-3 text-3xl font-semibold text-slate-200">
              <Users className="size-8 text-accent" aria-hidden />
              <span key={bump} className="animate-pop inline-block text-6xl font-black tabular-nums text-white">
                {qr.count}
              </span>
              presença{qr.count === 1 ? "" : "s"} {qr.phase === "entry" ? "na entrada" : "confirmada" + (qr.count === 1 ? "" : "s")}
            </p>
          </div>
        )}

        {url && <p className="max-w-full break-all text-sm text-slate-500">{url.replace(/^https?:\/\//, "")}</p>}
      </div>
    </div>
  );
}

/** Anel em volta do QR que esvazia em 10 segundos. */
function CountdownRing({ progress }: { progress: number }) {
  const r = 48;
  const circumference = 2 * Math.PI * r;
  return (
    <svg className="pointer-events-none absolute -inset-4 size-[calc(100%+2rem)] -rotate-90" viewBox="0 0 100 100" aria-hidden>
      <rect x="2" y="2" width="96" height="96" rx="12" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
      <rect
        x="2"
        y="2"
        width="96"
        height="96"
        rx="12"
        fill="none"
        stroke={progress < 0.3 ? "#f87171" : "#22d3ee"}
        strokeWidth="2"
        pathLength={circumference}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress)}
        style={{ transition: "stroke-dashoffset 100ms linear" }}
      />
    </svg>
  );
}
