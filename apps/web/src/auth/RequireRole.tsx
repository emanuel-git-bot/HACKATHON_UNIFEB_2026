import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Spinner } from "../components/ui";
import type { Role } from "../lib/types";
import { homePathFor, useAuth } from "./AuthContext";

/** Sem sessão vai para o login (e volta depois); papel errado vai para a própria tela inicial. */
export function RequireRole({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (roles && !roles.includes(user.role)) return <Navigate to={homePathFor(user.role)} replace />;
  return <>{children}</>;
}

export function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return <Navigate to={user ? homePathFor(user.role) : "/login"} replace />;
}
