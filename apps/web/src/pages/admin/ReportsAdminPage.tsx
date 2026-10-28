import { Link } from "react-router-dom";
import { Accessibility, Check, MapPin } from "lucide-react";
import { Badge, Button, EmptyState, ErrorBox, PageTitle, Spinner } from "../../components/ui";
import { api } from "../../lib/api";
import { timeAgo, type AccessibilityReport } from "../../lib/campus";
import { useApi } from "../../lib/useApi";

export function ReportsAdminPage() {
  const { data, error, loading, reload } = useApi<{ reports: AccessibilityReport[] }>("/accessibility-reports", 30_000);
  const open = data?.reports.filter((r) => r.status === "open").length ?? 0;

  async function resolve(id: string) {
    await api(`/accessibility-reports/${id}/resolve`, { body: {} });
    await reload();
  }

  return (
    <div>
      <PageTitle title="Relatos de acessibilidade" subtitle={`${open} em aberto. Os alunos veem quando você marca como resolvido.`} />
      {loading && <Spinner />}
      {error && <ErrorBox message={error.message} />}
      {data && data.reports.length === 0 && (
        <EmptyState icon={<Accessibility className="size-8" />} title="Nenhum relato" />
      )}
      <ul className="grid gap-3 md:grid-cols-2">
        {data?.reports.map((r) => (
          <li key={r.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="mb-2 flex items-center gap-2">
              {r.status === "resolved" ? <Badge tone="emerald">Resolvido</Badge> : <Badge tone="amber">Em aberto</Badge>}
              <span className="ml-auto text-xs text-slate-500">{timeAgo(r.createdAt)}</span>
            </div>
            <p className="flex items-center gap-1.5 font-semibold">
              <MapPin className="size-4 text-slate-400" aria-hidden /> {r.placeName ?? "Local não informado"}
            </p>
            <p className="mt-1 text-sm text-slate-700">{r.description}</p>
            <p className="mt-2 text-xs text-slate-500">Relatado por {r.userName}</p>
            <div className="mt-3 flex gap-2">
              {r.status === "open" && (
                <Button variant="success" onClick={() => void resolve(r.id)}>
                  <Check className="size-4" aria-hidden /> Marcar resolvido
                </Button>
              )}
              {r.placeId && (
                <Link to="/admin/mapa">
                  <Button variant="secondary">Ver no mapa</Button>
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
