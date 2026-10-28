import { Link, NavLink, Outlet } from "react-router-dom";
import { CalendarDays, House, LogOut, Map as MapIcon, Megaphone, Users } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Logo } from "../components/Logo";
import { cx } from "../components/ui";
import { useApi } from "../lib/useApi";

const TABS = [
  { to: "/inicio", label: "Início", icon: House },
  { to: "/mapa", label: "Mapa", icon: MapIcon },
  { to: "/eventos", label: "Eventos", icon: CalendarDays },
  { to: "/grupos", label: "Grupos", icon: Users },
  { to: "/avisos", label: "Avisos", icon: Megaphone },
];

export function StudentLayout() {
  const { user, logout } = useAuth();
  const unread = useApi<{ unread: number }>("/announcements", 60_000).data?.unread ?? 0;
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-slate-50/90 px-4 py-3 backdrop-blur">
        <Link to="/inicio" aria-label="Início">
          <Logo />
        </Link>
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
        <div className="mx-auto grid max-w-2xl grid-cols-5">
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
              <span className="relative">
                <Icon className="size-5" aria-hidden />
                {to === "/avisos" && unread > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-4 text-white">
                    {unread}
                    <span className="sr-only"> avisos não lidos</span>
                  </span>
                )}
              </span>
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
