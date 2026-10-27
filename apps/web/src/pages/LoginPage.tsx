import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { QrCode, ShieldCheck, Timer } from "lucide-react";
import { homePathFor, useAuth } from "../auth/AuthContext";
import { LoginForm } from "../components/LoginForm";
import { Logo } from "../components/Logo";
import { Card } from "../components/ui";

/** Só aceita caminhos internos como destino depois do login. */
export function safeNext(value: string | null): string | null {
  return value && /^\/(?![/\\])/.test(value) && !value.includes("\\") ? value : null;
}

export function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));

  if (user) return <Navigate to={next ?? homePathFor(user.role)} replace />;

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-brand-900 to-brand-800 lg:flex-row">
      <section className="flex flex-col justify-center gap-6 px-6 pb-10 pt-12 text-white lg:w-1/2 lg:px-16">
        <Logo light />
        <h1 className="text-3xl font-extrabold leading-tight lg:text-5xl">
          Presença sem fila.
          <br />
          <span className="text-accent">Horas sem burocracia.</span>
        </h1>
        <ul className="hidden space-y-3 text-brand-100 sm:block">
          <li className="flex items-center gap-3">
            <QrCode className="size-5 text-accent" aria-hidden /> Check-in por QR Code que muda a cada 10 segundos
          </li>
          <li className="flex items-center gap-3">
            <ShieldCheck className="size-5 text-accent" aria-hidden /> Travas contra print, distância e aparelho repetido
          </li>
          <li className="flex items-center gap-3">
            <Timer className="size-5 text-accent" aria-hidden /> Certificado de horas complementares na hora
          </li>
        </ul>
      </section>

      <section className="flex flex-1 items-start justify-center rounded-t-3xl bg-slate-50 px-4 py-8 lg:items-center lg:rounded-none">
        <Card className="w-full max-w-sm">
          <h2 className="mb-1 text-xl font-bold">Entrar</h2>
          <p className="mb-5 text-sm text-slate-500">Use seu RA e senha.</p>
          <LoginForm onSuccess={(u) => navigate(next ?? homePathFor(u.role), { replace: true })} />
          <p className="mt-5 text-center text-sm text-slate-600">
            Ainda não tem conta?{" "}
            <Link
              to={next ? `/cadastro?next=${encodeURIComponent(next)}` : "/cadastro"}
              className="font-semibold text-brand-700 hover:underline"
            >
              Criar conta
            </Link>
          </p>
        </Card>
      </section>
    </div>
  );
}
