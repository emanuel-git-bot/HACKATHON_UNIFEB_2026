import { Link } from "react-router-dom";
import {
  Accessibility,
  BookOpen,
  Briefcase,
  CalendarDays,
  ChevronRight,
  Clock,
  GraduationCap,
  Map as MapIcon,
  Megaphone,
  Search,
  Users,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { Badge } from "../../components/ui";
import { ANNOUNCEMENT_INFO, SOCIAL_KIND_INFO, timeAgo, type Announcement, type SocialEvent, type StudyGroup } from "../../lib/campus";
import { formatHours, formatRange, formatShortDay, formatTime } from "../../lib/format";
import type { StudentEvent } from "../../lib/types";
import { useApi } from "../../lib/useApi";

const SHORTCUTS = [
  { to: "/mapa", label: "Mapa", icon: MapIcon, color: "bg-brand-800" },
  { to: "/grupos", label: "Grupos", icon: Users, color: "bg-emerald-600" },
  { to: "/materiais", label: "Materiais", icon: BookOpen, color: "bg-gold-600" },
  { to: "/calouro", label: "Guia do calouro", icon: GraduationCap, color: "bg-violet-600" },
  { to: "/acessibilidade", label: "Acessibilidade", icon: Accessibility, color: "bg-sky-700" },
  { to: "/avisos?filtro=vagas", label: "Vagas e estágios", icon: Briefcase, color: "bg-rose-600" },
];

export function HomePage() {
  const { user } = useAuth();
  const announcements = useApi<{ announcements: Announcement[]; unread: number }>("/announcements");
  const events = useApi<{ events: StudentEvent[] }>("/events");
  const groups = useApi<{ groups: StudyGroup[] }>("/groups");
  const hours = useApi<{ totalHours: number }>("/me/hours");
  const social = useApi<{ events: SocialEvent[] }>("/social-events");

  const firstName = user?.name.split(" ")[0] ?? "";
  const latest = announcements.data?.announcements.slice(0, 2) ?? [];
  const nextEvents = [
    ...(events.data?.events ?? [])
      .filter((e) => e.endsAt > Date.now())
      .map((e) => ({ id: e.id, to: `/eventos/${e.id}`, title: e.title, at: e.startsAt, line: `${formatRange(e.startsAt, e.endsAt)} · ${e.location}`, badge: `+${formatHours(e.hours)}`, emoji: null as string | null })),
    ...(social.data?.events ?? []).map((e) => ({ id: e.id, to: `/confirmar/${e.id}`, title: e.title, at: e.startsAt, line: `${formatShortDay(e.startsAt)} · ${formatTime(e.startsAt)} · ${e.location}`, badge: `${e.confirmed} vão`, emoji: SOCIAL_KIND_INFO[e.kind].emoji })),
  ]
    .sort((a, b) => a.at - b.at)
    .slice(0, 3);
  const myGroups = (groups.data?.groups ?? []).filter((g) => g.isMember).slice(0, 2);
  const unread = announcements.data?.unread ?? 0;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 p-5 text-white shadow-md">
        <p className="text-sm text-brand-100">Olá, {firstName} 👋</p>
        <h1 className="text-2xl font-bold tracking-tight">O que você procura hoje?</h1>
        <Link
          to="/mapa"
          className="mt-4 flex min-h-12 items-center gap-2 rounded-2xl bg-white px-4 text-slate-500 shadow-sm"
          aria-label="Buscar sala ou serviço no mapa"
        >
          <Search className="size-4" aria-hidden /> Buscar sala, bloco ou serviço...
        </Link>
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
          <span className="text-sm text-brand-100">Horas complementares</span>
          <Link to="/horas" className="text-2xl font-extrabold text-accent">
            {hours.data ? formatHours(hours.data.totalHours) : "—"}
          </Link>
        </div>
      </section>

      <nav aria-label="Atalhos" className="grid grid-cols-3 gap-3">
        {SHORTCUTS.map(({ to, label, icon: Icon, color }) => (
          <Link key={to} to={to} className="flex flex-col items-center gap-2 rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-200 hover:ring-brand-500">
            <span className={`flex size-11 items-center justify-center rounded-xl text-white ${color}`}>
              <Icon className="size-5" aria-hidden />
            </span>
            <span className="text-xs font-semibold leading-tight text-slate-700">{label}</span>
          </Link>
        ))}
      </nav>

      <Section title="Avisos" to="/avisos" badge={unread > 0 ? `${unread} novo${unread === 1 ? "" : "s"}` : undefined}>
        {latest.length === 0 ? (
          <Empty>Nenhum aviso por enquanto.</Empty>
        ) : (
          latest.map((a) => (
            <Link key={a.id} to="/avisos" className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 hover:ring-brand-500">
              <div className="mb-1 flex items-center gap-2">
                <Badge tone={ANNOUNCEMENT_INFO[a.category].tone}>{ANNOUNCEMENT_INFO[a.category].label}</Badge>
                {!a.isRead && <span className="size-2 rounded-full bg-gold-500" aria-label="Não lido" />}
                <span className="ml-auto text-xs text-slate-500">{timeAgo(a.createdAt)}</span>
              </div>
              <p className="font-semibold leading-snug">{a.title}</p>
              <p className="line-clamp-2 text-sm text-slate-600">{a.body}</p>
            </Link>
          ))
        )}
      </Section>

      <Section title="Próximos eventos" to="/eventos">
        {nextEvents.length === 0 ? (
          <Empty>Nenhum evento marcado.</Empty>
        ) : (
          nextEvents.map((e) => (
            <Link key={e.id} to={e.to} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 hover:ring-brand-500">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xl text-brand-800">
                {e.emoji ?? <CalendarDays className="size-5" aria-hidden />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{e.title}</span>
                <span className="block truncate text-xs text-slate-500">{e.line}</span>
              </span>
              <span className={e.emoji ? "text-sm font-bold text-slate-600" : "font-extrabold text-emerald-700"}>{e.badge}</span>
            </Link>
          ))
        )}
      </Section>

      <Section title="Seus grupos de estudo" to="/grupos">
        {myGroups.length === 0 ? (
          <Empty>
            Você ainda não entrou em nenhum grupo.{" "}
            <Link to="/grupos" className="font-semibold text-brand-700 underline">
              Ver grupos
            </Link>
          </Empty>
        ) : (
          myGroups.map((g) => (
            <Link key={g.id} to={`/grupos/${g.id}`} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 hover:ring-brand-500">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Users className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{g.title}</span>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="size-3" aria-hidden /> {formatShortDay(g.meetsAt)} · {formatTime(g.meetsAt)} · {g.place?.name ?? "Online"}
                </span>
              </span>
            </Link>
          ))
        )}
      </Section>
    </div>
  );
}

function Section({ title, to, badge, children }: { title: string; to: string; badge?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          {title === "Avisos" && <Megaphone className="size-5 text-gold-500" aria-hidden />}
          {title}
          {badge && <Badge tone="amber">{badge}</Badge>}
        </h2>
        <Link to={to} className="inline-flex min-h-10 items-center gap-0.5 text-sm font-semibold text-brand-700">
          Ver tudo <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border-2 border-dashed border-slate-200 px-4 py-5 text-center text-sm text-slate-500">{children}</p>;
}
