import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Clock, MapPin, Share2, Users } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { ApiError, api } from "../lib/api";
import { SOCIAL_KIND_INFO, whatsappShareUrl, type SocialEvent } from "../lib/campus";
import { formatShortDay, formatTime } from "../lib/format";
import { Badge, Button, ErrorBox, cx } from "./ui";

export const socialWhen = (e: SocialEvent) => `${formatShortDay(e.startsAt)} às ${formatTime(e.startsAt)}`;

/** Evento da Atlética: confirmar presença (sem horas complementares) e mandar no WhatsApp. */
export function SocialEventCard({
  event,
  onChange,
  showDescription = false,
}: {
  event: SocialEvent;
  onChange?: (event: SocialEvent) => void;
  showDescription?: boolean;
}) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const info = SOCIAL_KIND_INFO[event.kind];
  const started = event.startsAt <= Date.now();
  const full = event.capacity !== null && event.confirmed >= event.capacity;
  const left = event.capacity !== null ? event.capacity - event.confirmed : null;

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ event: SocialEvent }>(`/social-events/${event.id}/rsvp`, {
        method: event.isConfirmed ? "DELETE" : "POST",
        body: event.isConfirmed ? undefined : {},
      });
      onChange?.(r.event);
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={cx("rounded-2xl bg-white p-4 shadow-sm ring-1", event.isConfirmed ? "ring-emerald-300" : "ring-slate-200")}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge tone="amber">
          <span aria-hidden>{info.emoji}</span> {info.label}
        </Badge>
        <span className="text-xs font-medium text-slate-500">{event.organizerName}</span>
        {event.isConfirmed && (
          <Badge tone="emerald">
            <Check className="size-3" aria-hidden /> Você vai
          </Badge>
        )}
      </div>
      <Link to={`/confirmar/${event.id}`} className="group">
        <h3 className="text-base font-bold leading-snug text-slate-900 group-hover:text-brand-800">{event.title}</h3>
      </Link>
      {showDescription && event.description && <p className="mt-2 text-sm text-slate-700">{event.description}</p>}
      <div className="mt-2 space-y-1 text-sm text-slate-600">
        <p className="flex items-center gap-1.5">
          <Clock className="size-4 text-slate-400" aria-hidden /> {socialWhen(event)}
        </p>
        <Link
          to={event.placeId ? `/mapa?local=${event.placeId}` : `/mapa?q=${encodeURIComponent(event.location)}`}
          className="flex w-fit items-center gap-1.5 underline decoration-slate-300 underline-offset-2 hover:text-brand-800"
        >
          <MapPin className="size-4 text-slate-400" aria-hidden /> {event.location}
        </Link>
        <p className="flex items-center gap-1.5">
          <Users className="size-4 text-slate-400" aria-hidden />
          <span>
            <strong className="text-slate-800">{event.confirmed}</strong> confirmado{event.confirmed === 1 ? "" : "s"}
            {left !== null && <span className={cx("ml-1", left === 0 ? "text-red-600" : "text-emerald-700")}>· {left === 0 ? "lotado" : `${left} vagas`}</span>}
          </span>
        </p>
      </div>
      <p className="mt-2 text-xs text-slate-500">Não vale horas complementares.</p>

      {error && (
        <div className="mt-3">
          <ErrorBox message={error} />
        </div>
      )}

      <div className="mt-3 flex gap-2">
        {!user ? (
          <Link to={`/login?next=${encodeURIComponent(`/confirmar/${event.id}`)}`} className="flex-1">
            <Button className="w-full">Entrar para confirmar</Button>
          </Link>
        ) : user.role === "student" ? (
          <Button
            variant={event.isConfirmed ? "secondary" : "primary"}
            loading={busy}
            disabled={started || (!event.isConfirmed && full)}
            className="flex-1"
            onClick={() => void toggle()}
          >
            {started ? "Já começou" : event.isConfirmed ? "Cancelar presença" : full ? "Lotado" : "Confirmar presença"}
          </Button>
        ) : null}
        <a
          href={whatsappShareUrl(event, socialWhen(event))}
          target="_blank"
          rel="noreferrer"
          aria-label="Compartilhar no WhatsApp"
          className={cx(user && user.role !== "student" ? "flex-1" : "")}
        >
          <Button variant="success" className="w-full">
            <Share2 className="size-4" aria-hidden /> WhatsApp
          </Button>
        </a>
      </div>
    </article>
  );
}
