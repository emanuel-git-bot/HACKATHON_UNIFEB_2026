import { describe, expect, it } from "vitest";
import { evaluateLocation, haversineMeters, ipMatches } from "./location";

// Um ponto em Barretos-SP como referência do auditório.
const AUDITORIO = { lat: -20.5531, lng: -48.5698 };
// ~1 metro de latitude
const METRO = 1 / 111_320;

const base = { ip: "177.10.20.30", allowedIps: ["200.150.10.0/24"], eventLocation: AUDITORIO, radiusM: 100 };

describe("haversineMeters", () => {
  it("mede distâncias curtas com precisão de metros", () => {
    const d = haversineMeters(AUDITORIO, { lat: AUDITORIO.lat + 50 * METRO, lng: AUDITORIO.lng });
    expect(d).toBeGreaterThan(49);
    expect(d).toBeLessThan(51);
  });
});

describe("ipMatches", () => {
  it("aceita IP exato e faixa CIDR", () => {
    expect(ipMatches("200.150.10.77", ["200.150.10.0/24"])).toBe(true);
    expect(ipMatches("189.1.2.3", ["189.1.2.3"])).toBe(true);
    expect(ipMatches("2804:14c::1", ["2804:14C::1"])).toBe(true);
  });

  it("recusa IP fora da lista", () => {
    expect(ipMatches("200.150.11.1", ["200.150.10.0/24"])).toBe(false);
    expect(ipMatches("200.150.10.1", [])).toBe(false);
    expect(ipMatches("lixo", ["200.150.10.0/24"])).toBe(false);
  });
});

describe("evaluateLocation", () => {
  it("passa pela rede autorizada mesmo sem GPS", () => {
    const r = evaluateLocation({ ...base, ip: "200.150.10.5", gps: null });
    expect(r).toEqual({ ok: true, via: "ip" });
  });

  it("passa pelo GPS dentro do raio", () => {
    const gps = { lat: AUDITORIO.lat + 60 * METRO, lng: AUDITORIO.lng, accuracy: 20 };
    const r = evaluateLocation({ ...base, gps });
    expect(r.ok).toBe(true);
  });

  it("desconta a margem de precisão do aparelho", () => {
    // 150 m de distância com 60 m de margem: 150 - 60 = 90 ≤ 100
    const gps = { lat: AUDITORIO.lat + 150 * METRO, lng: AUDITORIO.lng, accuracy: 60 };
    expect(evaluateLocation({ ...base, gps }).ok).toBe(true);
  });

  it("fica suspeito fora do raio", () => {
    const gps = { lat: AUDITORIO.lat + 340 * METRO, lng: AUDITORIO.lng, accuracy: 10 };
    const r = evaluateLocation({ ...base, gps });
    expect(r).toMatchObject({ ok: false, reason: "out_of_range" });
    if (!r.ok) expect(r.distanceM).toBeGreaterThan(330);
  });

  it("fica suspeito sem GPS", () => {
    expect(evaluateLocation({ ...base, gps: null })).toEqual({ ok: false, reason: "gps_unavailable" });
  });

  it("fica suspeito com GPS impreciso demais", () => {
    const gps = { ...AUDITORIO, accuracy: 500 };
    expect(evaluateLocation({ ...base, gps })).toMatchObject({ ok: false, reason: "low_accuracy" });
  });

  it("fica suspeito quando o evento não tem local definido", () => {
    const gps = { ...AUDITORIO, accuracy: 10 };
    expect(evaluateLocation({ ...base, eventLocation: null, gps })).toEqual({
      ok: false,
      reason: "event_without_location",
    });
  });
});
