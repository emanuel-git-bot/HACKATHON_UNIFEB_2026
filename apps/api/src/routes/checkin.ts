import { Hono, type Context } from "hono";
import { z } from "zod";
import {
  MAX_KEYWORD_TRIES,
  hashKeyword,
  qrCodeForWindow,
  qrPhasesForMode,
  qrWindowOf,
  randomToken,
  timingSafeEqual,
  verifyQrCode,
  type GpsReading,
  type Phase,
} from "@syncfeb/core";
import { currentUser, requireRole } from "../lib/auth";
import { ApiError, notFound, parseBody } from "../lib/http";
import { publicAttendance, type AttendanceRow, type EventRow } from "../lib/rows";
import {
  checkLocation,
  deviceUsedByOther,
  getAttendance,
  logAttempt,
  newAttendance,
  registerUser,
  saveAttendance,
  suspectReasonText,
} from "../services/attendance";
import type { AppEnv } from "../types";

/** Tempo para o aluno concluir login e localização depois de ler o QR. */
export const SCAN_TICKET_TTL_MS = 3 * 60 * 1000;
/** Até quanto tempo atrás um código ainda é reconhecido como "expirado" (e não como inválido). */
const EXPIRED_LOOKBACK_WINDOWS = 30;

const gpsSchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    accuracy: z.number().min(0),
  })
  .nullable()
  .optional();

const scanSchema = z.object({
  eventId: z.string().min(1),
  phase: z.enum(["entry", "exit"]),
  code: z.string().min(1).max(32),
});

const checkinSchema = z.object({ ticket: z.string().min(1), gps: gpsSchema });
const keywordSchema = z.object({ keyword: z.string().min(1).max(100), gps: gpsSchema });

function clientIp(c: Context<AppEnv>): string | null {
  return c.req.header("CF-Connecting-IP") ?? null;
}

function phaseIsOpen(event: EventRow, phase: Phase): boolean {
  return phase === "entry" ? event.entry_open === 1 : event.exit_open === 1;
}

async function loadEvent(db: D1Database, id: string): Promise<EventRow> {
  const event = await db.prepare("SELECT * FROM events WHERE id = ?").bind(id).first<EventRow>();
  if (!event) throw notFound("Evento");
  return event;
}

/** O código já foi válido em algum momento recente? Diferencia "expirado" de "adulterado". */
async function wasRecentlyValid(event: EventRow, phase: Phase, code: string, now: number): Promise<boolean> {
  const current = qrWindowOf(now);
  const normalized = code.trim().toUpperCase();
  for (let w = current; w > current - EXPIRED_LOOKBACK_WINDOWS; w--) {
    if (timingSafeEqual(await qrCodeForWindow(event.qr_secret, event.id, phase, w), normalized)) return true;
  }
  return false;
}

function eventSummary(event: EventRow) {
  return { id: event.id, title: event.title, hours: event.hours, checkinMode: event.checkin_mode };
}

