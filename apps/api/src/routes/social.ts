import { Hono } from "hono";
import { z } from "zod";
import { SOCIAL_EVENT_KINDS, rsvpBlock } from "@syncfeb/core";
import { currentUser, requireRole } from "../lib/auth";
import { ApiError, forbidden, notFound, parseBody } from "../lib/http";
import type { AppEnv, SessionUser } from "../types";

const socialEventSchema = z
  .object({
    kind: z.enum(SOCIAL_EVENT_KINDS, { message: "Escolha a modalidade." }),
    title: z.string().trim().min(3, "Dê um nome ao evento.").max(100),
    description: z.string().trim().max(1000).default(""),
    startsAt: z.number().int().positive("Informe a data e a hora."),
    placeId: z
      .string()
      .optional()
      .nullable()
      .transform((v) => v || null),
    location: z
      .string()
      .trim()
      .max(120)
      .optional()
      .nullable()
      .transform((v) => v || null),
    capacity: z.number().int().min(2, "Mínimo de 2 vagas.").max(5000).nullable().default(null),
  })
  .refine((e) => e.placeId !== null || e.location !== null, {
    message: "Escolha um local do campus ou escreva onde vai ser.",
    path: ["placeId"],
  });

interface SocialEventRow {
  id: string;
  organizer_id: string;
  organizer_name: string;
  kind: string;
  title: string;
  description: string;
  starts_at: number;
  place_id: string | null;
  location: string;
  capacity: number | null;
  confirmed: number;
  is_confirmed: number;
}

const SELECT = `
  SELECT s.*, u.name AS organizer_name,
    (SELECT COUNT(*) FROM social_event_rsvps r WHERE r.event_id = s.id) AS confirmed,
    EXISTS (SELECT 1 FROM social_event_rsvps r WHERE r.event_id = s.id AND r.user_id = ?) AS is_confirmed
  FROM social_events s JOIN users u ON u.id = s.organizer_id`;

/** Jogos que começaram há até 4 horas continuam no mural. */
const VISIBLE_AFTER_START_MS = 4 * 60 * 60 * 1000;

function publicSocialEvent(r: SocialEventRow, viewer: SessionUser | null) {
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    description: r.description,
    startsAt: r.starts_at,
    placeId: r.place_id,
    location: r.location,
    capacity: r.capacity,
    confirmed: r.confirmed,
    isConfirmed: r.is_confirmed === 1,
    organizerName: r.organizer_name,
    canManage: viewer !== null && (viewer.id === r.organizer_id || viewer.role === "admin"),
  };
}

async function loadEvent(db: D1Database, id: string, viewer: SessionUser | null) {
  const row = await db.prepare(`${SELECT} WHERE s.id = ?`).bind(viewer?.id ?? "", id).first<SocialEventRow>();
  if (!row) throw notFound("Evento");
  return row;
}

/** Nome do local do mapa, quando o organizador não escreveu outro. */
async function resolveLocation(db: D1Database, placeId: string | null, location: string | null): Promise<string> {
  if (placeId) {
    const place = await db.prepare("SELECT name FROM places WHERE id = ?").bind(placeId).first<{ name: string }>();
    if (!place) throw new ApiError(400, "validation", "Local inválido.", { field: "placeId" });
    return location ?? place.name;
  }
  return location ?? "";
}

async function ownSocialEvent(db: D1Database, id: string, user: SessionUser) {
  const row = await db.prepare("SELECT organizer_id FROM social_events WHERE id = ?").bind(id).first<{ organizer_id: string }>();
  if (!row) throw notFound("Evento");
  if (row.organizer_id !== user.id && user.role !== "admin") throw forbidden();
}

/**
 * Eventos da Atlética. A leitura é pública (o link vai para grupos de WhatsApp);
 * confirmar presença exige login de aluno.
 */
