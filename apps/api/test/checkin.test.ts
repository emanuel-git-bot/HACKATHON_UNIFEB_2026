import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FAR_GPS,
  NEAR_GPS,
  createClient,
  createTestDb,
  eventPayload,
  login,
  seedBasics,
  type TestClient,
} from "./helpers";

let env: { DB: D1Database };
let coord: TestClient;

beforeEach(async () => {
  env = { DB: createTestDb() };
  await seedBasics(env.DB);
  coord = createClient(env);
  await login(coord, "coord1");
});

afterEach(() => {
  vi.useRealTimers();
});

async function createEvent(overrides: Record<string, unknown> = {}) {
  const r = await coord.json("/coord/events", { body: eventPayload(overrides) });
  expect(r.status).toBe(201);
  return r.body.event.id as string;
}

async function openPhase(eventId: string, phase: "entry" | "exit") {
  const r = await coord.json(`/coord/events/${eventId}/phase`, { body: { phase, open: true } });
  expect(r.status).toBe(200);
}

async function currentCode(eventId: string): Promise<{ code: string; phase: "entry" | "exit"; count: number }> {
  return (await coord.json(`/coord/events/${eventId}/qr`)).body;
}

async function scanAndCheckin(student: TestClient, eventId: string, gps: unknown = NEAR_GPS) {
  const { code, phase } = await currentCode(eventId);
  const scan = await student.json("/scan", { body: { eventId, phase, code } });
  expect(scan.status).toBe(200);
  return student.json("/checkin", { body: { ticket: scan.body.ticket, gps } });
}

describe("telão e QR", () => {
  it("só o coordenador do curso abre o telão", async () => {
    const id = await createEvent();
    const other = createClient(env);
    await login(other, "coord2");
    expect((await other.json(`/coord/events/${id}/qr`)).status).toBe(403);
  });

  it("sem fase aberta não há código", async () => {
    const id = await createEvent();
    const qr = await currentCode(id);
    expect(qr.code).toBeNull();
  });

  it("o código muda a cada 10 segundos", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(1_761_600_000_000);
    const id = await createEvent({ startsAt: Date.now() - 1000, endsAt: Date.now() + 3_600_000 });
    await openPhase(id, "entry");
    const a = await currentCode(id);
    vi.setSystemTime(1_761_600_010_000);
    const b = await currentCode(id);
    expect(a.code).not.toBe(b.code);
  });
});

describe("leitura do QR (scan)", () => {
  it("emite ticket para código atual, mesmo sem login", async () => {
    const id = await createEvent();
    await openPhase(id, "entry");
    const { code } = await currentCode(id);
    const r = await createClient(env).json("/scan", { body: { eventId: id, phase: "entry", code } });
    expect(r.status).toBe(200);
    expect(r.body.ticket).toBeTruthy();
  });

  it("recusa foto antiga do QR como expirada e registra a tentativa", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(1_761_600_002_000);
    const id = await createEvent({ startsAt: Date.now() - 1000, endsAt: Date.now() + 3_600_000 });
    await openPhase(id, "entry");
    const { code } = await currentCode(id);
    vi.setSystemTime(1_761_600_002_000 + 16_000);
    const r = await createClient(env).json("/scan", { body: { eventId: id, phase: "entry", code } });
    expect(r.status).toBe(410);
    expect(r.body.error.code).toBe("qr_expired");
    const attempts = await coord.json(`/coord/events/${id}/attempts`);
    expect(attempts.body.attempts[0]).toMatchObject({ result: "rejected", reason: "qr_expired" });
  });

  it("recusa código adulterado", async () => {
    const id = await createEvent();
    await openPhase(id, "entry");
    const r = await createClient(env).json("/scan", { body: { eventId: id, phase: "entry", code: "ZZZZZZZZ" } });
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe("qr_invalid");
  });

  it("recusa fase fechada", async () => {
    const id = await createEvent({ checkinMode: "entry_exit" });
    await openPhase(id, "entry");
    const { code } = await currentCode(id);
    await coord.json(`/coord/events/${id}/phase`, { body: { phase: "entry", open: false } });
    const r = await createClient(env).json("/scan", { body: { eventId: id, phase: "entry", code } });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("phase_closed");
  });
});

