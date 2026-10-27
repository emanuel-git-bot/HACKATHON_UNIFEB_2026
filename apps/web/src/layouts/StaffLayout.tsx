import { Link, Outlet } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Logo } from "../components/Logo";

export function StaffLayout() {
  const { user, logout } = useAuth();
  const home = user?.role === "admin" ? "/admin" : "/coord";
  return (
    <div className="min-h-dvh">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to={home} aria-label="Início">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
              <p className="text-xs text-slate-500">
                {user?.role === "admin" ? "Administrador" : `Coordenação · ${user?.courseName ?? ""}`}
              </p>
            </div>
            <button
              onClick={() => void logout()}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              <LogOut className="size-4" aria-hidden /> Sair
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
