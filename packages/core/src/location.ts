export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GpsReading extends GeoPoint {
  /** Margem de erro em metros informada pelo aparelho. */
  accuracy: number;
}

/** Acima disso a leitura de GPS não é confiável o bastante para validar presença. */
export const MAX_GPS_ACCURACY_M = 150;
/** A margem de erro descontada da distância é limitada a este valor. */
const MAX_ACCURACY_CREDIT_M = 100;

export type LocationResult =
  | { ok: true; via: "ip" | "gps"; distanceM?: number }
  | {
      ok: false;
      reason: "gps_unavailable" | "low_accuracy" | "out_of_range" | "event_without_location";
      distanceM?: number;
    };

const EARTH_RADIUS_M = 6_371_000;

export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    value = value * 256 + n;
  }
  return value;
}

/** Aceita IP exato (IPv4 ou IPv6) ou faixa IPv4 em notação CIDR, ex.: 200.150.10.0/24. */
export function ipMatches(ip: string, allowed: readonly string[]): boolean {
  const target = ip.trim().toLowerCase();
  for (const rule of allowed) {
    const entry = rule.trim().toLowerCase();
    if (!entry) continue;
    if (!entry.includes("/")) {
      if (entry === target) return true;
      continue;
    }
    const [base, bitsText] = entry.split("/");
    const bits = Number(bitsText);
    const baseInt = ipv4ToInt(base ?? "");
    const ipInt = ipv4ToInt(target);
    if (baseInt === null || ipInt === null || !Number.isInteger(bits) || bits < 0 || bits > 32) continue;
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    if (((baseInt & mask) >>> 0) === ((ipInt & mask) >>> 0)) return true;
  }
  return false;
}

export interface LocationInput {
  ip: string | null;
  allowedIps: readonly string[];
  gps: GpsReading | null;
  eventLocation: GeoPoint | null;
  radiusM: number;
}

/** Trava de local: rede autorizada OU GPS dentro do raio. Falha nunca recusa, só gera suspeita. */
export function evaluateLocation(input: LocationInput): LocationResult {
  if (input.ip && ipMatches(input.ip, input.allowedIps)) return { ok: true, via: "ip" };
  if (!input.eventLocation) return { ok: false, reason: "event_without_location" };
  if (!input.gps) return { ok: false, reason: "gps_unavailable" };

  const distanceM = Math.round(haversineMeters(input.gps, input.eventLocation));
  if (input.gps.accuracy > MAX_GPS_ACCURACY_M) return { ok: false, reason: "low_accuracy", distanceM };

  const credit = Math.min(Math.max(input.gps.accuracy, 0), MAX_ACCURACY_CREDIT_M);
  if (distanceM - credit <= input.radiusM) return { ok: true, via: "gps", distanceM };
  return { ok: false, reason: "out_of_range", distanceM };
}
