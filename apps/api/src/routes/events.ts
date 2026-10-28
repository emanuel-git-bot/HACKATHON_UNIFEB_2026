import { Hono } from "hono";
import { currentUser, requireRole } from "../lib/auth";
import { notFound } from "../lib/http";
import { publicAttendance, publicEvent, type AttendanceRow, type EventRow } from "../lib/rows";
import { registerUser } from "../services/attendance";
import type { AppEnv } from "../types";

type EventWithCourse = EventRow & { course_name: string | null };

const EVENT_SELECT = `SELECT e.*, c.name AS course_name FROM events e JOIN courses c ON c.id = e.course_id`;

async function withMyState(db: D1Database, userId: string, events: EventWithCourse[]) {
  if (events.length === 0) return [];
  const ids = events.map((e) => e.id);
  const marks = ids.map(() => "?").join(",");
  const regs = await db
    .prepare(`SELECT event_id FROM registrations WHERE user_id = ? AND event_id IN (${marks})`)
    .bind(userId, ...ids)
    .all<{ event_id: string }>();
  const atts = await db
    .prepare(`SELECT * FROM attendance WHERE user_id = ? AND event_id IN (${marks})`)
    .bind(userId, ...ids)
    .all<AttendanceRow>();
  const registered = new Set(regs.results.map((r) => r.event_id));
  const byEvent = new Map(atts.results.map((a) => [a.event_id, a]));
  return events.map((e) => {
    const att = byEvent.get(e.id);
    return {
      ...publicEvent(e),
      registered: registered.has(e.id),
      attendance: att ? publicAttendance(att) : null,
    };
  });
}

export const eventRoutes = new Hono<AppEnv>()
  .use(requireRole())

  /** Mural: eventos futuros e em andamento, por data. */
  .get("/", async (c) => {
    const user = currentUser(c);
    const rows = await c.env.DB.prepare(`${EVENT_SELECT} WHERE e.ends_at >= ? ORDER BY e.starts_at ASC`)
      .bind(Date.now())
      .all<EventWithCourse>();
    return c.json({ events: await withMyState(c.env.DB, user.id, rows.results) });
  })

  .get("/:id", async (c) => {
    const user = currentUser(c);
    const row = await c.env.DB.prepare(`${EVENT_SELECT} WHERE e.id = ?`).bind(c.req.param("id")).first<EventWithCourse>();
    if (!row) throw notFound("Evento");
    const [event] = await withMyState(c.env.DB, user.id, [row]);
    return c.json({ event });
  })

  .post("/:id/register", requireRole("student"), async (c) => {
    const user = currentUser(c);
    const id = c.req.param("id");
    const exists = await c.env.DB.prepare("SELECT id FROM events WHERE id = ?").bind(id).first();
    if (!exists) throw notFound("Evento");
    await registerUser(c.env.DB, id, user.id);
    return c.json({ registered: true });
  })

  .delete("/:id/register", requireRole("student"), async (c) => {
    const user = currentUser(c);
    await c.env.DB.prepare("DELETE FROM registrations WHERE event_id = ? AND user_id = ?")
      .bind(c.req.param("id"), user.id)
      .run();
    return c.json({ registered: false });
  });

export const meRoutes = new Hono<AppEnv>()
  .use(requireRole("student"))

  /** Eventos em que o aluno se inscreveu ou registrou presença, mais recentes primeiro. */
  .get("/events", async (c) => {
    const user = currentUser(c);
    const rows = await c.env.DB.prepare(
      `${EVENT_SELECT}
       WHERE e.id IN (SELECT event_id FROM registrations WHERE user_id = ?
                      UNION SELECT event_id FROM attendance WHERE user_id = ?)
       ORDER BY e.starts_at DESC`,
    )
      .bind(user.id, user.id)
      .all<EventWithCourse>();
    return c.json({ events: await withMyState(c.env.DB, user.id, rows.results) });
  })

  .get("/hours", async (c) => {
    const user = currentUser(c);
    const rows = await c.env.DB.prepare(
      `SELECT a.id, a.updated_at, e.id AS event_id, e.hours, e.title, e.starts_at, e.location
       FROM attendance a JOIN events e ON e.id = a.event_id
       WHERE a.user_id = ? AND a.status = 'completed' ORDER BY e.starts_at DESC`,
    )
      .bind(user.id)
      .all<{
        id: string;
        updated_at: number;
        event_id: string;
        hours: number;
        title: string;
        starts_at: number;
        location: string;
      }>();
    const items = rows.results.map((r) => ({
      attendanceId: r.id,
      eventId: r.event_id,
      hours: r.hours,
      confirmedAt: r.updated_at,
      eventTitle: r.title,
      eventStartsAt: r.starts_at,
      eventLocation: r.location,
    }));
    const totalHours = items.reduce((sum, item) => sum + item.hours, 0);
    return c.json({ totalHours, items });
  });
