import { deriveStatus, evaluateLocation, type GpsReading, type LocationResult } from "@syncfeb/core";
import { parseJsonList } from "../lib/http";
import type { AttendanceRow, EventRow } from "../lib/rows";

export type AttemptResult = "accepted" | "suspect" | "rejected";

export interface AttemptLog {
  eventId: string;
  userId: string | null;
  deviceToken: string | null;
  ip: string | null;
  phase: string | null;
  result: AttemptResult;
  reason: string;
}

export async function logAttempt(db: D1Database, a: AttemptLog): Promise<void> {
  await db
    .prepare(
      `INSERT INTO checkin_attempts (id, event_id, user_id, device_token, ip, phase, result, reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(crypto.randomUUID(), a.eventId, a.userId, a.deviceToken, a.ip, a.phase, a.result, a.reason, Date.now())
    .run();
}

export async function getAttendance(db: D1Database, eventId: string, userId: string) {
  return db
    .prepare("SELECT * FROM attendance WHERE event_id = ? AND user_id = ?")
    .bind(eventId, userId)
    .first<AttendanceRow>();
}

/** Outra conta que já usou este aparelho no evento (trava de aparelho único). */
export async function deviceUsedByOther(db: D1Database, eventId: string, deviceToken: string, userId: string) {
  const row = await db
    .prepare("SELECT user_id FROM attendance WHERE event_id = ? AND device_token = ? AND user_id <> ?")
    .bind(eventId, deviceToken, userId)
    .first<{ user_id: string }>();
  return row !== null;
}

export async function allowedIpsFor(db: D1Database, event: EventRow): Promise<string[]> {
  if (event.allowed_ips !== null) return parseJsonList(event.allowed_ips);
  const row = await db.prepare("SELECT value FROM settings WHERE key = 'allowed_ips'").first<{ value: string }>();
  return parseJsonList(row?.value);
}

export async function checkLocation(
  db: D1Database,
  event: EventRow,
  ip: string | null,
  gps: GpsReading | null,
): Promise<LocationResult> {
  return evaluateLocation({
    ip,
    allowedIps: await allowedIpsFor(db, event),
    gps,
    eventLocation: event.lat !== null && event.lng !== null ? { lat: event.lat, lng: event.lng } : null,
    radiusM: event.radius_m,
  });
}

/** Texto do motivo de suspeita mostrado ao coordenador. */
export function suspectReasonText(result: Exclude<LocationResult, { ok: true }>): string {
  switch (result.reason) {
    case "out_of_range":
      return `Fora do raio (${result.distanceM} m do local)`;
    case "low_accuracy":
      return "GPS impreciso demais";
    case "gps_unavailable":
      return "GPS indisponível ou permissão negada";
    case "event_without_location":
      return "Evento sem local definido e rede não autorizada";
  }
}

export async function registerUser(db: D1Database, eventId: string, userId: string): Promise<void> {
  await db
    .prepare("INSERT OR IGNORE INTO registrations (event_id, user_id, created_at) VALUES (?, ?, ?)")
    .bind(eventId, userId, Date.now())
    .run();
}

/** Recalcula o status e grava a presença. */
export async function saveAttendance(
  db: D1Database,
  event: EventRow,
  row: AttendanceRow,
  isNew: boolean,
): Promise<{ attendance: AttendanceRow }> {
  const now = Date.now();
  const status = deriveStatus({
    mode: event.checkin_mode,
    entryAt: row.entry_at,
    exitAt: row.exit_at,
    keywordOk: row.keyword_ok === 1,
    suspectReason: row.suspect_reason,
    review: row.review,
  });
  const next: AttendanceRow = { ...row, status, updated_at: now };

  if (isNew) {
    await db
      .prepare(
        `INSERT INTO attendance (id, event_id, user_id, device_token, entry_at, exit_at, keyword_ok, keyword_tries,
           suspect_reason, review, status, origin, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        next.id, next.event_id, next.user_id, next.device_token, next.entry_at, next.exit_at, next.keyword_ok,
        next.keyword_tries, next.suspect_reason, next.review, next.status, next.origin, next.created_at, now,
      )
      .run();
  } else {
    await db
      .prepare(
        `UPDATE attendance SET entry_at = ?, exit_at = ?, keyword_ok = ?, keyword_tries = ?, suspect_reason = ?,
           review = ?, status = ?, origin = ?, updated_at = ? WHERE id = ?`,
      )
      .bind(
        next.entry_at, next.exit_at, next.keyword_ok, next.keyword_tries, next.suspect_reason, next.review,
        next.status, next.origin, now, next.id,
      )
      .run();
  }

  return { attendance: next };
}

export function newAttendance(eventId: string, userId: string, deviceToken: string): AttendanceRow {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    event_id: eventId,
    user_id: userId,
    device_token: deviceToken,
    entry_at: null,
    exit_at: null,
    keyword_ok: 0,
    keyword_tries: 0,
    suspect_reason: null,
    review: "pending",
    status: "incomplete",
    origin: "qr",
    created_at: now,
    updated_at: now,
  };
}
