import { Link } from "react-router-dom";
import { Award, ChevronRight } from "lucide-react";
import { EmptyState, ErrorBox, Spinner } from "../../components/ui";
import { formatDate, formatHours } from "../../lib/format";
import { useApi } from "../../lib/useApi";

interface CertificateItem {
  id: string;
  hours: number;
  verificationCode: string;
  issuedAt: number;
  eventTitle: string;
  eventStartsAt: number;
  eventLocation: string;
}

export function HoursPage() {
  const { data, error, loading } = useApi<{ totalHours: number; certificates: CertificateItem[] }>("/me/certificates");

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-brand-900 to-brand-700 p-6 text-center text-white shadow-md">
        <p className="text-sm font-medium text-brand-100">Total de horas complementares</p>
        <p className="mt-1 text-6xl font-extrabold tracking-tight">{data ? formatHours(data.totalHours) : "—"}</p>
        <p className="mt-2 text-sm text-brand-100">
          {data ? `${data.certificates.length} certificado${data.certificates.length === 1 ? "" : "s"}` : ""}
        </p>
      </div>

      <h2 className="text-lg font-bold">Certificados</h2>
      {loading && <Spinner />}
      {error && <ErrorBox message={error.message} />}
      {data && data.certificates.length === 0 && (
        <EmptyState icon={<Award className="size-8" />} title="Nenhum certificado ainda">
          Participe de um evento e faça o check-in pelo QR Code do telão.
        </EmptyState>
      )}
      <ul className="space-y-3">
        {data?.certificates.map((c) => (
          <li key={c.id}>
            <Link
              to={`/certificados/${c.id}`}
              className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 hover:ring-brand-500"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Award className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{c.eventTitle}</span>
                <span className="block text-sm text-slate-500">
                  {formatDate(c.eventStartsAt)} · {c.verificationCode}
                </span>
              </span>
              <span className="font-extrabold text-emerald-700">+{formatHours(c.hours)}</span>
              <ChevronRight className="size-4 text-slate-400" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
