import { Hono } from "hono";
import { currentUser, requireRole } from "../lib/auth";
import { forbidden, notFound } from "../lib/http";
import type { AppEnv } from "../types";

interface CertificateView {
  id: string;
  user_id: string;
  hours: number;
  verification_code: string;
  issued_at: number;
  student_name: string;
  student_ra: string;
  title: string;
  starts_at: number;
  ends_at: number;
  location: string;
  course_id: string;
  course_name: string;
}

const CERT_SELECT = `
  SELECT ce.id, ce.user_id, ce.hours, ce.verification_code, ce.issued_at,
         u.name AS student_name, u.ra AS student_ra,
         e.title, e.starts_at, e.ends_at, e.location, e.course_id, c.name AS course_name
  FROM certificates ce
  JOIN users u ON u.id = ce.user_id
  JOIN events e ON e.id = ce.event_id
  JOIN courses c ON c.id = e.course_id`;

/** Exatamente os dados impressos no certificado, nada além. */
function certificateBody(r: CertificateView) {
  return {
    id: r.id,
    studentName: r.student_name,
    studentRa: r.student_ra,
    eventTitle: r.title,
    eventStartsAt: r.starts_at,
    eventEndsAt: r.ends_at,
    eventLocation: r.location,
    courseName: r.course_name,
    hours: r.hours,
    issuedAt: r.issued_at,
    verificationCode: r.verification_code,
  };
}

export const certificateRoutes = new Hono<AppEnv>().get("/:id", requireRole(), async (c) => {
  const user = currentUser(c);
  const row = await c.env.DB.prepare(`${CERT_SELECT} WHERE ce.id = ?`).bind(c.req.param("id")).first<CertificateView>();
  if (!row) throw notFound("Certificado");
  const allowed =
    row.user_id === user.id ||
    user.role === "admin" ||
    (user.role === "coordinator" && user.courseId === row.course_id);
  if (!allowed) throw forbidden();
  return c.json({ certificate: certificateBody(row) });
});

/** Verificação pública, sem login. */
export const verifyRoutes = new Hono<AppEnv>().get("/:code", async (c) => {
  const code = c.req.param("code").trim().toUpperCase();
  const row = await c.env.DB.prepare(`${CERT_SELECT} WHERE ce.verification_code = ?`).bind(code).first<CertificateView>();
  if (!row) return c.json({ valid: false }, 404);
  return c.json({ valid: true, certificate: certificateBody(row) });
});
