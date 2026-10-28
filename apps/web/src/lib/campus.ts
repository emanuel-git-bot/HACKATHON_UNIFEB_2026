import {
  Accessibility,
  BookOpen,
  Building2,
  Car,
  DoorOpen,
  FlaskConical,
  HeartPulse,
  Landmark,
  Mountain,
  ParkingCircle,
  Theater,
  Trophy,
  UtensilsCrossed,
  Toilet,
  type LucideIcon,
} from "lucide-react";

export type PlaceCategory =
  | "block"
  | "classroom"
  | "lab"
  | "library"
  | "food"
  | "office"
  | "health"
  | "sports"
  | "auditorium"
  | "parking"
  | "restroom"
  | "accessible_restroom"
  | "ramp"
  | "accessible_parking";

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  description: string;
  building: string | null;
  floor: string | null;
  lat: number;
  lng: number;
  accessible: boolean;
  openingHours: string | null;
  phone: string | null;
}

export const CAMPUS_CENTER = { lat: -20.5745, lng: -48.5617 };

export const PLACE_INFO: Record<PlaceCategory, { label: string; icon: LucideIcon; color: string }> = {
  block: { label: "Bloco", icon: Building2, color: "#1b2a63" },
  classroom: { label: "Sala de aula", icon: DoorOpen, color: "#34499c" },
  lab: { label: "Laboratório", icon: FlaskConical, color: "#7c3aed" },
  library: { label: "Biblioteca", icon: BookOpen, color: "#b88c1b" },
  food: { label: "Alimentação", icon: UtensilsCrossed, color: "#ea580c" },
  office: { label: "Atendimento", icon: Landmark, color: "#0f766e" },
  health: { label: "Saúde", icon: HeartPulse, color: "#dc2626" },
  sports: { label: "Esporte", icon: Trophy, color: "#16a34a" },
  auditorium: { label: "Auditório / teatro", icon: Theater, color: "#9333ea" },
  parking: { label: "Estacionamento", icon: Car, color: "#475569" },
  restroom: { label: "Banheiro", icon: Toilet, color: "#0284c7" },
  accessible_restroom: { label: "Banheiro acessível", icon: Accessibility, color: "#0369a1" },
  ramp: { label: "Rampa", icon: Mountain, color: "#0369a1" },
  accessible_parking: { label: "Vaga PcD", icon: ParkingCircle, color: "#0369a1" },
};

export const ACCESSIBILITY_CATEGORIES: PlaceCategory[] = ["accessible_restroom", "ramp", "accessible_parking"];

export const isAccessibilityPlace = (p: Place) => p.accessible || ACCESSIBILITY_CATEGORIES.includes(p.category);

/** Filtros rápidos do mapa. */
export const MAP_FILTERS: { id: string; label: string; match: (p: Place) => boolean }[] = [
  { id: "all", label: "Tudo", match: () => true },
  { id: "classes", label: "Blocos e salas", match: (p) => ["block", "classroom", "lab", "auditorium"].includes(p.category) },
  { id: "services", label: "Serviços", match: (p) => ["office", "library", "health"].includes(p.category) },
  { id: "food", label: "Comer", match: (p) => p.category === "food" },
  { id: "restroom", label: "Banheiros", match: (p) => p.category === "restroom" || p.category === "accessible_restroom" },
  { id: "a11y", label: "Acessibilidade", match: (p) => ACCESSIBILITY_CATEGORIES.includes(p.category) },
];

export function placeSubtitle(p: Place): string {
  return [PLACE_INFO[p.category]?.label, p.building, p.floor].filter(Boolean).join(" · ");
}

/** Rota a pé no Google Maps a partir de onde o aluno está. */
export const walkingRouteUrl = (p: Place) =>
  `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=walking`;

/** Mesma regra do core: sem acento, sem caixa, todas as palavras em qualquer ordem. */
export function matchesSearch(query: string, ...fields: (string | null | undefined)[]): boolean {
  const key = (t: string) =>
    t
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase();
  const words = key(query).split(/\s+/).filter(Boolean);
  const hay = key(fields.filter(Boolean).join(" "));
  return words.every((w) => hay.includes(w));
}

