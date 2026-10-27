import { Link } from "react-router-dom";
import { CalendarPlus, CalendarX2, Monitor, Settings2, TriangleAlert, Users } from "lucide-react";
import { Badge, Button, EmptyState, ErrorBox, PageTitle, Spinner } from "../../components/ui";
import { CATEGORY_LABELS, MODE_LABELS, formatHours, formatRange } from "../../lib/format";
import type { EventCounts, EventInfo } from "../../lib/types";
import { useApi } from "../../lib/useApi";

export function CoordDashboard() {
  const { data, error, loading } = useApi<{ events: (EventInfo & { counts: EventCounts })[] }>("/coord/events", 10_000);

  return (
    <div>
      <PageTitle
        title="Eventos do curso"
        subtitle="Crie eventos, projete o Telão e confira as presenças."
        action={
          <Link to="/coord/eventos/novo">
            <Button>
              <CalendarPlus className="size-4" aria-hidden /> Novo evento
            </Button>
          </Link>
        }
      />
      {loading && <Spinner />}
      {error && <ErrorBox message={error.message} />}
      {data && data.events.length === 0 && (
        <EmptyState icon={<CalendarX2 className="size-8" />} title="Nenhum evento ainda">
          Clique em “Novo evento” para criar o primeiro.
        </EmptyState>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {data?.events.map((e) => (
          <article key={e.id} className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone="brand">{CATEGORY_LABELS[e.category] ?? e.category}</Badge>
              {(e.entryOpen || e.exitOpen) && <Badge tone="emerald">● Check-in aberto</Badge>}
              {e.counts.suspect > 0 && (
                <Badge tone="amber">
                  <TriangleAlert className="size-3" aria-hidden /> {e.counts.suspect} suspeita{e.counts.suspect > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            <h2 className="text-lg font-bold leading-snug">{e.title}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {formatRange(e.startsAt, e.endsAt)} · {e.location} · +{formatHours(e.hours)}
            </p>
            <p className="mt-1 text-xs text-slate-500">{MODE_LABELS[e.checkinMode].title}</p>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              <Stat label="Inscritos" value={e.counts.registered} />
              <Stat label="Confirmadas" value={e.counts.completed} tone="text-emerald-700" />
              <Stat label="Incompletas" value={e.counts.incomplete} tone="text-sky-700" />
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to={`/coord/eventos/${e.id}/telao`} className="flex-1">
                <Button className="w-full">
                  <Monitor className="size-4" aria-hidden /> Abrir Telão
                </Button>
              </Link>
              <Link to={`/coord/eventos/${e.id}`} className="flex-1">
                <Button variant="secondary" className="w-full">
                  <Users className="size-4" aria-hidden /> Gerenciar
                </Button>
              </Link>
              <Link to={`/coord/eventos/${e.id}/editar`}>
                <Button variant="ghost" aria-label="Editar evento">
                  <Settings2 className="size-4" aria-hidden />
                </Button>
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "text-slate-900" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 py-2">
      <dd className={`text-2xl font-extrabold ${tone}`}>{value}</dd>
      <dt className="text-xs text-slate-500">{label}</dt>
    </div>
  );
}
