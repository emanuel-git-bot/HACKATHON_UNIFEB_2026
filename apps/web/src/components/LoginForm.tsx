import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../lib/api";
import type { User } from "../lib/types";
import { Button, ErrorBox, Field, Input } from "./ui";

/** Contas de demonstração do hackathon (as mesmas do README). Tirar depois da apresentação. */
const DEMO_ACCOUNTS = [
  { label: "Aluno", ra: "210345", password: "123456" },
  { label: "Coordenador", ra: "coord.ec", password: "coord@2026" },
  { label: "Admin", ra: "admin", password: "admin@sfb2026" },
] as const;

export function LoginForm({ onSuccess, showDemoAccounts = false }: { onSuccess: (user: User) => void; showDemoAccounts?: boolean }) {
  const { login } = useAuth();
  const [ra, setRa] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onSuccess(await login(ra.trim(), password));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {showDemoAccounts && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Entrar como (demonstração)</p>
          <div className="grid grid-cols-3 gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.label}
                type="button"
                onClick={() => {
                  setRa(account.ra);
                  setPassword(account.password);
                  setError(null);
                }}
                aria-pressed={ra === account.ra}
                className={`min-h-11 rounded-xl px-2 text-sm font-semibold ring-1 transition ${
                  ra === account.ra ? "bg-brand-900 text-white ring-brand-900" : "bg-white text-brand-800 ring-slate-300 hover:ring-brand-500"
                }`}
              >
                {account.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <Field label="RA ou login">
        <Input
          value={ra}
          onChange={(e) => setRa(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          inputMode="text"
          placeholder="Ex.: 210345"
          required
        />
      </Field>
      <Field label="Senha">
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </Field>
      {error && <ErrorBox message={error} />}
      <Button type="submit" loading={busy} className="w-full">
        Entrar
      </Button>
    </form>
  );
}
