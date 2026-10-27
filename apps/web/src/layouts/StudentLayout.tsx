import { NavLink, Outlet } from "react-router-dom";
import { CalendarDays, ListChecks, LogOut, Timer } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Logo } from "../components/Logo";
import { cx } from "../components/ui";

const TABS = [
  { to: "/eventos", label: "Eventos", icon: CalendarDays },
  { to: "/meus-eventos", label: "Meus eventos", icon: ListChecks },
  { to: "/horas", label: "Horas", icon: Timer },
];

export function StudentLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-slate-50/90 px-4 py-3 backdrop-blur">
        <Logo />
        <button
          onClick={() => void logout()}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-slate-600 hover:bg-slate-100"
          aria-label={`Sair da conta de ${user?.name ?? ""}`}
        >
          <LogOut className="size-4" aria-hidden /> Sair
        </button>
      </header>

      <main className="flex-1 px-4 pb-28 pt-2">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Navegação principal"
      >
        <div className="mx-auto grid max-w-2xl grid-cols-3">
          {TABS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cx(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium",
                  isActive ? "text-brand-800" : "text-slate-500",
                )
              }
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
