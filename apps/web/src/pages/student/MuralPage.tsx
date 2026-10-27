import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarX2, Camera, ChevronRight } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { EventCard } from "../../components/EventCard";
import { EmptyState, ErrorBox, Spinner, cx } from "../../components/ui";
import { formatHours } from "../../lib/format";
import type { StudentEvent } from "../../lib/types";
import { useApi } from "../../lib/useApi";

const FILTERS = [
  { id: "all", label: "Todos" },
  { id: "palestra", label: "Palestras" },
  { id: "minicurso", label: "Minicursos" },
  { id: "atletica", label: "Atlética" },
  { id: "grupo_estudo", label: "Grupos de estudo" },
];

export function MuralPage() {
  const { user } = useAuth();
  const events = useApi<{ events: StudentEvent[] }>("/events");
  const hours = useApi<{ totalHours: number }>("/me/certificates");
  const [filter, setFilter] = useState("all");

  const list = (events.data?.events ?? []).filter((e) => filter === "all" || e.category === filter);
  const firstName = user?.name.split(" ")[0] ?? "";

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-slate-500">Olá, {firstName} 👋</p>
        <h1 className="text-2xl font-bold tracking-tight">Eventos do UNIFEB</h1>
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

      <p className="flex items-center gap-2 rounded-xl bg-cyan-50 px-3 py-2.5 text-sm text-cyan-900 ring-1 ring-cyan-200">
        <Camera className="size-4 shrink-0" aria-hidden />
        No evento, aponte a câmera do celular para o QR Code do telão.
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

      {events.loading && <Spinner />}
      {events.error && <ErrorBox message={events.error.message} />}
      {!events.loading && list.length === 0 && (
        <EmptyState icon={<CalendarX2 className="size-8" />} title="Nenhum evento por aqui">
          Novos eventos aparecem assim que a coordenação publica.
        </EmptyState>
      )}
      <div className="space-y-3">
        {list.map((e) => (
          <EventCard
            key={e.id}
            event={e}
            onChange={(registered) =>
              events.setData((d) => d && { events: d.events.map((x) => (x.id === e.id ? { ...x, registered } : x)) })
            }
          />
        ))}
      </div>
    </div>
  );
}
