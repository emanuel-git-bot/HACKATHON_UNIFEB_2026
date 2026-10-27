import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";
import { verificationCode } from "./encoding";

describe("senhas", () => {
  it("verifica a senha correta e recusa a errada", async () => {
    const stored = await hashPassword("minhaSenha123", 1_000);
    expect(stored.startsWith("pbkdf2$1000$")).toBe(true);
    expect(await verifyPassword("minhaSenha123", stored)).toBe(true);
    expect(await verifyPassword("outraSenha", stored)).toBe(false);
  });

  it("usa salt diferente a cada hash", async () => {
    expect(await hashPassword("x", 1_000)).not.toBe(await hashPassword("x", 1_000));
  });

  it("recusa formato desconhecido", async () => {
    expect(await verifyPassword("x", "texto-puro")).toBe(false);
  });
});

describe("código de verificação", () => {
  it("segue o formato SFB-XXXX-XXXX", () => {
    expect(verificationCode()).toMatch(/^SFB-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });
});
