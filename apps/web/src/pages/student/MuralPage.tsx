import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarX2, Camera, ChevronRight } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { EventCard } from "../../components/EventCard";
import { SocialEventCard } from "../../components/SocialEventCard";
import { EmptyState, ErrorBox, Spinner, cx } from "../../components/ui";
import type { SocialEvent } from "../../lib/campus";
import { formatHours } from "../../lib/format";
import type { StudentEvent } from "../../lib/types";
import { useApi } from "../../lib/useApi";

const FILTERS = [
  { id: "all", label: "Todos" },
  { id: "palestras", label: "Palestras (valem horas)" },
  { id: "atletica", label: "Atlética" },
] as const;

type Item = { kind: "academic"; at: number; event: StudentEvent } | { kind: "social"; at: number; event: SocialEvent };

export function MuralPage() {
  const { user } = useAuth();
  const events = useApi<{ events: StudentEvent[] }>("/events");
  const social = useApi<{ events: SocialEvent[] }>("/social-events");
  const hours = useApi<{ totalHours: number }>("/me/hours");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  const items: Item[] = [
    ...(filter !== "atletica" ? (events.data?.events ?? []).map((e) => ({ kind: "academic" as const, at: e.startsAt, event: e })) : []),
    ...(filter !== "palestras" ? (social.data?.events ?? []).map((e) => ({ kind: "social" as const, at: e.startsAt, event: e })) : []),
  ].sort((a, b) => a.at - b.at);
  const firstName = user?.name.split(" ")[0] ?? "";
  const loading = events.loading || social.loading;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-slate-500">Olá, {firstName} 👋</p>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Eventos do UNIFEB</h1>
          <Link to="/meus-eventos" className="shrink-0 text-sm font-semibold text-brand-700 hover:underline">
            Meus eventos
          </Link>
        </div>
      </div>

      <Link
        to="/horas"
        className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-brand-800 to-brand-600 p-5 text-white shadow-md"
      >
        <div>
          <p className="text-sm text-brand-100">Suas horas complementares</p>
          <p className="text-4xl font-extrabold">{hours.data ? formatHours(hours.data.totalHours) : "—"}</p>
        </div>
        <ChevronRight className="size-6 text-brand-100" aria-hidden />
      </Link>

      <p className="flex items-center gap-2 rounded-xl bg-gold-50 px-3 py-2.5 text-sm text-gold-700 ring-1 ring-gold-100">
        <Camera className="size-4 shrink-0" aria-hidden />
        Nas palestras, aponte a câmera para o QR Code do telão para ganhar as horas.
      </p>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Filtrar por tipo">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={cx(
              "min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold ring-1 transition",
              filter === f.id ? "bg-brand-800 text-white ring-brand-800" : "bg-white text-slate-700 ring-slate-300",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <Spinner />}
      {events.error && <ErrorBox message={events.error.message} />}
      {!loading && items.length === 0 && (
        <EmptyState icon={<CalendarX2 className="size-8" />} title="Nenhum evento por aqui">
          Novos eventos aparecem assim que a coordenação ou a Atlética publicam.
        </EmptyState>
      )}
      <div className="space-y-3">
        {items.map((item) =>
          item.kind === "academic" ? (
            <EventCard
              key={item.event.id}
              event={item.event}
              onChange={(registered) =>
                events.setData((d) => d && { events: d.events.map((x) => (x.id === item.event.id ? { ...x, registered } : x)) })
              }
            />
          ) : (
            <SocialEventCard
              key={item.event.id}
              event={item.event}
              onChange={(updated) => social.setData((d) => d && { events: d.events.map((x) => (x.id === updated.id ? updated : x)) })}
            />
          ),
        )}
      </div>
    </div>
  );
}
