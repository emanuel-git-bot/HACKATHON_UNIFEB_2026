import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../lib/api";
import type { User } from "../lib/types";
import { Button, ErrorBox, Field, Input } from "./ui";

export function LoginForm({ onSuccess }: { onSuccess: (user: User) => void }) {
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