describe("check-in", () => {
  it("confirma presença perto do local, emite certificado e conta no telão", async () => {
    const id = await createEvent();
    await openPhase(id, "entry");
    const student = createClient(env);
    await login(student, "1001");
    const r = await scanAndCheckin(student, id);
    expect(r.status).toBe(200);
    expect(r.body.attendance.status).toBe("completed");
    expect(r.body.certificateId).toBeTruthy();
    expect((await currentCode(id)).count).toBe(1);
    // inscrição automática
    expect((await student.json("/me/events")).body.events[0].registered).toBe(true);
  });

  it("ticket permite login depois da leitura e é de uso único", async () => {
    const id = await createEvent();
    await openPhase(id, "entry");
    const { code } = await currentCode(id);
    const student = createClient(env);
    const scan = await student.json("/scan", { body: { eventId: id, phase: "entry", code } });
    await login(student, "1001");
    const first = await student.json("/checkin", { body: { ticket: scan.body.ticket, gps: NEAR_GPS } });
    expect(first.status).toBe(200);
    const again = await student.json("/checkin", { body: { ticket: scan.body.ticket, gps: NEAR_GPS } });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("ticket_used");
  });

  it("ticket vence em 3 minutos", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(1_761_600_000_000);
    const id = await createEvent({ startsAt: Date.now() - 1000, endsAt: Date.now() + 3_600_000 });
    await openPhase(id, "entry");
    const { code } = await currentCode(id);
    const student = createClient(env);
    const scan = await student.json("/scan", { body: { eventId: id, phase: "entry", code } });
    vi.setSystemTime(1_761_600_000_000 + 3 * 60_000 + 1);
    await login(student, "1001");
    const r = await student.json("/checkin", { body: { ticket: scan.body.ticket, gps: NEAR_GPS } });
    expect(r.status).toBe(410);
    expect(r.body.error.code).toBe("ticket_expired");
  });

  it("recusa segunda conta no mesmo aparelho", async () => {
    const id = await createEvent();
    await openPhase(id, "entry");
    const phone = createClient(env);
    await login(phone, "1001");
    expect((await scanAndCheckin(phone, id)).status).toBe(200);

    phone.logoutLocal();
    await login(phone, "1002");
    const r = await scanAndCheckin(phone, id);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("device_reused");
  });

  it("fora do raio fica suspeita, não recusada", async () => {
    const id = await createEvent();
    await openPhase(id, "entry");
    const student = createClient(env);
    await login(student, "1001");
    const r = await scanAndCheckin(student, id, FAR_GPS);
    expect(r.status).toBe(200);
    expect(r.body.attendance.status).toBe("suspect");
    expect(r.body.attendance.suspectReason).toContain("Fora do raio");
    expect(r.body.certificateId).toBeNull();
  });

  it("GPS negado fica suspeito", async () => {
    const id = await createEvent();
    await openPhase(id, "entry");
    const student = createClient(env);
    await login(student, "1001");
    const r = await scanAndCheckin(student, id, null);
    expect(r.body.attendance.status).toBe("suspect");
  });

  it("rede autorizada dispensa o GPS", async () => {
    await env.DB.exec(`INSERT INTO settings (key, value) VALUES ('allowed_ips', '["200.150.10.0/24"]')`);
    const id = await createEvent();
    await openPhase(id, "entry");
    const student = createClient(env);
    await login(student, "1001");
    const { code } = await currentCode(id);
    const scan = await student.json("/scan", { body: { eventId: id, phase: "entry", code } });
    const r = await student.json("/checkin", { body: { ticket: scan.body.ticket, gps: null }, ip: "200.150.10.44" });
    expect(r.body.attendance.status).toBe("completed");
  });

  it("modo entrada e saída: só entrada fica incompleta; saída conclui", async () => {
    const id = await createEvent({ checkinMode: "entry_exit" });
    await openPhase(id, "entry");
    const student = createClient(env);
    await login(student, "1001");
    const entry = await scanAndCheckin(student, id);
    expect(entry.body.attendance.status).toBe("incomplete");
    expect(entry.body.certificateId).toBeNull();

    await openPhase(id, "exit");
    const exit = await scanAndCheckin(student, id);
    expect(exit.body.attendance.status).toBe("completed");
    expect(exit.body.certificateId).toBeTruthy();
  });

  it("modo só saída: a saída sozinha conclui", async () => {
    const id = await createEvent({ checkinMode: "exit" });
    await openPhase(id, "exit");
    const student = createClient(env);
    await login(student, "1001");
    expect((await scanAndCheckin(student, id)).body.attendance.status).toBe("completed");
  });
});

describe("palavra-chave", () => {
  async function keywordEvent() {
    const id = await createEvent({ checkinMode: "entry_keyword", keyword: "Criptografia" });
    await openPhase(id, "entry");
    const student = createClient(env);
    await login(student, "1001");
    await scanAndCheckin(student, id);
    return { id, student };
  }

  it("exige a fase de saída aberta", async () => {
    const { id, student } = await keywordEvent();
    const r = await student.json(`/events/${id}/keyword`, { body: { keyword: "criptografia", gps: NEAR_GPS } });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("phase_closed");
  });

  it("aceita sem diferenciar caixa e acento e conclui a presença", async () => {
    const { id, student } = await keywordEvent();
    await openPhase(id, "exit");
    const r = await student.json(`/events/${id}/keyword`, { body: { keyword: " CRIPTOGRAFÍA ", gps: NEAR_GPS } });
    expect(r.status).toBe(200);
    expect(r.body.attendance.status).toBe("completed");
    expect(r.body.certificateId).toBeTruthy();
  });

  it("bloqueia após 3 erros e marca como suspeita", async () => {
    const { id, student } = await keywordEvent();
    await openPhase(id, "exit");
    const first = await student.json(`/events/${id}/keyword`, { body: { keyword: "a", gps: NEAR_GPS } });
    expect(first.body.error).toMatchObject({ code: "keyword_wrong", triesLeft: 2 });
    await student.json(`/events/${id}/keyword`, { body: { keyword: "b", gps: NEAR_GPS } });
    const third = await student.json(`/events/${id}/keyword`, { body: { keyword: "c", gps: NEAR_GPS } });
    expect(third.status).toBe(429);
    expect(third.body.error.attendance.status).toBe("suspect");
    const fourth = await student.json(`/events/${id}/keyword`, { body: { keyword: "criptografia", gps: NEAR_GPS } });
    expect(fourth.body.error.code).toBe("keyword_locked");
  });

  it("o telão não mostra QR na fase da palavra-chave", async () => {
    const { id } = await keywordEvent();
    await openPhase(id, "exit");
    const qr = await currentCode(id);
    expect(qr.code).toBeNull();
    expect((qr as any).keywordPhase).toBe(true);
  });
});

describe("evento com modo travado", () => {
  it("não deixa mudar o modo depois de presenças registradas", async () => {
    const id = await createEvent();
    await openPhase(id, "entry");
    const student = createClient(env);
    await login(student, "1001");
    await scanAndCheckin(student, id);
    const r = await coord.json(`/coord/events/${id}`, {
      method: "PUT",
      body: eventPayload({ checkinMode: "entry_exit" }),
    });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("mode_locked");
  });
});
