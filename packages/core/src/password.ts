import { fromBase64, randomBytes, timingSafeEqual, toBase64 } from "./encoding";

/** 100 mil é o máximo aceito pelo PBKDF2 do Cloudflare Workers. */
export const DEFAULT_PBKDF2_ITERATIONS = 100_000;

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

/** Formato guardado: pbkdf2$<iterações>$<salt base64>$<hash base64>. */
export async function hashPassword(
  password: string,
  iterations = DEFAULT_PBKDF2_ITERATIONS,
): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(password, salt, iterations);
  return `pbkdf2$${iterations}$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterText, saltText, hashText] = stored.split("$");
  if (scheme !== "pbkdf2" || !iterText || !saltText || !hashText) return false;
  const hash = await derive(password, fromBase64(saltText), Number(iterText));
  return timingSafeEqual(toBase64(hash), hashText);
}
