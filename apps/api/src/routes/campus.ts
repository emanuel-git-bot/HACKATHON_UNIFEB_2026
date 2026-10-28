import { Hono } from "hono";
import { z } from "zod";
import {
  ANNOUNCEMENT_CATEGORIES,
  OPPORTUNITY_CATEGORIES,
  PLACE_CATEGORIES,
  RESOURCE_KINDS,
  groupJoinBlock,
} from "@syncfeb/core";
import { currentUser, requireRole } from "../lib/auth";
import { ApiError, forbidden, notFound, parseBody } from "../lib/http";
import type { AppEnv, SessionUser } from "../types";

const optionalText = z
  .string()
  .trim()
  .max(500)
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

const httpUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^https?:\/\//i.test(v), "O link deve começar com http:// ou https://.");

// ---------- Mapa do campus ----------

const placeSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do local.").max(80),
  category: z.enum(PLACE_CATEGORIES, { message: "Categoria inválida." }),
  description: z.string().trim().max(600).default(""),
  building: optionalText,
  floor: optionalText,
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accessible: z.boolean().default(false),
  openingHours: optionalText,
  phone: optionalText,
});

interface PlaceRow {
  id: string;
  name: string;
  category: string;
  description: string;
  building: string | null;
  floor: string | null;
  lat: number;
  lng: number;
  accessible: number;
  opening_hours: string | null;
  phone: string | null;
}

const publicPlace = (r: PlaceRow) => ({
  id: r.id,
  name: r.name,
  category: r.category,
  description: r.description,
  building: r.building,
  floor: r.floor,
  lat: r.lat,
  lng: r.lng,
  accessible: r.accessible === 1,
  openingHours: r.opening_hours,
  phone: r.phone,
});

