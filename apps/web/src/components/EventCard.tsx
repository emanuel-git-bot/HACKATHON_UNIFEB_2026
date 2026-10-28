import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Clock, MapPin } from "lucide-react";
import { api } from "../lib/api";
import { CATEGORY_LABELS, formatHours, formatRange } from "../lib/format";
import type { StudentEvent } from "../lib/types";
import { Badge, Button, StatusBadge } from "./ui";

export function EventCard({ event, onChange }: { event: StudentEvent; onChange?: (registered: boolean) => void }) {
  const [busy, setBusy] = useState(false);
  const live = event.startsAt <= Date.now() && Date.now() <= event.endsAt;

  async function toggle() {
    setBusy(true);
    try {
      const r = await api<{ registered: boolean }>(`/events/${event.id}/register`, {
        method: event.registered ? "DELETE" : "POST",
        body: event.registered ? undefined : {},
      });
      onChange?.(r.registered);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge tone="brand">{CATEGORY_LABELS[event.category] ?? event.category}</Badge>
        {live && <Badge tone="red">● Acontecendo agora</Badge>}
        {event.attendance && <StatusBadge status={event.attendance.status} />}
      </div>
      <div className="flex items-start justify-between gap-3">
        <Link to={`/eventos/${event.id}`} className="group flex-1">
          <h3 className="text-base font-bold leading-snug text-slate-900 group-hover:text-brand-800">{event.title}</h3>
        </Link>
        <span className="shrink-0 rounded-xl bg-emerald-50 px-2.5 py-1 text-lg font-extrabold text-emerald-700 ring-1 ring-emerald-200">
          +{formatHours(event.hours)}
        </span>
      </div>
      <div className="mt-2 space-y-1 text-sm text-slate-600">
        <p className="flex items-center gap-1.5">
          <Clock className="size-4 text-slate-400" aria-hidden /> {formatRange(event.startsAt, event.endsAt)}
        </p>
        <Link
          to={`/mapa?q=${encodeURIComponent(event.location)}`}
          className="flex w-fit items-center gap-1.5 underline decoration-slate-300 underline-offset-2 hover:text-brand-800"
        >
          <MapPin className="size-4 text-slate-400" aria-hidden /> {event.location}
        </Link>
      </div>
      {onChange && !event.attendance && (
        <Button
          variant={event.registered ? "secondary" : "primary"}
          className="mt-4 w-full"
          onClick={toggle}
          loading={busy}
        >
          {event.registered ? (
            <>
              <Check className="size-4" aria-hidden /> Inscrito · cancelar
            </>
          ) : (
            "Inscrever-se"
          )}
        </Button>
      )}
    </article>
  );
}
