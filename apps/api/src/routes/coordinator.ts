import { Hono, type Context } from "hono";
import { z } from "zod";
import {
  CHECKIN_MODES,
  QR_WINDOW_MS,
  currentQr,
  hashKeyword,
  phasesForMode,
  qrPhasesForMode,
  randomToken,
  type Phase,
} from "@syncfeb/core";
import { currentUser, requireRole } from "../lib/auth";
import { ApiError, forbidden, notFound, parseBody } from "../lib/http";
import { publicAttendance, publicEvent, type AttendanceRow, type EventRow } from "../lib/rows";
import {
  getAttendance,
  logAttempt,
  newAttendance,
  registerUser,
  saveAttendance,
} from "../services/attendance";
import type { AppEnv } from "../types";

const eventSchema = z
  .object({
    title: z.string().trim().min(3, "Informe o título do evento."),
    description: z.string().trim().max(2000).default(""),
    speaker: z.string().trim().max(200).default(""),
    category: z.enum(["palestra", "minicurso", "atletica", "grupo_estudo", "outro"]).default("palestra"),
    location: z.string().trim().min(2, "Informe o local."),
    startsAt: z.number().int().positive("Informe o início."),
    endsAt: z.number().int().positive("Informe o fim."),
    hours: z.number().positive("As horas complementares devem ser um número positivo.").max(200),
    lat: z.number().min(-90).max(90).nullable().default(null),
    lng: z.number().min(-180).max(180).nullable().default(null),
    radiusM: z.number().int().min(10).max(5000).default(100),
    checkinMode: z.enum(CHECKIN_MODES),
    keyword: z.string().trim().max(100).optional(),
  })
  .refine((e) => e.endsAt > e.startsAt, { message: "O fim deve ser depois do início.", path: ["endsAt"] })
  .refine((e) => (e.lat === null) === (e.lng === null), { message: "Localização incompleta.", path: ["lat"] });

const phaseSchema = z.object({ phase: z.enum(["entry", "exit"]), open: z.boolean() });
const reviewSchema = z.object({ decision: z.enum(["confirm", "reject"]) });
const manualSchema = z.object({ ra: z.string().trim().min(1, "Informe o RA.") });

/** Evento do curso do coordenador logado; outro curso = 403. */
async function ownEvent(c: Context<AppEnv>, id: string): Promise<EventRow> {
  const user = currentUser(c);
  const event = await c.env.DB.prepare("SELECT * FROM events WHERE id = ?").bind(id).first<EventRow>();
  if (!event) throw notFound("Evento");
  if (event.course_id !== user.courseId) throw forbidden();
  return event;
}

function openPhase(event: EventRow): Phase | null {
  if (event.entry_open === 1) return "entry";
  if (event.exit_open === 1) return "exit";
  return null;
}

