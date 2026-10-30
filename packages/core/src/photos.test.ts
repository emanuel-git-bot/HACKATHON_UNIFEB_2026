import { describe, expect, it } from "vitest";
import { detectImageType } from "./photos";

const bytes = (...values: number[]) => new Uint8Array(values);
const text = (s: string) => [...s].map((c) => c.charCodeAt(0));

describe("fotos dos locais", () => {
  it("reconhece JPG, PNG e WebP pela assinatura", () => {
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0))).toBe("image/jpeg");
    expect(detectImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe("image/png");
    expect(detectImageType(bytes(...text("RIFF"), 1, 2, 3, 4, ...text("WEBPVP8 ")))).toBe("image/webp");
  });

  it("recusa outros arquivos, mesmo com nome de imagem", () => {
    expect(detectImageType(bytes(...text("<svg xmlns")))).toBeNull();
    expect(detectImageType(bytes(...text("GIF89a"), 0, 0))).toBeNull();
    expect(detectImageType(bytes())).toBeNull();
  });
});
