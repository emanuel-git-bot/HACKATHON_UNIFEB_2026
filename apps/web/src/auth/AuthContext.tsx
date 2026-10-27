import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, api } from "../lib/api";
import type { Role, User } from "../lib/types";

interface RegisterInput {
  name: string;
  ra: string;
  courseId: string;
  password: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (ra: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ user: User }>("/auth/me")
      .then((r) => setUser(r.user))
      .catch((err) => {
        if (!(err instanceof ApiError) || err.status !== 401) console.warn(err);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (ra: string, password: string) => {
    const r = await api<{ user: User }>("/auth/login", { body: { ra, password } });
    setUser(r.user);
    return r.user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const r = await api<{ user: User }>("/auth/register", { body: input });
    setUser(r.user);
    return r.user;
  }, []);

  const logout = useCallback(async () => {
    await api("/auth/logout", { body: {} }).catch(() => undefined);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fora do AuthProvider");
  return ctx;
}

export function homePathFor(role: Role): string {
  if (role === "coordinator") return "/coord";
  if (role === "admin") return "/admin";
  return "/eventos";
}
