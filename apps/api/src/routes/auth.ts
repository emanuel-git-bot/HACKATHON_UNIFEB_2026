import { Hono } from "hono";
import { z } from "zod";
import { hashPassword, verifyPassword } from "@syncfeb/core";
import {
  USER_COLUMNS,
  currentUser,
  endSession,
  isLoginLocked,
  requireRole,
  startSession,
  toSessionUser,
} from "../lib/auth";
import { ApiError, parseBody } from "../lib/http";
import type { AppEnv, Role } from "../types";

const loginSchema = z.object({
  ra: z.string().trim().min(1, "Informe o RA."),
  password: z.string().min(1, "Informe a senha."),
});

const registerSchema = z.object({
  name: z.string().trim().min(3, "Informe seu nome completo."),
  ra: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{3,20}$/, "RA deve ter de 3 a 20 letras ou números."),
  courseId: z.string().min(1, "Escolha o curso."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

export function passwordIterations(env: { PBKDF2_ITERATIONS?: string }): number | undefined {
  const n = Number(env.PBKDF2_ITERATIONS);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

export const authRoutes = new Hono<AppEnv>()
  .post("/login", async (c) => {
    const { ra, password } = await parseBody(c, loginSchema);
    const db = c.env.DB;
    const now = Date.now();

    if (await isLoginLocked(db, ra, now)) {
      throw new ApiError(429, "too_many_attempts", "Muitas tentativas erradas. Tente de novo em 15 minutos.");
    }

    const row = await db
      .prepare(
        `SELECT ${USER_COLUMNS}, u.password_hash FROM users u
         LEFT JOIN courses c ON c.id = u.course_id
         WHERE u.ra = ? AND u.active = 1`,
      )
      .bind(ra)
      .first<{
        id: string;
        role: Role;
        ra: string;
        name: string;
        course_id: string | null;
        course_name: string | null;
        password_hash: string;
      }>();

    const ok = row !== null && (await verifyPassword(password, row.password_hash));
    await db
      .prepare("INSERT INTO login_attempts (ra, attempted_at, success) VALUES (?, ?, ?)")
      .bind(ra, now, ok ? 1 : 0)
      .run();

    // Mesma mensagem para RA inexistente e senha errada.
    if (!ok || !row) throw new ApiError(401, "invalid_credentials", "RA ou senha incorretos.");

    await startSession(c, row.id);
    return c.json({ user: toSessionUser(row) });
  })

  .post("/register", async (c) => {
    const body = await parseBody(c, registerSchema);
    const db = c.env.DB;

    const course = await db.prepare("SELECT id FROM courses WHERE id = ?").bind(body.courseId).first();
    if (!course) throw new ApiError(400, "validation", "Curso inválido.", { field: "courseId" });

    const exists = await db.prepare("SELECT id FROM users WHERE ra = ?").bind(body.ra).first();
    if (exists) throw new ApiError(409, "ra_taken", "Este RA já possui conta.", { field: "ra" });

    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO users (id, role, ra, name, course_id, password_hash, active, created_at)
         VALUES (?, 'student', ?, ?, ?, ?, 1, ?)`,
      )
      .bind(id, body.ra, body.name, body.courseId, await hashPassword(body.password, passwordIterations(c.env)), Date.now())
      .run();

    await startSession(c, id);
    const user = await db
      .prepare(`SELECT ${USER_COLUMNS} FROM users u LEFT JOIN courses c ON c.id = u.course_id WHERE u.id = ?`)
      .bind(id)
      .first<Parameters<typeof toSessionUser>[0]>();
    return c.json({ user: user && toSessionUser(user) }, 201);
  })

  .post("/logout", async (c) => {
    await endSession(c);
    return c.json({ ok: true });
  })

  .get("/me", requireRole(), (c) => c.json({ user: currentUser(c) }));
