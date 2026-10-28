import { useParams } from "react-router-dom";
import { Printer } from "lucide-react";
import { Button, ErrorBox, Spinner } from "../../components/ui";
import { formatDate, formatHours, formatTime } from "../../lib/format";
import type { EventInfo } from "../../lib/types";
import { useApi } from "../../lib/useApi";

const EXTRA_BLANK_ROWS = 15;

export function PrintListPage() {
  const { id = "" } = useParams();
  const { data, error, loading } = useApi<{ event: EventInfo; registrants: { name: string; ra: string }[] }>(
    `/coord/events/${id}/print`,
  );
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error?.message ?? "Evento não encontrado."} />;
  const { event, registrants } = data;
  const rows = [...registrants, ...Array.from({ length: EXTRA_BLANK_ROWS }, () => null)];

  return (
    <div className="min-h-dvh bg-slate-200 py-6 print:bg-white print:py-0">
      <style>{`@page { size: A4 portrait; margin: 14mm; }`}</style>
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] justify-end px-4">
        <Button onClick={() => window.print()}>
          <Printer className="size-4" aria-hidden /> Imprimir
        </Button>
      </div>
      <article className="mx-auto max-w-[210mm] bg-white p-[14mm] text-black shadow print:max-w-none print:p-0 print:shadow-none">
        <header className="mb-5 border-b-2 border-black pb-3">
          <p className="text-xs font-semibold uppercase tracking-widest">UNIFEB · Lista de presença</p>
          <h1 className="mt-1 text-xl font-bold">{event.title}</h1>
          <p className="mt-1 text-sm">
            {formatDate(event.startsAt)}, {formatTime(event.startsAt)}–{formatTime(event.endsAt)} · {event.location} ·{" "}
            {formatHours(event.hours)} complementares
          </p>
        </header>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-10 border border-black px-2 py-1.5 text-left">Nº</th>
              <th className="border border-black px-2 py-1.5 text-left">Nome</th>
              <th className="w-28 border border-black px-2 py-1.5 text-left">RA</th>
              <th className="w-56 border border-black px-2 py-1.5 text-left">Assinatura</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="h-9 break-inside-avoid">
                <td className="border border-black px-2">{i + 1}</td>
                <td className="border border-black px-2">{r?.name ?? ""}</td>
                <td className="border border-black px-2 tabular-nums">{r?.ra ?? ""}</td>
                <td className="border border-black px-2" />
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-6 text-xs">
          Após o evento, lance as presenças no Campus FEB → Gerenciar evento → Lançamento manual.
        </p>
      </article>
    </div>
  );
}