/** O mapa é público: o calouro consulta antes mesmo de ter conta. */
export const placeRoutes = new Hono<AppEnv>()
  .get("/", async (c) => {
    const rows = await c.env.DB.prepare("SELECT * FROM places ORDER BY name").all<PlaceRow>();
    return c.json({ places: rows.results.map(publicPlace) });
  })

  .post("/", requireRole("admin"), async (c) => {
    const b = await parseBody(c, placeSchema);
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO places (id, name, category, description, building, floor, lat, lng, accessible, opening_hours, phone, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(id, b.name, b.category, b.description, b.building, b.floor, b.lat, b.lng, b.accessible ? 1 : 0, b.openingHours, b.phone, Date.now())
      .run();
    const row = await c.env.DB.prepare("SELECT * FROM places WHERE id = ?").bind(id).first<PlaceRow>();
    return c.json({ place: publicPlace(row!) }, 201);
  })

  .put("/:id", requireRole("admin"), async (c) => {
    const b = await parseBody(c, placeSchema);
    const r = await c.env.DB.prepare(
      `UPDATE places SET name = ?, category = ?, description = ?, building = ?, floor = ?, lat = ?, lng = ?, accessible = ?,
         opening_hours = ?, phone = ? WHERE id = ?`,
    )
      .bind(b.name, b.category, b.description, b.building, b.floor, b.lat, b.lng, b.accessible ? 1 : 0, b.openingHours, b.phone, c.req.param("id"))
      .run();
    if (!r.meta.changes) throw notFound("Local");
    const row = await c.env.DB.prepare("SELECT * FROM places WHERE id = ?").bind(c.req.param("id")).first<PlaceRow>();
    return c.json({ place: publicPlace(row!) });
  })

  .delete("/:id", requireRole("admin"), async (c) => {
    const id = c.req.param("id");
    await c.env.DB.prepare("UPDATE study_groups SET place_id = NULL WHERE place_id = ?").bind(id).run();
    await c.env.DB.prepare("UPDATE accessibility_reports SET place_id = NULL WHERE place_id = ?").bind(id).run();
    const r = await c.env.DB.prepare("DELETE FROM places WHERE id = ?").bind(id).run();
    if (!r.meta.changes) throw notFound("Local");
    return c.json({ ok: true });
  });

// ---------- Grupos de estudo ----------

const groupSchema = z
  .object({
    title: z.string().trim().min(3, "Dê um nome ao grupo.").max(80),
    subject: z.string().trim().min(2, "Informe a matéria.").max(80),
    description: z.string().trim().max(600).default(""),
    meetsAt: z.number().int(),
    placeId: optionalText,
    onlineUrl: httpUrl,
    maxMembers: z.number().int().min(2, "O grupo precisa de pelo menos 2 vagas.").max(50),
    courseOnly: z.boolean().default(false),
  })
  .refine((g) => g.placeId !== null || g.onlineUrl !== null, {
    message: "Escolha um local no campus ou informe o link da chamada.",
    path: ["placeId"],
  });

interface GroupRow {
  id: string;
  owner_id: string;
  owner_name: string;
  course_id: string | null;
  course_name: string | null;
  title: string;
  subject: string;
  description: string;
  meets_at: number;
  place_id: string | null;
  place_name: string | null;
  place_building: string | null;
  online_url: string | null;
  max_members: number;
  members: number;
  is_member: number;
}

const GROUP_SELECT = `
  SELECT g.*, u.name AS owner_name, co.name AS course_name, p.name AS place_name, p.building AS place_building,
    (SELECT COUNT(*) FROM study_group_members m WHERE m.group_id = g.id) AS members,
    EXISTS (SELECT 1 FROM study_group_members m WHERE m.group_id = g.id AND m.user_id = ?) AS is_member
  FROM study_groups g
  JOIN users u ON u.id = g.owner_id
  LEFT JOIN courses co ON co.id = g.course_id
  LEFT JOIN places p ON p.id = g.place_id`;

const publicGroup = (r: GroupRow, viewer: SessionUser) => ({
  id: r.id,
  title: r.title,
  subject: r.subject,
  description: r.description,
  meetsAt: r.meets_at,
  place: r.place_id ? { id: r.place_id, name: r.place_name, building: r.place_building } : null,
  onlineUrl: r.online_url,
  maxMembers: r.max_members,
  members: r.members,
  isMember: r.is_member === 1,
  isOwner: r.owner_id === viewer.id,
  ownerName: r.owner_name,
  courseId: r.course_id,
  courseName: r.course_name,
});

/** Encontros que começaram há até 3 horas ainda aparecem na lista. */
const GROUP_VISIBLE_AFTER_START_MS = 3 * 60 * 60 * 1000;

async function loadGroup(db: D1Database, id: string, viewer: SessionUser) {
  const row = await db.prepare(`${GROUP_SELECT} WHERE g.id = ?`).bind(viewer.id, id).first<GroupRow>();
  if (!row) throw notFound("Grupo");
  if (row.course_id && row.course_id !== viewer.courseId && viewer.role !== "admin") throw notFound("Grupo");
  return row;
}

export const groupRoutes = new Hono<AppEnv>()
  .use(requireRole())

  .get("/", async (c) => {
    const user = currentUser(c);
    const rows = await c.env.DB.prepare(
      `${GROUP_SELECT}
       WHERE g.meets_at >= ? AND (g.course_id IS NULL OR g.course_id = ? OR ? = 'admin')
       ORDER BY g.meets_at`,
    )
      .bind(user.id, Date.now() - GROUP_VISIBLE_AFTER_START_MS, user.courseId, user.role)
      .all<GroupRow>();
    return c.json({ groups: rows.results.map((r) => publicGroup(r, user)) });
  })

  .get("/:id", async (c) => {
    const user = currentUser(c);
    const row = await loadGroup(c.env.DB, c.req.param("id"), user);
    const members = await c.env.DB.prepare(
      `SELECT u.name, co.name AS course_name FROM study_group_members m
       JOIN users u ON u.id = m.user_id LEFT JOIN courses co ON co.id = u.course_id
       WHERE m.group_id = ? ORDER BY m.joined_at`,
    )
      .bind(row.id)
      .all<{ name: string; course_name: string | null }>();
    return c.json({
      group: publicGroup(row, user),
      members: members.results.map((m) => ({ name: m.name, courseName: m.course_name })),
    });
  })

  .post("/", requireRole("student"), async (c) => {
    const user = currentUser(c);
    const b = await parseBody(c, groupSchema);
    if (b.meetsAt < Date.now()) {
      throw new ApiError(400, "validation", "Escolha uma data e hora no futuro.", { field: "meetsAt" });
    }
    if (b.placeId && !(await c.env.DB.prepare("SELECT id FROM places WHERE id = ?").bind(b.placeId).first())) {
      throw new ApiError(400, "validation", "Local inválido.", { field: "placeId" });
    }
    const id = crypto.randomUUID();
    const now = Date.now();
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO study_groups (id, owner_id, course_id, title, subject, description, meets_at, place_id, online_url, max_members, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(id, user.id, b.courseOnly ? user.courseId : null, b.title, b.subject, b.description, b.meetsAt, b.placeId, b.onlineUrl, b.maxMembers, now),
      c.env.DB.prepare("INSERT INTO study_group_members (group_id, user_id, joined_at) VALUES (?, ?, ?)").bind(id, user.id, now),
    ]);
    return c.json({ group: publicGroup(await loadGroup(c.env.DB, id, user), user) }, 201);
  })

  .post("/:id/join", requireRole("student"), async (c) => {
    const user = currentUser(c);
    const row = await loadGroup(c.env.DB, c.req.param("id"), user);
    const block = groupJoinBlock({
      isMember: row.is_member === 1,
      members: row.members,
      maxMembers: row.max_members,
      meetsAt: row.meets_at,
      now: Date.now(),
    });
    if (block === "full") throw new ApiError(409, "group_full", "O grupo já está cheio.");
    if (block === "past") throw new ApiError(409, "group_past", "Este encontro já aconteceu.");
    if (block === null) {
      await c.env.DB.prepare("INSERT OR IGNORE INTO study_group_members (group_id, user_id, joined_at) VALUES (?, ?, ?)")
        .bind(row.id, user.id, Date.now())
        .run();
    }
    return c.json({ group: publicGroup(await loadGroup(c.env.DB, row.id, user), user) });
  })

  .delete("/:id/join", requireRole("student"), async (c) => {
    const user = currentUser(c);
    const row = await loadGroup(c.env.DB, c.req.param("id"), user);
    if (row.owner_id === user.id) {
      throw new ApiError(409, "owner_cannot_leave", "Você criou o grupo: para sair, exclua o grupo.");
    }
    await c.env.DB.prepare("DELETE FROM study_group_members WHERE group_id = ? AND user_id = ?").bind(row.id, user.id).run();
    return c.json({ group: publicGroup(await loadGroup(c.env.DB, row.id, user), user) });
  })

  .delete("/:id", async (c) => {
    const user = currentUser(c);
    const row = await loadGroup(c.env.DB, c.req.param("id"), user);
    if (row.owner_id !== user.id && user.role !== "admin") throw forbidden();
    await c.env.DB.batch([
      c.env.DB.prepare("DELETE FROM study_group_members WHERE group_id = ?").bind(row.id),
      c.env.DB.prepare("DELETE FROM study_groups WHERE id = ?").bind(row.id),
    ]);
    return c.json({ ok: true });
  });

