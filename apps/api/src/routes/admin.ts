import { Hono } from "hono";
import { z } from "zod";
import { hashPassword } from "@syncfeb/core";
import { requireRole } from "../lib/auth";
import { ApiError, notFound, parseBody, parseJsonList } from "../lib/http";
import type { AppEnv } from "../types";
import { passwordIterations } from "./auth";

const courseSchema = z.object({ name: z.string().trim().min(2, "Informe o nome do curso.") });

const coordinatorSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome."),
  login: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9._-]{3,40}$/, "Login deve ter de 3 a 40 letras, números, ponto, hífen ou sublinhado."),
  courseId: z.string().min(1, "Escolha o curso."),
  password: z.string().min(6, "A senha inicial deve ter pelo menos 6 caracteres."),
});

const coordinatorUpdateSchema = z.object({
  name: z.string().trim().min(3).optional(),
  courseId: z.string().min(1).optional(),
  active: z.boolean().optional(),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres.").optional(),
});

const IP_RULE = /^(\d{1,3}(\.\d{1,3}){3}(\/\d{1,2})?|(?=[0-9a-fA-F]*:)[0-9a-fA-F:]{2,39})$/;
const networkSchema = z.object({
  allowedIps: z.array(z.string().trim().regex(IP_RULE, "IP ou faixa inválida (ex.: 200.150.10.0/24).")).max(50),
});

async function courseExists(db: D1Database, id: string) {
  return (await db.prepare("SELECT id FROM courses WHERE id = ?").bind(id).first()) !== null;
}

/** Lista pública de cursos (tela de cadastro do aluno). */
export const courseRoutes = new Hono<AppEnv>().get("/", async (c) => {
  const rows = await c.env.DB.prepare("SELECT id, name FROM courses ORDER BY name").all<{ id: string; name: string }>();
  return c.json({ courses: rows.results });
});

export const adminRoutes = new Hono<AppEnv>()
  .use(requireRole("admin"))

  .post("/courses", async (c) => {
    const { name } = await parseBody(c, courseSchema);
    const exists = await c.env.DB.prepare("SELECT id FROM courses WHERE name = ?").bind(name).first();
    if (exists) throw new ApiError(409, "course_exists", "Já existe um curso com este nome.", { field: "name" });
    const id = crypto.randomUUID();
    await c.env.DB.prepare("INSERT INTO courses (id, name) VALUES (?, ?)").bind(id, name).run();
    return c.json({ course: { id, name } }, 201);
  })

  .get("/coordinators", async (c) => {
    const rows = await c.env.DB.prepare(
      `SELECT u.id, u.name, u.ra AS login, u.course_id, c.name AS course_name, u.active
       FROM users u LEFT JOIN courses c ON c.id = u.course_id
       WHERE u.role = 'coordinator' ORDER BY u.name`,
    ).all<{ id: string; name: string; login: string; course_id: string; course_name: string; active: number }>();
    return c.json({
      coordinators: rows.results.map((r) => ({
        id: r.id,
        name: r.name,
        login: r.login,
        courseId: r.course_id,
        courseName: r.course_name,
        active: r.active === 1,
      })),
    });
  })

  .post("/coordinators", async (c) => {
    const body = await parseBody(c, coordinatorSchema);
    const db = c.env.DB;
    if (!(await courseExists(db, body.courseId))) {
      throw new ApiError(400, "validation", "Curso inválido.", { field: "courseId" });
    }
    if (await db.prepare("SELECT id FROM users WHERE ra = ?").bind(body.login).first()) {
      throw new ApiError(409, "login_taken", "Este login já está em uso.", { field: "login" });
    }
    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO users (id, role, ra, name, course_id, password_hash, active, created_at)
         VALUES (?, 'coordinator', ?, ?, ?, ?, 1, ?)`,
      )
      .bind(id, body.login, body.name, body.courseId, await hashPassword(body.password, passwordIterations(c.env)), Date.now())
      .run();
    return c.json({ coordinator: { id, name: body.name, login: body.login, courseId: body.courseId, active: true } }, 201);
  })

  .put("/coordinators/:id", async (c) => {
    const body = await parseBody(c, coordinatorUpdateSchema);
    const db = c.env.DB;
    const id = c.req.param("id");
    const current = await db
      .prepare("SELECT id, name, course_id, active FROM users WHERE id = ? AND role = 'coordinator'")
      .bind(id)
      .first<{ id: string; name: string; course_id: string; active: number }>();
    if (!current) throw notFound("Coordenador");
    if (body.courseId && !(await courseExists(db, body.courseId))) {
      throw new ApiError(400, "validation", "Curso inválido.", { field: "courseId" });
    }

    const active = body.active === undefined ? current.active : Number(body.active);
    await db
      .prepare("UPDATE users SET name = ?, course_id = ?, active = ? WHERE id = ?")
      .bind(body.name ?? current.name, body.courseId ?? current.course_id, active, id)
      .run();
    if (body.password) {
      await db
        .prepare("UPDATE users SET password_hash = ? WHERE id = ?")
        .bind(await hashPassword(body.password, passwordIterations(c.env)), id)
        .run();
    }
    // Desativar ou trocar senha derruba as sessões abertas.
    if (active === 0 || body.password) await db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id).run();
    return c.json({ ok: true });
  })

  /** IPs públicos do Wi-Fi da faculdade (trava de rede) e o IP de quem está acessando agora. */
  .get("/settings/network", async (c) => {
    const row = await c.env.DB.prepare("SELECT value FROM settings WHERE key = 'allowed_ips'").first<{ value: string }>();
    return c.json({ allowedIps: parseJsonList(row?.value), currentIp: c.req.header("CF-Connecting-IP") ?? null });
  })

  .put("/settings/network", async (c) => {
    const { allowedIps } = await parseBody(c, networkSchema);
    const unique = [...new Set(allowedIps)];
    await c.env.DB.prepare(
      "INSERT INTO settings (key, value) VALUES ('allowed_ips', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
      .bind(JSON.stringify(unique))
      .run();
    return c.json({ allowedIps: unique });
  });
