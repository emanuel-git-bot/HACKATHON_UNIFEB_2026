import { describe, expect, it } from "vitest";
import { QR_GRACE_MS, QR_WINDOW_MS, currentQr, qrCodeForWindow, verifyQrCode } from "./qr";

const SECRET = "segredo-de-teste";
const EVENT = "evt_1";
const T0 = 1_761_600_000_000; // início exato de uma janela

describe("QR dinâmico", () => {
  it("aceita o código atual", async () => {
    const { code } = await currentQr(SECRET, EVENT, "entry", T0 + 3_000);
    expect(await verifyQrCode(SECRET, EVENT, "entry", code, T0 + 3_000)).toBe(true);
  });

  it("informa quanto falta para a troca", async () => {
    const qr = await currentQr(SECRET, EVENT, "entry", T0 + 3_000);
    expect(qr.msRemaining).toBe(QR_WINDOW_MS - 3_000);
  });

  it("muda a cada janela de 10s", async () => {
    const a = await currentQr(SECRET, EVENT, "entry", T0);
    const b = await currentQr(SECRET, EVENT, "entry", T0 + QR_WINDOW_MS);
    expect(a.code).not.toBe(b.code);
  });

  it("aceita o código anterior dentro da folga de 5s", async () => {
    const { code } = await currentQr(SECRET, EVENT, "entry", T0 + 9_000);
    const now = T0 + QR_WINDOW_MS + QR_GRACE_MS - 1;
    expect(await verifyQrCode(SECRET, EVENT, "entry", code, now)).toBe(true);
  });

  it("recusa o código anterior depois da folga (foto antiga)", async () => {
    const { code } = await currentQr(SECRET, EVENT, "entry", T0 + 9_000);
    const now = T0 + QR_WINDOW_MS + QR_GRACE_MS;
    expect(await verifyQrCode(SECRET, EVENT, "entry", code, now)).toBe(false);
  });

  it("recusa código de duas janelas atrás", async () => {
    const code = await qrCodeForWindow(SECRET, EVENT, "entry", T0 / QR_WINDOW_MS - 2);
    expect(await verifyQrCode(SECRET, EVENT, "entry", code, T0 + 1_000)).toBe(false);
  });

  it("recusa código de outro evento ou de outra fase", async () => {
    const now = T0 + 1_000;
    const otherEvent = await currentQr(SECRET, "evt_2", "entry", now);
    const otherPhase = await currentQr(SECRET, EVENT, "exit", now);
    expect(await verifyQrCode(SECRET, EVENT, "entry", otherEvent.code, now)).toBe(false);
    expect(await verifyQrCode(SECRET, EVENT, "entry", otherPhase.code, now)).toBe(false);
  });

  it("recusa código adulterado", async () => {
    expect(await verifyQrCode(SECRET, EVENT, "entry", "AAAAAAAA", T0)).toBe(false);
    expect(await verifyQrCode(SECRET, EVENT, "entry", "", T0)).toBe(false);
  });
});
