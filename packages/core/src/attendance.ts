import type { Phase } from "./qr";

export const CHECKIN_MODES = ["entry", "exit", "entry_exit", "entry_keyword"] as const;
export type CheckinMode = (typeof CHECKIN_MODES)[number];

export type AttendanceStatus = "incomplete" | "suspect" | "completed" | "rejected";
export type Review = "pending" | "confirmed" | "rejected";

/** Fases que o coordenador abre em cada modo. No modo palavra-chave, a fase de saída aceita a palavra. */
export function phasesForMode(mode: CheckinMode): Phase[] {
  switch (mode) {
    case "entry":
      return ["entry"];
    case "exit":
      return ["exit"];
    case "entry_exit":
    case "entry_keyword":
      return ["entry", "exit"];
  }
}

/** Fases em que o aluno lê QR. No modo palavra-chave a saída é digitada, não lida. */
export function qrPhasesForMode(mode: CheckinMode): Phase[] {
  return mode === "entry_keyword" ? ["entry"] : phasesForMode(mode);
}

export interface AttendanceSteps {
  entryAt: number | null;
  exitAt: number | null;
  keywordOk: boolean;
}

export function stepsComplete(mode: CheckinMode, steps: AttendanceSteps): boolean {
  switch (mode) {
    case "entry":
      return steps.entryAt !== null;
    case "exit":
      return steps.exitAt !== null;
    case "entry_exit":
      return steps.entryAt !== null && steps.exitAt !== null;
    case "entry_keyword":
      return steps.entryAt !== null && steps.keywordOk;
  }
}

export interface StatusInput extends AttendanceSteps {
  mode: CheckinMode;
  suspectReason: string | null;
  review: Review;
}

/** Status da presença: recusa do coordenador vence tudo; suspeita só some com confirmação. */
export function deriveStatus(input: StatusInput): AttendanceStatus {
  if (input.review === "rejected") return "rejected";
  if (input.suspectReason && input.review !== "confirmed") return "suspect";
  return stepsComplete(input.mode, input) ? "completed" : "incomplete";
}

export const MAX_KEYWORD_TRIES = 3;

/** Compara sem diferenciar maiúsculas, minúsculas, acentos e espaços extras. */
export function normalizeKeyword(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export async function hashKeyword(eventId: string, keyword: string): Promise<string> {
  const data = new TextEncoder().encode(`${eventId}|${normalizeKeyword(keyword)}`);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}
