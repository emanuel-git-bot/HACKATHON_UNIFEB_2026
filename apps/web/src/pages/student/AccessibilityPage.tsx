import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Accessibility, CheckCircle2, ChevronRight, Contrast, Send, Type, Wind } from "lucide-react";
import { Badge, Button, Card, ErrorBox, Field, PageTitle, Select, Textarea, cx } from "../../components/ui";
import { useA11yPrefs, type A11yPrefs } from "../../lib/a11y";
import { ApiError, api } from "../../lib/api";
import { ACCESSIBILITY_CATEGORIES, PLACE_INFO, placeSubtitle, timeAgo, type AccessibilityReport, type Place } from "../../lib/campus";
import { useApi } from "../../lib/useApi";

const GROUP_TITLES: Record<string, string> = {
  accessible_restroom: "Banheiros acessíveis",
  ramp: "Rampas",
  accessible_parking: "Vagas PcD",
};

const PREFS: { key: keyof A11yPrefs; label: string; detail: string; icon: typeof Type }[] = [
  { key: "large", label: "Letras maiores", detail: "Aumenta o texto do app inteiro.", icon: Type },
  { key: "contrast", label: "Alto contraste", detail: "Fundo branco e texto mais escuro.", icon: Contrast },
  { key: "reduceMotion", label: "Menos animações", detail: "Desliga efeitos de movimento.", icon: Wind },
];

export function AccessibilityPage() {
  const [params] = useSearchParams();
  const places = useApi<{ places: Place[] }>("/places");
  const reports = useApi<{ reports: AccessibilityReport[] }>("/accessibility-reports");
  const { prefs, update } = useA11yPrefs();
  const all = places.data?.places ?? [];
  const accessible = all.filter((p) => ACCESSIBILITY_CATEGORIES.includes(p.category));

  useEffect(() => {
    if (params.get("local")) document.getElementById("relatar")?.scrollIntoView({ behavior: "smooth" });
  }, [params, places.data]);

  return (
    <div className="space-y-5">
      <PageTitle title="Acessibilidade" subtitle="Rotas, banheiros acessíveis e ajustes do app." />

      <Card>
        <h2 className="mb-3 font-bold">Ajustes de leitura</h2>
        <ul className="space-y-2">
          {PREFS.map(({ key, label, detail, icon: Icon }) => (
            <li key={key}>
              <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl p-2 hover:bg-slate-50">
                <Icon className="size-5 shrink-0 text-brand-700" aria-hidden />
                <span className="flex-1">
                  <span className="block font-semibold">{label}</span>
                  <span className="block text-sm text-slate-500">{detail}</span>
                </span>
                <input type="checkbox" role="switch" className="size-6 accent-brand-800" checked={prefs[key]} onChange={(e) => update({ [key]: e.target.checked })} />
              </label>
            </li>
          ))}
        </ul>
      </Card>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold">Pontos acessíveis do campus</h2>
          <Link to="/mapa?filtro=a11y" className="text-sm font-semibold text-brand-700 hover:underline">
            Ver no mapa
          </Link>
        </div>
        {ACCESSIBILITY_CATEGORIES.map((cat) => {
          const items = accessible.filter((p) => p.category === cat);
          if (items.length === 0) return null;
          const info = PLACE_INFO[cat];
          const Icon = info.icon;
          return (
            <div key={cat} className="mb-3">
              <h3 className="mb-1.5 flex items-center gap-2 text-sm font-bold text-slate-600">
                <Icon className="size-4" aria-hidden /> {GROUP_TITLES[cat]}
              </h3>
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                {items.map((p) => (
                  <li key={p.id}>
                    <Link to={`/mapa?local=${p.id}`} className="flex min-h-12 items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{p.name}</span>
                        <span className="block truncate text-xs text-slate-500">{p.description || placeSubtitle(p)}</span>
                      </span>
                      <ChevronRight className="size-4 text-slate-400" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      <div id="relatar" className="scroll-mt-20">
        <ReportForm places={all} initialPlace={params.get("local") ?? ""} onSent={() => void reports.reload()} />
      </div>

      {reports.data && reports.data.reports.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-bold">Seus relatos</h2>
          <ul className="space-y-2">
            {reports.data.reports.map((r) => (
              <li key={r.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="mb-1 flex items-center gap-2">
                  {r.status === "resolved" ? <Badge tone="emerald">Resolvido</Badge> : <Badge tone="amber">Em análise</Badge>}
                  <span className="ml-auto text-xs text-slate-500">{timeAgo(r.createdAt)}</span>
                </div>
                <p className="text-sm font-semibold">{r.placeName ?? "Local não informado"}</p>
                <p className="text-sm text-slate-600">{r.description}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ReportForm({ places, initialPlace, onSent }: { places: Place[]; initialPlace: string; onSent: () => void }) {
  const [placeId, setPlaceId] = useState(initialPlace);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => setPlaceId(initialPlace), [initialPlace]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/accessibility-reports", { body: { placeId: placeId || null, description } });
      setDescription("");
      setSent(true);
      onSent();
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className={cx(sent && "ring-emerald-300")}>
      <h2 className="mb-1 flex items-center gap-2 font-bold">
        <Accessibility className="size-5 text-brand-700" aria-hidden /> Relatar um problema
      </h2>
      <p className="mb-3 text-sm text-slate-500">Rampa bloqueada, banheiro acessível fechado, piso quebrado... A administração recebe na hora.</p>
      {sent && (
        <p className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800" role="status">
          <CheckCircle2 className="size-4" aria-hidden /> Relato enviado. Obrigado por ajudar!
        </p>
      )}
      <form onSubmit={submit} className="space-y-3">
        <Field label="Onde">
          <Select value={placeId} onChange={(e) => setPlaceId(e.target.value)}>
            <option value="">Escolha o local</option>
            {places.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="O que aconteceu">
          <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} required minLength={5} />
        </Field>
        {error && <ErrorBox message={error} />}
        <Button type="submit" loading={busy} className="w-full">
          <Send className="size-4" aria-hidden /> Enviar relato
        </Button>
      </form>
    </Card>
  );
}