async function eventCounts(db: D1Database, eventId: string) {
  const row = await db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM registrations WHERE event_id = ?) AS registered,
         (SELECT COUNT(*) FROM attendance WHERE event_id = ? AND status = 'completed') AS completed,
         (SELECT COUNT(*) FROM attendance WHERE event_id = ? AND status = 'suspect') AS suspect,
         (SELECT COUNT(*) FROM attendance WHERE event_id = ? AND status = 'incomplete') AS incomplete,
         (SELECT COUNT(*) FROM attendance WHERE event_id = ?) AS attendance`,
    )
    .bind(eventId, eventId, eventId, eventId, eventId)
    .first<{ registered: number; completed: number; suspect: number; incomplete: number; attendance: number }>();
  return row ?? { registered: 0, completed: 0, suspect: 0, incomplete: 0, attendance: 0 };
}

/** Presenças válidas (não suspeitas nem recusadas) que já cumpriram a etapa da fase. */
async function phaseCount(db: D1Database, event: EventRow, phase: Phase): Promise<number> {
  const column = phase === "entry" ? "entry_at" : "exit_at";
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM attendance
       WHERE event_id = ? AND ${column} IS NOT NULL AND status IN ('completed', 'incomplete')`,
    )
    .bind(event.id)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export const coordinatorRoutes = new Hono<AppEnv>()
  .use(requireRole("coordinator"))

  .get("/events", async (c) => {
    const user = currentUser(c);
    const rows = await c.env.DB.prepare(
      `SELECT e.*, c.name AS course_name FROM events e JOIN courses c ON c.id = e.course_id
       WHERE e.course_id = ? ORDER BY e.starts_at DESC`,
    )
      .bind(user.courseId)
      .all<EventRow & { course_name: string }>();
    const events = await Promise.all(
      rows.results.map(async (e) => ({ ...publicEvent(e), counts: await eventCounts(c.env.DB, e.id) })),
    );
    return c.json({ events });
  })

  .post("/events", async (c) => {
    const user = currentUser(c);
    if (!user.courseId) throw new ApiError(400, "no_course", "Coordenador sem curso vinculado.");
    const body = await parseBody(c, eventSchema);
    if (body.checkinMode === "entry_keyword" && (!body.keyword || body.keyword.length < 2)) {
      throw new ApiError(400, "validation", "Defina a palavra-chave do evento.", { field: "keyword" });
    }
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO events (id, course_id, coordinator_id, title, description, speaker, category, location,
         starts_at, ends_at, hours, lat, lng, radius_m, checkin_mode, keyword_hash, qr_secret, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id, user.courseId, user.id, body.title, body.description, body.speaker, body.category, body.location,
        body.startsAt, body.endsAt, body.hours, body.lat, body.lng, body.radiusM, body.checkinMode,
        body.checkinMode === "entry_keyword" && body.keyword ? await hashKeyword(id, body.keyword) : null,
        randomToken(), Date.now(),
      )
      .run();
    const event = await ownEvent(c, id);
    return c.json({ event: publicEvent(event) }, 201);
  })

  .get("/events/:id", async (c) => {
    const event = await ownEvent(c, c.req.param("id"));
    return c.json({
      event: {
        ...publicEvent(event),
        lat: event.lat,
        lng: event.lng,
        radiusM: event.radius_m,
        hasKeyword: event.keyword_hash !== null,
      },
      counts: await eventCounts(c.env.DB, event.id),
    });
  })

  .put("/events/:id", async (c) => {
    const event = await ownEvent(c, c.req.param("id"));
    const body = await parseBody(c, eventSchema);
    const counts = await eventCounts(c.env.DB, event.id);
    if (body.checkinMode !== event.checkin_mode && counts.attendance > 0) {
      throw new ApiError(409, "mode_locked", "Não é possível mudar o modo depois que há presenças registradas.", {
        field: "checkinMode",
      });
    }
    let keywordHash = body.checkinMode === "entry_keyword" ? event.keyword_hash : null;
    if (body.checkinMode === "entry_keyword" && body.keyword) keywordHash = await hashKeyword(event.id, body.keyword);
    if (body.checkinMode === "entry_keyword" && !keywordHash) {
      throw new ApiError(400, "validation", "Defina a palavra-chave do evento.", { field: "keyword" });
    }
    await c.env.DB.prepare(
      `UPDATE events SET title = ?, description = ?, speaker = ?, category = ?, location = ?, starts_at = ?,
         ends_at = ?, hours = ?, lat = ?, lng = ?, radius_m = ?, checkin_mode = ?, keyword_hash = ?
       WHERE id = ?`,
    )
      .bind(
        body.title, body.description, body.speaker, body.category, body.location, body.startsAt, body.endsAt,
        body.hours, body.lat, body.lng, body.radiusM, body.checkinMode, keywordHash, event.id,
      )
      .run();
    return c.json({ event: publicEvent(await ownEvent(c, event.id)) });
  })

  /** Abre ou encerra uma fase. Só uma fase fica aberta por vez. */
  .post("/events/:id/phase", async (c) => {
    const event = await ownEvent(c, c.req.param("id"));
    const { phase, open } = await parseBody(c, phaseSchema);
    if (!phasesForMode(event.checkin_mode).includes(phase)) {
      throw new ApiError(400, "invalid_phase", "Esta etapa não existe no modo de check-in do evento.");
    }
    const entry = phase === "entry" ? Number(open) : open ? 0 : event.entry_open;
    const exit = phase === "exit" ? Number(open) : open ? 0 : event.exit_open;
    await c.env.DB.prepare("UPDATE events SET entry_open = ?, exit_open = ? WHERE id = ?").bind(entry, exit, event.id).run();
    return c.json({ event: publicEvent(await ownEvent(c, event.id)) });
  })

  /** Telão: código atual, tempo até a troca e presenças da fase. Consultado a cada ~2s. */
  .get("/events/:id/qr", async (c) => {
    const event = await ownEvent(c, c.req.param("id"));
    const phase = openPhase(event);
    const base = { title: event.title, mode: event.checkin_mode, windowMs: QR_WINDOW_MS, phase };
    if (!phase) return c.json({ ...base, code: null, msRemaining: null, count: 0 });

    const count = await phaseCount(c.env.DB, event, phase);
    if (!qrPhasesForMode(event.checkin_mode).includes(phase)) {
      // Fase de saída do modo palavra-chave: o telão orienta, não mostra QR.
      return c.json({ ...base, code: null, msRemaining: null, count, keywordPhase: true });
    }
    const qr = await currentQr(event.qr_secret, event.id, phase, Date.now());
    return c.json({ ...base, code: qr.code, msRemaining: qr.msRemaining, count });
  })

  .get("/events/:id/attendance", async (c) => {
    const event = await ownEvent(c, c.req.param("id"));
    const rows = await c.env.DB.prepare(
      `SELECT a.*, u.name AS student_name, u.ra AS student_ra FROM attendance a
       JOIN users u ON u.id = a.user_id WHERE a.event_id = ? ORDER BY u.name`,
    )
      .bind(event.id)
      .all<AttendanceRow & { student_name: string; student_ra: string }>();
    return c.json({
      attendance: rows.results.map((r) => ({
        ...publicAttendance(r),
        studentName: r.student_name,
        studentRa: r.student_ra,
      })),
    });
  })

  /** Confirmar ou recusar uma presença suspeita. */
  .post("/attendance/:id/review", async (c) => {
    const { decision } = await parseBody(c, reviewSchema);
    const att = await c.env.DB.prepare("SELECT * FROM attendance WHERE id = ?")
      .bind(c.req.param("id"))
      .first<AttendanceRow>();
    if (!att) throw notFound("Presença");
    const event = await ownEvent(c, att.event_id);
    if (att.status !== "suspect") {
      throw new ApiError(409, "not_suspect", "Só presenças suspeitas podem ser revisadas.");
    }
    att.review = decision === "confirm" ? "confirmed" : "rejected";
    const saved = await saveAttendance(c.env.DB, event, att, false);
    return c.json({ attendance: publicAttendance(saved.attendance), certificateId: saved.certificate?.id ?? null });
  })

  /** Lançamento manual para quem assinou a lista em papel. */
  .post("/events/:id/manual", async (c) => {
    const event = await ownEvent(c, c.req.param("id"));
    const user = currentUser(c);
    const { ra } = await parseBody(c, manualSchema);
    const student = await c.env.DB.prepare(
      "SELECT id, name, ra, course_id FROM users WHERE ra = ? AND role = 'student' AND active = 1",
    )
      .bind(ra)
      .first<{ id: string; name: string; ra: string; course_id: string | null }>();
    if (!student) throw new ApiError(404, "student_not_found", "Nenhum aluno com este RA.");
    if (student.course_id !== user.courseId) {
      throw new ApiError(403, "other_course", "Este aluno é de outro curso.");
    }

    const existing = await getAttendance(c.env.DB, event.id, student.id);
    const now = Date.now();
    const row: AttendanceRow = existing ?? newAttendance(event.id, student.id, `manual:${crypto.randomUUID()}`);
    row.entry_at ??= now;
    row.exit_at ??= now;
    row.keyword_ok = 1;
    row.review = "confirmed";
    row.origin = "manual";
    const saved = await saveAttendance(c.env.DB, event, row, !existing);
    await registerUser(c.env.DB, event.id, student.id);
    await logAttempt(c.env.DB, {
      eventId: event.id,
      userId: student.id,
      deviceToken: null,
      ip: null,
      phase: null,
      result: "accepted",
      reason: "manual",
    });
    return c.json({
      attendance: publicAttendance(saved.attendance),
      student: { name: student.name, ra: student.ra },
      certificateId: saved.certificate?.id ?? null,
    });
  })

  .get("/events/:id/attempts", async (c) => {
    const event = await ownEvent(c, c.req.param("id"));
    const rows = await c.env.DB.prepare(
      `SELECT t.id, t.phase, t.result, t.reason, t.ip, t.created_at, u.name AS student_name, u.ra AS student_ra
       FROM checkin_attempts t LEFT JOIN users u ON u.id = t.user_id
       WHERE t.event_id = ? ORDER BY t.created_at DESC LIMIT 300`,
    )
      .bind(event.id)
      .all<{
        id: string;
        phase: string | null;
        result: string;
        reason: string;
        ip: string | null;
        created_at: number;
        student_name: string | null;
        student_ra: string | null;
      }>();
    return c.json({
      attempts: rows.results.map((r) => ({
        id: r.id,
        phase: r.phase,
        result: r.result,
        reason: r.reason,
        ip: r.ip,
        createdAt: r.created_at,
        studentName: r.student_name,
        studentRa: r.student_ra,
      })),
    });
  })

  /** Dados da lista de presença em papel: o evento e os inscritos. */
  .get("/events/:id/print", async (c) => {
    const event = await ownEvent(c, c.req.param("id"));
    const rows = await c.env.DB.prepare(
      `SELECT u.name, u.ra FROM registrations r JOIN users u ON u.id = r.user_id
       WHERE r.event_id = ? ORDER BY u.name`,
    )
      .bind(event.id)
      .all<{ name: string; ra: string }>();
    return c.json({ event: publicEvent(event), registrants: rows.results });
  });