// ---------- Grupos, avisos e recursos ----------

export interface StudyGroup {
  id: string;
  title: string;
  subject: string;
  description: string;
  meetsAt: number;
  place: { id: string; name: string | null; building: string | null } | null;
  onlineUrl: string | null;
  maxMembers: number;
  members: number;
  isMember: boolean;
  isOwner: boolean;
  ownerName: string;
  courseId: string | null;
  courseName: string | null;
}

export type AnnouncementCategory = "notice" | "exam" | "event" | "internship" | "job" | "urgent";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  pinned: boolean;
  createdAt: number;
  authorName: string;
  courseId: string | null;
  courseName: string | null;
  company: string | null;
  linkUrl: string | null;
  deadlineAt: number | null;
  isRead: boolean;
  canDelete: boolean;
}

export const ANNOUNCEMENT_INFO: Record<AnnouncementCategory, { label: string; tone: "slate" | "brand" | "amber" | "emerald" | "red" }> = {
  notice: { label: "Aviso", tone: "brand" },
  exam: { label: "Prova", tone: "amber" },
  event: { label: "Evento", tone: "emerald" },
  internship: { label: "Estágio", tone: "emerald" },
  job: { label: "Emprego", tone: "emerald" },
  urgent: { label: "Urgente", tone: "red" },
};

export type ResourceKind = "summary" | "handout" | "book" | "link" | "other";

export interface SharedResource {
  id: string;
  title: string;
  subject: string;
  kind: ResourceKind;
  description: string;
  url: string | null;
  createdAt: number;
  ownerName: string;
  ownerCourse: string | null;
  courseOnly: boolean;
  canDelete: boolean;
}

export const RESOURCE_LABELS: Record<ResourceKind, string> = {
  summary: "Resumo",
  handout: "Apostila",
  book: "Livro para emprestar",
  link: "Link útil",
  other: "Outro",
};

export interface AccessibilityReport {
  id: string;
  placeId: string | null;
  placeName: string | null;
  userName: string;
  description: string;
  status: "open" | "resolved";
  createdAt: number;
  resolvedAt: number | null;
}

/** "há 3 h", "há 2 dias"... */
export function timeAgo(ms: number, now = Date.now()): string {
  const min = Math.round((now - ms) / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return `há ${d} dia${d === 1 ? "" : "s"}`;
}

export const isOpportunity = (a: { category: AnnouncementCategory }) => a.category === "internship" || a.category === "job";

// ---------- Eventos da Atlética ----------

export type SocialEventKind = "futsal" | "basketball" | "volleyball" | "handball" | "party" | "other";

export const SOCIAL_KIND_INFO: Record<SocialEventKind, { label: string; emoji: string }> = {
  futsal: { label: "Futsal / futebol", emoji: "⚽" },
  basketball: { label: "Basquete", emoji: "🏀" },
  volleyball: { label: "Vôlei", emoji: "🏐" },
  handball: { label: "Handebol", emoji: "🤾" },
  party: { label: "Integração / festa", emoji: "🎉" },
  other: { label: "Outro", emoji: "📣" },
};

export interface SocialEvent {
  id: string;
  kind: SocialEventKind;
  title: string;
  description: string;
  startsAt: number;
  placeId: string | null;
  location: string;
  capacity: number | null;
  confirmed: number;
  isConfirmed: boolean;
  organizerName: string;
  canManage: boolean;
}

/** Link público de confirmação, o mesmo que vai para os grupos de WhatsApp. */
export const confirmUrl = (event: { id: string }) => `${window.location.origin}/confirmar/${event.id}`;

/** Abre o WhatsApp com a mensagem pronta para o aluno ou a Atlética mandar nos grupos. */
export function whatsappShareUrl(event: SocialEvent, when: string): string {
  const info = SOCIAL_KIND_INFO[event.kind];
  const text = [
    `${info.emoji} *${event.title}*`,
    `${event.organizerName}`,
    "",
    `📅 ${when}`,
    `📍 ${event.location}`,
    event.capacity ? `👥 ${event.capacity} vagas` : null,
    "",
    `Confirme sua presença: ${confirmUrl(event)}`,
  ]
    .filter((line) => line !== null)
    .join("\n");
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
