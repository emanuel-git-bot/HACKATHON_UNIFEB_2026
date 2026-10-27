import { QRCodeSVG } from "qrcode.react";
import { formatDate, formatHours } from "../lib/format";
import type { Certificate } from "../lib/types";
import { Logo } from "./Logo";

/** Certificado em A4 paisagem, igual na tela e na impressão. */
export function CertificateSheet({ cert }: { cert: Certificate }) {
  const verifyUrl = `${window.location.origin}/verificar/${cert.verificationCode}`;
  return (
    <article className="relative mx-auto aspect-[297/210] w-full max-w-[297mm] overflow-hidden bg-white text-slate-900 shadow-xl ring-1 ring-slate-200 print:shadow-none print:ring-0">
      <div className="absolute inset-[3%] rounded-lg border-[3px] border-brand-800" />
      <div className="absolute inset-[4.2%] rounded border border-brand-200" />
      <div className="relative flex h-full flex-col items-center justify-between px-[9%] py-[7%] text-center">
        <div className="flex flex-col items-center gap-[0.6em]">
          <Logo />
          <p className="text-[clamp(10px,1.4vw,14px)] font-semibold uppercase tracking-[0.3em] text-brand-700">
            UNIFEB · Atividades complementares
          </p>
          <h1 className="text-[clamp(22px,4vw,44px)] font-extrabold tracking-tight">Certificado</h1>
        </div>

        <p className="max-w-[85%] text-[clamp(11px,1.7vw,19px)] leading-relaxed text-slate-700">
          Certificamos que <strong className="text-slate-900">{cert.studentName}</strong> (RA {cert.studentRa}) participou de{" "}
          <strong className="text-slate-900">{cert.eventTitle}</strong>, realizado em {formatDate(cert.eventStartsAt)}, no local{" "}
          {cert.eventLocation}, com carga horária de{" "}
          <strong className="text-slate-900">{formatHours(cert.hours)}</strong> de atividades complementares.
        </p>

        <div className="flex w-full items-end justify-between gap-4 text-left">
          <div className="text-[clamp(9px,1.2vw,13px)] text-slate-600">
            <p>Emitido em {formatDate(cert.issuedAt)} · {cert.courseName}</p>
            <p className="mt-1">
              Código de verificação: <strong className="font-mono text-slate-900">{cert.verificationCode}</strong>
            </p>
            <p className="mt-1 break-all">{verifyUrl.replace(/^https?:\/\//, "")}</p>
          </div>
          <QRCodeSVG value={verifyUrl} level="M" marginSize={0} className="size-[clamp(56px,10vw,110px)] shrink-0" />
        </div>
      </div>
    </article>
  );
}