// ---------- Avisos ----------

const announcementSchema = z.object({
  title: z.string().trim().min(3, "Informe o título.").max(120),
  body: z.string().trim().min(3, "Escreva o aviso.").max(2000),
  category: z.enum(ANNOUNCEMENT_CATEGORIES, { message: "Categoria inválida." }),
  /** `null` = todo o campus (só o admin). */
  courseId: z.string().nullable().default(null),
  pinned: z.boolean().default(false),
  /** Só para vagas de estágio e emprego. */
  company: optionalText,
  linkUrl: httpUrl,
  deadlineAt: z.number().int().positive().nullable().default(null),
});

interface AnnouncementRow {
  id: string;
  author_id: string;
  author_name: string;
  course_id: string | null;
  course_name: string | null;
  category: string;
  title: string;
  body: string;
  pinned: number;
  created_at: number;
  company: string | null;
  link_url: string | null;
  deadline_at: number | null;
  is_read: number;
}

/** Quem vê o quê: aluno e coordenador veem o campus todo e o próprio curso; o admin vê tudo. */
function audienceFilter(user: SessionUser) {
  return user.role === "admin"
    ? { sql: "1 = 1", params: [] as (string | null)[] }
    : { sql: "(a.course_id IS NULL OR a.course_id = ?)", params: [user.courseId] };
}

