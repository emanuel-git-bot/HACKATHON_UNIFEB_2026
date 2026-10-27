import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BadgeCheck, SearchX } from "lucide-react";
import { Logo } from "../components/Logo";
import { Button, Card, Input, Spinner } from "../components/ui";
import { formatDate, formatHours } from "../lib/format";
import type { Certificate } from "../lib/types";
import { useApi } from "../lib/useApi";

export function VerifyPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(code ?? "");
  const { data, error, loading } = useApi<{ valid: boolean; certificate?: Certificate }>(
    code ? `/verify/${encodeURIComponent(code)}` : null,
  );

  function submit(e: FormEvent) {
    e.preventDefault();
    if (input.trim()) navigate(`/verificar/${input.trim().toUpperCase()}`);
  }

  const cert = data?.certificate;
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center gap-6 px-4 py-10">
      <Logo />
      <h1 className="text-center text-2xl font-bold">Verificação de certificado</h1>
      <form onSubmit={submit} className="flex w-full gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="SFB-XXXX-XXXX" className="font-mono uppercase" aria-label="Código de verificação" />
        <Button type="submit">Verificar</Button>
      </form>

      {loading && <Spinner label="Verificando..." />}
      {cert && (
        <Card className="w-full text-center ring-emerald-300">
          <BadgeCheck className="mx-auto size-14 text-emerald-600" aria-hidden />
          <p className="mt-2 text-xl font-extrabold text-emerald-700">Certificado autêntico</p>
          <dl className="mt-4 space-y-2 text-left text-sm">
            <Row label="Aluno" value={`${cert.studentName} (RA ${cert.studentRa})`} />
            <Row label="Evento" value={cert.eventTitle} />
            <Row label="Data e local" value={`${formatDate(cert.eventStartsAt)} · ${cert.eventLocation}`} />
            <Row label="Carga horária" value={formatHours(cert.hours)} />
            <Row label="Curso" value={cert.courseName} />
            <Row label="Emitido em" value={formatDate(cert.issuedAt)} />
            <Row label="Código" value={cert.verificationCode} />
          </dl>
        </Card>
      )}
      {code && error && (
        <Card className="w-full text-center">
          <SearchX className="mx-auto size-14 text-red-500" aria-hidden />
          <p className="mt-2 text-xl font-extrabold text-red-700">Certificado não encontrado</p>
          <p className="mt-1 text-sm text-slate-500">Confira se o código foi digitado corretamente.</p>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}
