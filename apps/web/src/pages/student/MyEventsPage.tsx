import { ListChecks } from "lucide-react";
import { Link } from "react-router-dom";
import { EventCard } from "../../components/EventCard";
import { EmptyState, ErrorBox, PageTitle, Spinner } from "../../components/ui";
import type { StudentEvent } from "../../lib/types";
import { useApi } from "../../lib/useApi";

export function MyEventsPage() {
  const { data, error, loading } = useApi<{ events: StudentEvent[] }>("/me/events");
  return (
    <div>
      <PageTitle title="Meus eventos" subtitle="Inscrições e presenças registradas." />
      {loading && <Spinner />}
      {error && <ErrorBox message={error.message} />}
      {data && data.events.length === 0 && (
        <EmptyState icon={<ListChecks className="size-8" />} title="Você ainda não se inscreveu em nenhum evento">
          <Link to="/eventos" className="font-semibold text-brand-700">
            Ver eventos
          </Link>
        </EmptyState>
      )}
      <div className="space-y-3">
        {data?.events.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </div>
    </div>
  );
}
