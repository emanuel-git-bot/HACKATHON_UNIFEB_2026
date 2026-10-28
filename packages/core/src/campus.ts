/** Regras do Campus FEB que não dependem de banco nem de framework. */

export const PLACE_CATEGORIES = [
  "block",
  "classroom",
  "lab",
  "library",
  "food",
  "office",
  "health",
  "sports",
  "auditorium",
  "parking",
  "restroom",
  "accessible_restroom",
  "ramp",
  "accessible_parking",
] as const;
export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];

/** Categorias que formam a camada de acessibilidade do mapa. */
export const ACCESSIBILITY_CATEGORIES: readonly PlaceCategory[] = ["accessible_restroom", "ramp", "accessible_parking"];

export function isAccessibilityPlace(place: { category: string; accessible: boolean }): boolean {
  return place.accessible || (ACCESSIBILITY_CATEGORIES as readonly string[]).includes(place.category);
}

export const ANNOUNCEMENT_CATEGORIES = ["notice", "exam", "event", "internship", "job", "urgent"] as const;
export type AnnouncementCategory = (typeof ANNOUNCEMENT_CATEGORIES)[number];

/** Vagas de estágio e emprego: aparecem no filtro "Vagas" e têm empresa, link e prazo. */
export const OPPORTUNITY_CATEGORIES: readonly AnnouncementCategory[] = ["internship", "job"];

/** Modalidades dos eventos da Atlética (sem horas complementares, só confirmação de presença). */
export const SOCIAL_EVENT_KINDS = ["futsal", "basketball", "volleyball", "handball", "party", "other"] as const;
export type SocialEventKind = (typeof SOCIAL_EVENT_KINDS)[number];

export const RESOURCE_KINDS = ["summary", "handout", "book", "link", "other"] as const;
export type ResourceKind = (typeof RESOURCE_KINDS)[number];

export type JoinBlock = "already_member" | "full" | "past";

export type RsvpBlock = "already_confirmed" | "full" | "started";

/** Diz se o aluno pode confirmar presença no evento; `capacity` nulo = sem limite. */
export function rsvpBlock(input: {
  isConfirmed: boolean;
  confirmed: number;
  capacity: number | null;
  startsAt: number;
  now: number;
}): RsvpBlock | null {
  if (input.isConfirmed) return "already_confirmed";
  if (input.startsAt <= input.now) return "started";
  if (input.capacity !== null && input.confirmed >= input.capacity) return "full";
  return null;
}

/** Diz se o aluno pode entrar no grupo; `null` quando pode. */
export function groupJoinBlock(input: {
  isMember: boolean;
  members: number;
  maxMembers: number;
  meetsAt: number;
  now: number;
}): JoinBlock | null {
  if (input.isMember) return "already_member";
  if (input.meetsAt < input.now) return "past";
  if (input.members >= input.maxMembers) return "full";
  return null;
}

/** Normaliza texto para busca: minúsculas e sem acentos. */
export function searchKey(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

/** Busca simples por todas as palavras digitadas, em qualquer ordem. */
export function matchesSearch(query: string, ...fields: (string | null | undefined)[]): boolean {
  const words = searchKey(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = searchKey(fields.filter(Boolean).join(" "));
  return words.every((w) => haystack.includes(w));
}

export interface SiteBanner {
  imageUrl: string;
  linkUrl: string | null;
}

const SITE_ORIGIN = "https://www.unifeb.edu.br";

/** Troca http e o domínio sem "www" pelo endereço https que funciona. */
function normalizeSiteUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  try {
    const url = new URL(value, SITE_ORIGIN);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.hostname === "unifeb.edu.br") url.hostname = "www.unifeb.edu.br";
    if (url.hostname === "www.unifeb.edu.br") url.protocol = "https:";
    return url.toString();
  } catch {
    return null;
  }
}

/** Lê os banners do carrossel da página inicial do UNIFEB (`#oc-slider`). */
export function parseUnifebBanners(html: string): SiteBanner[] {
  const start = html.indexOf('id="oc-slider"');
  if (start === -1) return [];
  const end = html.indexOf("</section>", start);
  const slider = html.slice(start, end === -1 ? undefined : end);
  const banners: SiteBanner[] = [];
  const seen = new Set<string>();
  const pattern = /(?:<a\s[^>]*href="([^"]*)"[^>]*>\s*)?<img\s[^>]*src="([^"]+)"/gi;
  for (const match of slider.matchAll(pattern)) {
    const imageUrl = normalizeSiteUrl(match[2] ?? "");
    if (!imageUrl || seen.has(imageUrl)) continue;
    seen.add(imageUrl);
    banners.push({ imageUrl, linkUrl: normalizeSiteUrl(match[1] ?? "") });
  }
  return banners;
}