export const announcementRoutes = new Hono<AppEnv>()
  .use(requireRole())

  .get("/", async (c) => {
    const user = currentUser(c);
    const f = audienceFilter(user);
    const rows = await c.env.DB.prepare(
      `SELECT a.*, u.name AS author_name, co.name AS course_name,
         EXISTS (SELECT 1 FROM announcement_reads r WHERE r.announcement_id = a.id AND r.user_id = ?) AS is_read
       FROM announcements a JOIN users u ON u.id = a.author_id LEFT JOIN courses co ON co.id = a.course_id
       WHERE ${f.sql}
       ORDER BY a.pinned DESC, a.created_at DESC LIMIT 100`,
    )
      .bind(user.id, ...f.params)
      .all<AnnouncementRow>();
    const announcements = rows.results.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      category: r.category,
      pinned: r.pinned === 1,
      createdAt: r.created_at,
      authorName: r.author_name,
      courseId: r.course_id,
      courseName: r.course_name,
      company: r.company,
      linkUrl: r.link_url,
      deadlineAt: r.deadline_at,
      isRead: r.is_read === 1,
      canDelete: r.author_id === user.id || user.role === "admin",
    }));
    return c.json({ announcements, unread: announcements.filter((a) => !a.isRead).length });
  })

  .post("/read", async (c) => {
    const user = currentUser(c);
    const { ids } = await parseBody(c, z.object({ ids: z.array(z.string()).max(100) }));
    const now = Date.now();
    if (ids.length > 0) {
      await c.env.DB.batch(
        ids.map((id) =>
          c.env.DB.prepare("INSERT OR IGNORE INTO announcement_reads (announcement_id, user_id, read_at) VALUES (?, ?, ?)").bind(id, user.id, now),
        ),
      );
    }
    return c.json({ ok: true });
  })

  .post("/", requireRole("coordinator", "admin"), async (c) => {
    const user = currentUser(c);
    const b = await parseBody(c, announcementSchema);
    // O coordenador só publica para o próprio curso.
    const courseId = user.role === "coordinator" ? user.courseId : b.courseId;
    if (courseId && !(await c.env.DB.prepare("SELECT id FROM courses WHERE id = ?").bind(courseId).first())) {
      throw new ApiError(400, "validation", "Curso inválido.", { field: "courseId" });
    }
    const isOpportunity = (OPPORTUNITY_CATEGORIES as readonly string[]).includes(b.category);
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO announcements (id, author_id, course_id, category, title, body, pinned, created_at, company, link_url, deadline_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id, user.id, courseId, b.category, b.title, b.body, b.pinned ? 1 : 0, Date.now(),
        isOpportunity ? b.company : null, b.linkUrl, isOpportunity ? b.deadlineAt : null,
      )
      .run();
    return c.json({ id }, 201);
  })

  .delete("/:id", requireRole("coordinator", "admin"), async (c) => {
    const user = currentUser(c);
    const row = await c.env.DB.prepare("SELECT author_id FROM announcements WHERE id = ?")
      .bind(c.req.param("id"))
      .first<{ author_id: string }>();
    if (!row) throw notFound("Aviso");
    if (row.author_id !== user.id && user.role !== "admin") throw forbidden();
    await c.env.DB.batch([
      c.env.DB.prepare("DELETE FROM announcement_reads WHERE announcement_id = ?").bind(c.req.param("id")),
      c.env.DB.prepare("DELETE FROM announcements WHERE id = ?").bind(c.req.param("id")),
    ]);
    return c.json({ ok: true });
  });

// ---------- Recursos compartilhados ----------

const resourceSchema = z
  .object({
    title: z.string().trim().min(3, "Informe o título.").max(120),
    subject: z.string().trim().min(2, "Informe a matéria.").max(80),
    kind: z.enum(RESOURCE_KINDS, { message: "Tipo inválido." }),
    description: z.string().trim().max(600).default(""),
    url: httpUrl,
    courseOnly: z.boolean().default(false),
  })
  .refine((r) => r.kind === "book" || r.url !== null, {
    message: "Informe o link do material (Drive, PDF, site...).",
    path: ["url"],
  });

interface ResourceRow {
  id: string;
  owner_id: string;
  owner_name: string;
  owner_course: string | null;
  course_id: string | null;
  kind: string;
  title: string;
  subject: string;
  description: string;
  url: string | null;
  created_at: number;
}

