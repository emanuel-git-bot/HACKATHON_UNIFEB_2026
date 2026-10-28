import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Logo } from "../components/Logo";
import { SocialEventCard } from "../components/SocialEventCard";
import { ErrorBox, Spinner } from "../components/ui";
import { homePathFor } from "../auth/AuthContext";
import type { SocialEvent } from "../lib/campus";
import { useApi } from "../lib/useApi";

/** Página pública do link que a Atlética manda no WhatsApp: ver o evento e confirmar presença. */
export function SocialEventPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, error, loading, setData } = useApi<{ event: SocialEvent }>(`/social-events/${id}`);

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="bg-brand-900 px-4 py-3">
        <div className="mx-auto max-w-lg">
          <Link to={user ? homePathFor(user.role) : "/login"} aria-label="Ir para o Campus FEB">
            <Logo light />
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-lg space-y-4 px-4 py-6">
        {user && (
          <Link to={user.role === "student" ? "/eventos" : homePathFor(user.role)} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-slate-600">
            <ArrowLeft className="size-4" aria-hidden /> Eventos
          </Link>
        )}
        <h1 className="text-2xl font-bold tracking-tight">Confirmar presença</h1>
        {loading && <Spinner />}
        {error && <ErrorBox message={error.status === 404 ? "Este evento não existe mais." : error.message} />}
        {data && <SocialEventCard event={data.event} showDescription onChange={(event) => setData({ event })} />}
        {!user && (
          <p className="text-center text-sm text-slate-500">
            Ainda não tem conta?{" "}
            <Link to={`/cadastro?next=${encodeURIComponent(`/confirmar/${id}`)}`} className="font-semibold text-brand-700 hover:underline">
              Crie com seu RA
            </Link>
          </p>
        )}
      </main>
    </div>
  );
}
