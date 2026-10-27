import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { homePathFor, useAuth } from "../auth/AuthContext";
import { Logo } from "../components/Logo";
import { Button, Card, ErrorBox, Field, Input, Select } from "../components/ui";
import { ApiError } from "../lib/api";
import { useApi } from "../lib/useApi";
import { safeNext } from "./LoginPage";

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const courses = useApi<{ courses: { id: string; name: string }[] }>("/courses");

  const [form, setForm] = useState({ name: "", ra: "", courseId: "", password: "" });
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={next ?? homePathFor(user.role)} replace />;

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const u = await register({ ...form, name: form.name.trim(), ra: form.ra.trim() });
      navigate(next ?? homePathFor(u.role), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? { message: err.message, field: err.data.field } : { message: "Erro ao criar conta." });
    } finally {
      setBusy(false);
    }
  }

  const fieldError = (f: string) => (error?.field === f ? error.message : undefined);

  return (
    <div className="flex min-h-dvh flex-col items-center gap-6 px-4 py-8">
      <Logo />
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 text-xl font-bold">Criar conta</h1>
        <p className="mb-5 text-sm text-slate-500">Leva menos de um minuto.</p>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nome completo" error={fieldError("name")}>
            <Input value={form.name} onChange={set("name")} autoComplete="name" required />
          </Field>
          <Field label="RA" error={fieldError("ra")}>
            <Input value={form.ra} onChange={set("ra")} inputMode="numeric" autoCapitalize="none" required />
          </Field>
          <Field label="Curso" error={fieldError("courseId")}>
            <Select value={form.courseId} onChange={set("courseId")} required>
              <option value="">Selecione...</option>
              {courses.data?.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Senha" hint="Pelo menos 6 caracteres." error={fieldError("password")}>
            <Input type="password" value={form.password} onChange={set("password")} autoComplete="new-password" minLength={6} required />
          </Field>
          {error && !error.field && <ErrorBox message={error.message} />}
          <Button type="submit" loading={busy} className="w-full">
            Criar conta e entrar
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-600">
          Já tem conta?{" "}
          <Link to={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-semibold text-brand-700 hover:underline">
            Entrar
          </Link>
        </p>
      </Card>
    </div>
  );
}
