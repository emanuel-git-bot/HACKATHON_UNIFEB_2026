import { timingSafeEqual, toBase32 } from "./encoding";

/** Cada QR do Telão vale por uma janela de 10 segundos. */
export const QR_WINDOW_MS = 10_000;
/** Folga após a troca, para compensar atraso da câmera e da rede. */
export const QR_GRACE_MS = 5_000;
const CODE_LENGTH = 8;

export type Phase = "entry" | "exit";

export function qrWindowOf(now: number): number {
  return Math.floor(now / QR_WINDOW_MS);
}

async function hmac(secret: string, message: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
}

export async function qrCodeForWindow(
  secret: string,
  eventId: string,
  phase: Phase,
  window: number,
): Promise<string> {
  const digest = await hmac(secret, `${eventId}|${phase}|${window}`);
  return toBase32(digest).slice(0, CODE_LENGTH);
}

export interface CurrentQr {
  code: string;
  window: number;
  msRemaining: number;
}

export async function currentQr(
  secret: string,
  eventId: string,
  phase: Phase,
  now: number,
): Promise<CurrentQr> {
  const window = qrWindowOf(now);
  return {
    code: await qrCodeForWindow(secret, eventId, phase, window),
    window,
    msRemaining: (window + 1) * QR_WINDOW_MS - now,
  };
}

/**
 * Aceita o código da janela atual e, durante os primeiros QR_GRACE_MS da janela,
 * também o da janela anterior. Qualquer coisa mais velha é recusada.
 */
export async function verifyQrCode(
  secret: string,
  eventId: string,
  phase: Phase,
  code: string,
  now: number,
): Promise<boolean> {
  const normalized = code.trim().toUpperCase();
  const window = qrWindowOf(now);
  const candidates = [window];
  if (now - window * QR_WINDOW_MS < QR_GRACE_MS) candidates.push(window - 1);

  let valid = false;
  for (const w of candidates) {
    const expected = await qrCodeForWindow(secret, eventId, phase, w);
    if (timingSafeEqual(expected, normalized)) valid = true;
  }
  return valid;
}
