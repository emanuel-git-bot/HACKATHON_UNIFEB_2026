import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { CertificateSheet } from "../components/CertificateSheet";
import { Button, ErrorBox, Spinner } from "../components/ui";
import type { Certificate } from "../lib/types";
import { useApi } from "../lib/useApi";

export function CertificatePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, error, loading } = useApi<{ certificate: Certificate }>(`/certificates/${id}`);

  return (
    <div className="min-h-dvh bg-slate-100 px-4 py-6 print:bg-white print:p-0">
      <style>{`@page { size: A4 landscape; margin: 0; }`}</style>
      <div className="no-print mx-auto mb-4 flex max-w-[297mm] items-center justify-between gap-3">
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
          className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-slate-600"
        >
          <ArrowLeft className="size-4" aria-hidden /> Voltar
        </button>
        {data && (
          <Button onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden /> Imprimir / salvar PDF
          </Button>
        )}
      </div>
      {loading && <Spinner />}
      {error && <ErrorBox message={error.message} />}
      {data && <CertificateSheet cert={data.certificate} />}
    </div>
  );
}