export const resourceRoutes = new Hono<AppEnv>()
  .use(requireRole())

  .get("/", async (c) => {
    const user = currentUser(c);
    const rows = await c.env.DB.prepare(
      `SELECT r.*, u.name AS owner_name, co.name AS owner_course
       FROM resources r JOIN users u ON u.id = r.owner_id LEFT JOIN courses co ON co.id = u.course_id
       WHERE r.course_id IS NULL OR r.course_id = ? OR ? = 'admin'
       ORDER BY r.created_at DESC LIMIT 200`,
    )
      .bind(user.courseId, user.role)
      .all<ResourceRow>();
    return c.json({
      resources: rows.results.map((r) => ({
        id: r.id,
        title: r.title,
        subject: r.subject,
        kind: r.kind,
        description: r.description,
        url: r.url,
        createdAt: r.created_at,
        ownerName: r.owner_name,
        ownerCourse: r.owner_course,
        courseOnly: r.course_id !== null,
        canDelete: r.owner_id === user.id || user.role === "admin",
      })),
    });
  })

  .post("/", async (c) => {
    const user = currentUser(c);
    const b = await parseBody(c, resourceSchema);
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO resources (id, owner_id, course_id, kind, title, subject, description, url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(id, user.id, b.courseOnly ? user.courseId : null, b.kind, b.title, b.subject, b.description, b.url, Date.now())
      .run();
    return c.json({ id }, 201);
  })

  .delete("/:id", async (c) => {
    const user = currentUser(c);
    const row = await c.env.DB.prepare("SELECT owner_id FROM resources WHERE id = ?")
      .bind(c.req.param("id"))
      .first<{ owner_id: string }>();
    if (!row) throw notFound("Material");
    if (row.owner_id !== user.id && user.role !== "admin") throw forbidden();
    await c.env.DB.prepare("DELETE FROM resources WHERE id = ?").bind(c.req.param("id")).run();
    return c.json({ ok: true });
  });

// ---------- Relatos de acessibilidade ----------

const reportSchema = z.object({
  placeId: optionalText,
  description: z.string().trim().min(5, "Descreva o problema.").max(600),
});

interface ReportRow {
  id: string;
  place_id: string | null;
  place_name: string | null;
  user_name: string;
  description: string;
  status: "open" | "resolved";
  created_at: number;
  resolved_at: number | null;
}

export const reportRoutes = new Hono<AppEnv>()
  .use(requireRole())

  .get("/", async (c) => {
    const user = currentUser(c);
    const mine = user.role !== "admin";
    const rows = await c.env.DB.prepare(
      `SELECT r.*, p.name AS place_name, u.name AS user_name
       FROM accessibility_reports r JOIN users u ON u.id = r.user_id LEFT JOIN places p ON p.id = r.place_id
       ${mine ? "WHERE r.user_id = ?" : ""}
       ORDER BY r.status = 'resolved', r.created_at DESC LIMIT 200`,
    )
      .bind(...(mine ? [user.id] : []))
      .all<ReportRow>();
    return c.json({
      reports: rows.results.map((r) => ({
        id: r.id,
        placeId: r.place_id,
        placeName: r.place_name,
        userName: r.user_name,
        description: r.description,
        status: r.status,
        createdAt: r.created_at,
        resolvedAt: r.resolved_at,
      })),
    });
  })

  .post("/", async (c) => {
    const user = currentUser(c);
    const b = await parseBody(c, reportSchema);
    if (b.placeId && !(await c.env.DB.prepare("SELECT id FROM places WHERE id = ?").bind(b.placeId).first())) {
      throw new ApiError(400, "validation", "Local inválido.", { field: "placeId" });
    }
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      "INSERT INTO accessibility_reports (id, place_id, user_id, description, status, created_at) VALUES (?, ?, ?, ?, 'open', ?)",
    )
      .bind(id, b.placeId, user.id, b.description, Date.now())
      .run();
    return c.json({ id }, 201);
  })

  .post("/:id/resolve", requireRole("admin"), async (c) => {
    const r = await c.env.DB.prepare("UPDATE accessibility_reports SET status = 'resolved', resolved_at = ? WHERE id = ?")
      .bind(Date.now(), c.req.param("id"))
      .run();
    if (!r.meta.changes) throw notFound("Relato");
    return c.json({ ok: true });
  });
