import type { Context, MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { randomToken } from "@syncfeb/core";
import type { AppEnv, Role, SessionUser } from "../types";
import { ApiError, forbidden } from "./http";

const SESSION_COOKIE = "sfb_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

interface UserRow {
  id: string;
  role: Role;
  ra: string;
  name: string;
  course_id: string | null;
  course_name: string | null;
}

export const USER_COLUMNS = `u.id, u.role, u.ra, u.name, u.course_id, c.name AS course_name`;

export function toSessionUser(row: UserRow): SessionUser {
  return {
    id: row.id,
    role: row.role,
    ra: row.ra,
    name: row.name,
    courseId: row.course_id,
    courseName: row.course_name,
  };
}

export function isHttps(c: Context): boolean {
  return new URL(c.req.url).protocol === "https:";
}

export async function startSession(c: Context<AppEnv>, userId: string): Promise<void> {
  const token = randomToken();
  await c.env.DB.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(token, userId, Date.now() + SESSION_TTL_MS)
    .run();
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isHttps(c),
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function endSession(c: Context<AppEnv>): Promise<void> {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) await c.env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}

/** Carrega o usuário da sessão (ou null) em `c.var.user`. */
export const loadSession: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);
  let user: SessionUser | null = null;
  if (token) {
    const row = await c.env.DB.prepare(
      `SELECT ${USER_COLUMNS} FROM sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN courses c ON c.id = u.course_id
       WHERE s.token = ? AND s.expires_at > ? AND u.active = 1`,
    )
      .bind(token, Date.now())
      .first<UserRow>();
    if (row) user = toSessionUser(row);
  }
  c.set("user", user);
  await next();
};

export function requireRole(...roles: Role[]): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const user = c.var.user;
    if (!user) throw new ApiError(401, "unauthenticated", "Faça login para continuar.");
    if (roles.length > 0 && !roles.includes(user.role)) throw forbidden();
    await next();
  };
}

/** Usuário logado; só usar depois de `requireRole`. */
export function currentUser(c: Context<AppEnv>): SessionUser {
  const user = c.var.user;
  if (!user) throw new ApiError(401, "unauthenticated", "Faça login para continuar.");
  return user;
}

/** Bloqueia o RA após 5 erros seguidos nos últimos 15 minutos. */
export async function isLoginLocked(db: D1Database, ra: string, now: number): Promise<boolean> {
  const since = now - LOGIN_WINDOW_MS;
  const lastSuccess = await db
    .prepare("SELECT MAX(attempted_at) AS at FROM login_attempts WHERE ra = ? AND success = 1")
    .bind(ra)
    .first<{ at: number | null }>();
  const from = Math.max(since, lastSuccess?.at ?? 0);
  const failures = await db
    .prepare("SELECT COUNT(*) AS n FROM login_attempts WHERE ra = ? AND success = 0 AND attempted_at > ?")
    .bind(ra, from)
    .first<{ n: number }>();
  return (failures?.n ?? 0) >= LOGIN_MAX_FAILURES;
}
