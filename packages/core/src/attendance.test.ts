import { describe, expect, it } from "vitest";
import { deriveStatus, hashKeyword, normalizeKeyword, stepsComplete } from "./attendance";

const none = { entryAt: null, exitAt: null, keywordOk: false };

describe("stepsComplete", () => {
  it("modo só entrada", () => {
    expect(stepsComplete("entry", none)).toBe(false);
    expect(stepsComplete("entry", { ...none, entryAt: 1 })).toBe(true);
  });

  it("modo só saída", () => {
    expect(stepsComplete("exit", { ...none, exitAt: 1 })).toBe(true);
  });

  it("modo entrada e saída: faltou a saída", () => {
    expect(stepsComplete("entry_exit", { ...none, entryAt: 1 })).toBe(false);
    expect(stepsComplete("entry_exit", { ...none, entryAt: 1, exitAt: 2 })).toBe(true);
  });

  it("modo entrada e palavra-chave", () => {
    expect(stepsComplete("entry_keyword", { ...none, entryAt: 1 })).toBe(false);
    expect(stepsComplete("entry_keyword", { ...none, entryAt: 1, keywordOk: true })).toBe(true);
  });
});

describe("deriveStatus", () => {
  const done = { mode: "entry" as const, entryAt: 1, exitAt: null, keywordOk: false };

  it("concluída sem suspeita", () => {
    expect(deriveStatus({ ...done, suspectReason: null, review: "pending" })).toBe("completed");
  });

  it("suspeita até o coordenador confirmar", () => {
    expect(deriveStatus({ ...done, suspectReason: "out_of_range", review: "pending" })).toBe("suspect");
    expect(deriveStatus({ ...done, suspectReason: "out_of_range", review: "confirmed" })).toBe("completed");
  });

  it("confirmada mas com etapas faltando continua incompleta", () => {
    const s = deriveStatus({
      mode: "entry_exit",
      entryAt: 1,
      exitAt: null,
      keywordOk: false,
      suspectReason: "gps_unavailable",
      review: "confirmed",
    });
    expect(s).toBe("incomplete");
  });

  it("recusada vence tudo", () => {
    expect(deriveStatus({ ...done, suspectReason: null, review: "rejected" })).toBe("rejected");
  });
});

describe("palavra-chave", () => {
  it("ignora maiúsculas, acentos e espaços", () => {
    expect(normalizeKeyword("  Segurança  DA Informação ")).toBe("seguranca da informacao");
  });

  it("gera o mesmo hash para variações da mesma palavra", async () => {
    expect(await hashKeyword("e1", "CRIPTOGRAFIA")).toBe(await hashKeyword("e1", "criptografía"));
    expect(await hashKeyword("e1", "abc")).not.toBe(await hashKeyword("e2", "abc"));
  });
});
