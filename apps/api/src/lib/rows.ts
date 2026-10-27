import type { AttendanceStatus, CheckinMode, Review } from "@syncfeb/core";

export interface EventRow {
  id: string;
  course_id: string;
  coordinator_id: string;
  title: string;
  description: string;
  speaker: string;
  category: string;
  location: string;
  starts_at: number;
  ends_at: number;
  hours: number;
  lat: number | null;
  lng: number | null;
  radius_m: number;
  checkin_mode: CheckinMode;
  keyword_hash: string | null;
  qr_secret: string;
  entry_open: number;
  exit_open: number;
  allowed_ips: string | null;
  created_at: number;
}

export interface AttendanceRow {
  id: string;
  event_id: string;
  user_id: string;
  device_token: string;
  entry_at: number | null;
  exit_at: number | null;
  keyword_ok: number;
  keyword_tries: number;
  suspect_reason: string | null;
  review: Review;
  status: AttendanceStatus;
  origin: "qr" | "manual";
  created_at: number;
  updated_at: number;
}

export interface CertificateRow {
  id: string;
  attendance_id: string;
  user_id: string;
  event_id: string;
  hours: number;
  verification_code: string;
  issued_at: number;
}

/** Dados do evento que podem sair da API (nunca o segredo do QR nem o hash da palavra-chave). */
export function publicEvent(row: EventRow & { course_name?: string | null }) {
  return {
    id: row.id,
    courseId: row.course_id,
    courseName: row.course_name ?? null,
    title: row.title,
    description: row.description,
    speaker: row.speaker,
    category: row.category,
    location: row.location,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    hours: row.hours,
    checkinMode: row.checkin_mode,
    entryOpen: row.entry_open === 1,
    exitOpen: row.exit_open === 1,
  };
}

export function publicAttendance(row: AttendanceRow) {
  return {
    id: row.id,
    status: row.status,
    entryAt: row.entry_at,
    exitAt: row.exit_at,
    keywordOk: row.keyword_ok === 1,
    keywordTries: row.keyword_tries,
    suspectReason: row.suspect_reason,
    review: row.review,
    origin: row.origin,
  };
}
