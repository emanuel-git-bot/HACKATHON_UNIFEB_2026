import { Link } from "react-router-dom";
import { CheckCircle2, ChevronRight, Timer } from "lucide-react";
import { EmptyState, ErrorBox, Spinner } from "../../components/ui";
import { formatDate, formatHours } from "../../lib/format";
import { useApi } from "../../lib/useApi";

interface HoursItem {
  attendanceId: string;
  eventId: string;
  hours: number;
  confirmedAt: number;
  eventTitle: string;
  eventStartsAt: number;
  eventLocation: string;
}

export function HoursPage() {
  const { data, error, loading } = useApi<{ totalHours: number; items: HoursItem[] }>("/me/hours");

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-brand-900 to-brand-700 p-6 text-center text-white shadow-md">
        <p className="text-sm font-medium text-brand-100">Total de horas complementares</p>
        <p className="mt-1 text-6xl font-extrabold tracking-tight">{data ? formatHours(data.totalHours) : "—"}</p>
        <p className="mt-2 text-sm text-brand-100">
          {data ? `${data.items.length} evento${data.items.length === 1 ? "" : "s"} com presença confirmada` : ""}
        </p>
      </div>

      <h2 className="text-lg font-bold">Presenças confirmadas</h2>
      {loading && <Spinner />}
      {error && <ErrorBox message={error.message} />}
      {data && data.items.length === 0 && (
        <EmptyState icon={<Timer className="size-8" />} title="Nenhuma hora ainda">
          Participe de um evento e faça o check-in pelo QR Code do telão.
        </EmptyState>
      )}
      <ul className="space-y-3">
        {data?.items.map((item) => (
          <li key={item.attendanceId}>
            <Link
              to={`/eventos/${item.eventId}`}
              className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 hover:ring-brand-500"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{item.eventTitle}</span>
                <span className="block text-sm text-slate-500">
                  {formatDate(item.eventStartsAt)} · {item.eventLocation}
                </span>
              </span>
              <span className="font-extrabold text-emerald-700">+{formatHours(item.hours)}</span>
              <ChevronRight className="size-4 text-slate-400" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