export const checkinRoutes = new Hono<AppEnv>()
  /** Passo 1: valida o QR no instante da leitura e emite um ticket (não exige login). */
  .post("/scan", async (c) => {
    const body = await parseBody(c, scanSchema);
    const db = c.env.DB;
    const now = Date.now();
    const event = await loadEvent(db, body.eventId);
    const user = c.var.user;
    const reject = async (status: 403 | 409 | 410, code: string, message: string) => {
      await logAttempt(db, {
        eventId: event.id,
        userId: user?.id ?? null,
        deviceToken: c.var.deviceToken,
        ip: clientIp(c),
        phase: body.phase,
        result: "rejected",
        reason: code,
      });
      return new ApiError(status, code, message, { event: eventSummary(event) });
    };

    if (!qrPhasesForMode(event.checkin_mode).includes(body.phase) || !phaseIsOpen(event, body.phase)) {
      throw await reject(409, "phase_closed", "O check-in desta etapa não está aberto.");
    }
    if (!(await verifyQrCode(event.qr_secret, event.id, body.phase, body.code, now))) {
      if (await wasRecentlyValid(event, body.phase, body.code, now)) {
        throw await reject(410, "qr_expired", "QR Code expirado. Leia o QR que está no telão agora.");
      }
      throw await reject(403, "qr_invalid", "QR Code inválido.");
    }

    const ticket = randomToken(24);
    const expiresAt = now + SCAN_TICKET_TTL_MS;
    await db
      .prepare("INSERT INTO scan_tickets (id, event_id, phase, expires_at) VALUES (?, ?, ?, ?)")
      .bind(ticket, event.id, body.phase, expiresAt)
      .run();
    return c.json({ ticket, expiresAt, phase: body.phase, event: eventSummary(event) });
  })

  /** Passo 2: aluno logado conclui com o ticket, o token do aparelho e o GPS. */
  .post("/checkin", requireRole("student"), async (c) => {
    const body = await parseBody(c, checkinSchema);
    const db = c.env.DB;
    const user = currentUser(c);
    const device = c.var.deviceToken;
    const now = Date.now();

    const ticket = await db
      .prepare("SELECT * FROM scan_tickets WHERE id = ?")
      .bind(body.ticket)
      .first<{ id: string; event_id: string; phase: Phase; expires_at: number; used_at: number | null }>();
    if (!ticket) throw new ApiError(400, "ticket_invalid", "Leia o QR do telão novamente.");

    const event = await loadEvent(db, ticket.event_id);
    const log = (result: "accepted" | "suspect" | "rejected", reason: string) =>
      logAttempt(db, {
        eventId: event.id,
        userId: user.id,
        deviceToken: device,
        ip: clientIp(c),
        phase: ticket.phase,
        result,
        reason,
      });

    if (ticket.used_at !== null) {
      await log("rejected", "ticket_used");
      throw new ApiError(409, "ticket_used", "Este QR já foi usado. Leia o QR do telão novamente.");
    }
    if (ticket.expires_at < now) {
      await log("rejected", "ticket_expired");
      throw new ApiError(410, "ticket_expired", "O tempo para concluir acabou. Leia o QR do telão novamente.");
    }
    const claimed = await db
      .prepare("UPDATE scan_tickets SET used_at = ? WHERE id = ? AND used_at IS NULL")
      .bind(now, ticket.id)
      .run();
    if (claimed.meta.changes === 0) {
      await log("rejected", "ticket_used");
      throw new ApiError(409, "ticket_used", "Este QR já foi usado. Leia o QR do telão novamente.");
    }

    if (await deviceUsedByOther(db, event.id, device, user.id)) {
      await log("rejected", "device_reused");
      throw new ApiError(
        409,
        "device_reused",
        "Este aparelho já registrou presença de outra conta neste evento.",
        { event: eventSummary(event) },
      );
    }

    const existing = await getAttendance(db, event.id, user.id);
    if (existing?.status === "rejected") {
      await log("rejected", "attendance_rejected");
      throw new ApiError(409, "attendance_rejected", "Sua presença neste evento foi recusada pelo coordenador.");
    }

    const already = existing && (ticket.phase === "entry" ? existing.entry_at : existing.exit_at) !== null;
    if (existing && already) {
      return c.json({ phase: ticket.phase, event: eventSummary(event), attendance: publicAttendance(existing), repeated: true });
    }

    const location = await checkLocation(db, event, clientIp(c), (body.gps ?? null) as GpsReading | null);
    const row: AttendanceRow = existing ?? newAttendance(event.id, user.id, device);
    if (ticket.phase === "entry") row.entry_at = now;
    else row.exit_at = now;
    if (!location.ok && !row.suspect_reason) row.suspect_reason = suspectReasonText(location);

    const saved = await saveAttendance(db, event, row, !existing);
    await registerUser(db, event.id, user.id);
    await log(location.ok ? "accepted" : "suspect", location.ok ? `ok_${location.via}` : location.reason);

    return c.json({
      phase: ticket.phase,
      event: eventSummary(event),
      attendance: publicAttendance(saved.attendance),
      location: location.ok ? { ok: true } : { ok: false, reason: location.reason },
    });
  })

  /** Modo entrada + palavra-chave: o aluno digita a palavra dita no final. */
  .post("/events/:id/keyword", requireRole("student"), async (c) => {
    const body = await parseBody(c, keywordSchema);
    const db = c.env.DB;
    const user = currentUser(c);
    const device = c.var.deviceToken;
    const event = await loadEvent(db, c.req.param("id"));
    const log = (result: "accepted" | "suspect" | "rejected", reason: string) =>
      logAttempt(db, {
        eventId: event.id,
        userId: user.id,
        deviceToken: device,
        ip: clientIp(c),
        phase: "exit",
        result,
        reason,
      });

    if (event.checkin_mode !== "entry_keyword" || !event.keyword_hash) {
      throw new ApiError(400, "no_keyword", "Este evento não usa palavra-chave.");
    }
    if (event.exit_open !== 1) {
      await log("rejected", "phase_closed");
      throw new ApiError(409, "phase_closed", "A palavra-chave ainda não foi liberada pelo coordenador.");
    }
    const att = await getAttendance(db, event.id, user.id);
    if (!att || att.entry_at === null) {
      throw new ApiError(409, "entry_missing", "Registre a entrada pelo QR do telão antes da palavra-chave.");
    }
    if (att.status === "rejected") {
      throw new ApiError(409, "attendance_rejected", "Sua presença neste evento foi recusada pelo coordenador.");
    }
    if (att.keyword_ok === 1) return c.json({ attendance: publicAttendance(att), repeated: true });
    if (att.keyword_tries >= MAX_KEYWORD_TRIES) {
      throw new ApiError(429, "keyword_locked", "Tentativas esgotadas. O coordenador vai conferir sua presença.");
    }
    if (await deviceUsedByOther(db, event.id, device, user.id)) {
      await log("rejected", "device_reused");
      throw new ApiError(409, "device_reused", "Este aparelho já registrou presença de outra conta neste evento.");
    }

    const correct = timingSafeEqual(await hashKeyword(event.id, body.keyword), event.keyword_hash);
    if (!correct) {
      att.keyword_tries += 1;
      const locked = att.keyword_tries >= MAX_KEYWORD_TRIES;
      if (locked && !att.suspect_reason) att.suspect_reason = "Errou a palavra-chave 3 vezes";
      const saved = await saveAttendance(db, event, att, false);
      await log(locked ? "suspect" : "rejected", "keyword_wrong");
      throw new ApiError(
        locked ? 429 : 400,
        locked ? "keyword_locked" : "keyword_wrong",
        locked
          ? "Tentativas esgotadas. O coordenador vai conferir sua presença."
          : "Palavra-chave incorreta.",
        { triesLeft: MAX_KEYWORD_TRIES - att.keyword_tries, attendance: publicAttendance(saved.attendance) },
      );
    }

    const location = await checkLocation(db, event, clientIp(c), (body.gps ?? null) as GpsReading | null);
    att.keyword_ok = 1;
    att.exit_at = Date.now();
    if (!location.ok && !att.suspect_reason) att.suspect_reason = suspectReasonText(location);
    const saved = await saveAttendance(db, event, att, false);
    await log(location.ok ? "accepted" : "suspect", location.ok ? "keyword_ok" : location.reason);

    return c.json({
      event: eventSummary(event),
      attendance: publicAttendance(saved.attendance),
      location: location.ok ? { ok: true } : { ok: false, reason: location.reason },
    });
  });
