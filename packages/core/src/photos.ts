/** Regras das fotos dos locais do mapa (opcionais, enviadas pelo admin). */

export const PLACE_PHOTO_LIMITS = {
  perPlace: 6,
  /** A foto já chega reduzida pelo navegador (lado maior de 1600 px). */
  maxBytes: 2_000_000,
  maxThumbBytes: 300_000,
  maxCaption: 140,
} as const;

export type PhotoType = "image/jpeg" | "image/png" | "image/webp";

const ascii = (bytes: Uint8Array, start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));

/** Reconhece a imagem pela assinatura do arquivo, sem confiar no tipo que o navegador informou. */
export function detectImageType(bytes: Uint8Array): PhotoType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) return "image/png";
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "image/webp";
  return null;
}