export const socialEventRoutes = new Hono<AppEnv>()
  .get("/", async (c) => {
    const user = c.var.user;
    const rows = await c.env.DB.prepare(`${SELECT} WHERE s.starts_at >= ? ORDER BY s.starts_at`)
      .bind(user?.id ?? "", Date.now() - VISIBLE_AFTER_START_MS)
      .all<SocialEventRow>();
    return c.json({ events: rows.results.map((r) => publicSocialEvent(r, user)) });
  })

  /** Eventos do próprio organizador, inclusive os que já passaram. */
  .get("/mine", requireRole("organizer", "admin"), async (c) => {
    const user = currentUser(c);
    const where = user.role === "admin" ? "" : "WHERE s.organizer_id = ?";
    const rows = await c.env.DB.prepare(`${SELECT} ${where} ORDER BY s.starts_at DESC`)
      .bind(user.id, ...(user.role === "admin" ? [] : [user.id]))
      .all<SocialEventRow>();
    return c.json({ events: rows.results.map((r) => publicSocialEvent(r, user)) });
  })

  .get("/:id", async (c) => {
    const row = await loadEvent(c.env.DB, c.req.param("id"), c.var.user);
    return c.json({ event: publicSocialEvent(row, c.var.user) });
  })

  .post("/", requireRole("organizer", "admin"), async (c) => {
    const user = currentUser(c);
    const b = await parseBody(c, socialEventSchema);
    if (b.startsAt < Date.now()) throw new ApiError(400, "validation", "Escolha uma data no futuro.", { field: "startsAt" });
    const location = await resolveLocation(c.env.DB, b.placeId, b.location);
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO social_events (id, organizer_id, kind, title, description, starts_at, place_id, location, capacity, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(id, user.id, b.kind, b.title, b.description, b.startsAt, b.placeId, location, b.capacity, Date.now())
      .run();
    return c.json({ event: publicSocialEvent(await loadEvent(c.env.DB, id, user), user) }, 201);
  })

  .put("/:id", requireRole("organizer", "admin"), async (c) => {
    const user = currentUser(c);
    const id = c.req.param("id");
    await ownSocialEvent(c.env.DB, id, user);
    const b = await parseBody(c, socialEventSchema);
    const location = await resolveLocation(c.env.DB, b.placeId, b.location);
    await c.env.DB.prepare(
      `UPDATE social_events SET kind = ?, title = ?, description = ?, starts_at = ?, place_id = ?, location = ?, capacity = ?
       WHERE id = ?`,
    )
      .bind(b.kind, b.title, b.description, b.startsAt, b.placeId, location, b.capacity, id)
      .run();
    return c.json({ event: publicSocialEvent(await loadEvent(c.env.DB, id, user), user) });
  })

  .delete("/:id", requireRole("organizer", "admin"), async (c) => {
    const user = currentUser(c);
    const id = c.req.param("id");
    await ownSocialEvent(c.env.DB, id, user);
    await c.env.DB.batch([
      c.env.DB.prepare("DELETE FROM social_event_rsvps WHERE event_id = ?").bind(id),
      c.env.DB.prepare("DELETE FROM social_events WHERE id = ?").bind(id),
    ]);
    return c.json({ ok: true });
  })

  /** Lista de quem confirmou, para o organizador montar times e conferir. */
  .get("/:id/rsvps", requireRole("organizer", "admin"), async (c) => {
    const user = currentUser(c);
    const id = c.req.param("id");
    await ownSocialEvent(c.env.DB, id, user);
    const rows = await c.env.DB.prepare(
      `SELECT u.name, u.ra, co.name AS course_name, r.created_at FROM social_event_rsvps r
       JOIN users u ON u.id = r.user_id LEFT JOIN courses co ON co.id = u.course_id
       WHERE r.event_id = ? ORDER BY r.created_at`,
    )
      .bind(id)
      .all<{ name: string; ra: string; course_name: string | null; created_at: number }>();
    return c.json({
      rsvps: rows.results.map((r) => ({ name: r.name, ra: r.ra, courseName: r.course_name, confirmedAt: r.created_at })),
    });
  })

  .post("/:id/rsvp", requireRole("student"), async (c) => {
    const user = currentUser(c);
    const row = await loadEvent(c.env.DB, c.req.param("id"), user);
    const block = rsvpBlock({
      isConfirmed: row.is_confirmed === 1,
      confirmed: row.confirmed,
      capacity: row.capacity,
      startsAt: row.starts_at,
      now: Date.now(),
    });
    if (block === "full") throw new ApiError(409, "event_full", "As vagas acabaram.");
    if (block === "started") throw new ApiError(409, "event_started", "O evento já começou.");
    if (block === null) {
      await c.env.DB.prepare("INSERT OR IGNORE INTO social_event_rsvps (event_id, user_id, created_at) VALUES (?, ?, ?)")
        .bind(row.id, user.id, Date.now())
        .run();
    }
    return c.json({ event: publicSocialEvent(await loadEvent(c.env.DB, row.id, user), user) });
  })

  .delete("/:id/rsvp", requireRole("student"), async (c) => {
    const user = currentUser(c);
    const row = await loadEvent(c.env.DB, c.req.param("id"), user);
    await c.env.DB.prepare("DELETE FROM social_event_rsvps WHERE event_id = ? AND user_id = ?").bind(row.id, user.id).run();
    return c.json({ event: publicSocialEvent(await loadEvent(c.env.DB, row.id, user), user) });
  });
