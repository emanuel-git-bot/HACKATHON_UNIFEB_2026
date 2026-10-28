import { Link, NavLink, Outlet } from "react-router-dom";
import { Accessibility, CalendarDays, LogOut, Map as MapIcon, Megaphone, Settings, Trophy } from "lucide-react";
import { homePathFor, useAuth } from "../auth/AuthContext";
import { Logo } from "../components/Logo";
import { cx } from "../components/ui";

const COORD_LINKS = [
  { to: "/coord", label: "Eventos", icon: CalendarDays, end: true },
  { to: "/coord/avisos", label: "Avisos", icon: Megaphone, end: false },
];
const ORG_LINKS = [{ to: "/atletica", label: "Eventos da Atlética", icon: Trophy, end: true }];
const ADMIN_LINKS = [
  { to: "/admin", label: "Administração", icon: Settings, end: true },
  { to: "/admin/mapa", label: "Mapa", icon: MapIcon, end: false },
  { to: "/admin/avisos", label: "Avisos", icon: Megaphone, end: false },
  { to: "/admin/acessibilidade", label: "Acessibilidade", icon: Accessibility, end: false },
  { to: "/atletica", label: "Atlética", icon: Trophy, end: false },
];

export function StaffLayout() {
  const { user, logout } = useAuth();
  const home = user ? homePathFor(user.role) : "/";
  const links = user?.role === "admin" ? ADMIN_LINKS : user?.role === "organizer" ? ORG_LINKS : COORD_LINKS;
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
                {user?.role === "admin" ? "Administrador" : user?.role === "organizer" ? "Atlética / organização" : `Coordenação · ${user?.courseName ?? ""}`}
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
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4" aria-label="Seções">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cx(
                  "inline-flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-semibold",
                  isActive ? "border-gold-500 text-brand-900" : "border-transparent text-slate-500 hover:text-slate-800",
                )
              }
            >
              <Icon className="size-4" aria-hidden /> {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
