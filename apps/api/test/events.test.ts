import { beforeEach, describe, expect, it } from "vitest";
import { createClient, createTestDb, eventPayload, login, seedBasics, type TestClient } from "./helpers";

let env: { DB: D1Database };
let coord: TestClient;

beforeEach(async () => {
  env = { DB: createTestDb() };
  await seedBasics(env.DB);
  coord = createClient(env);
  await login(coord, "coord1");
});

describe("criação de evento", () => {
  it("cria com raio padrão de 100 m e aparece no mural", async () => {
    const { lat, lng, radiusM, ...rest } = eventPayload();
    const r = await coord.json("/coord/events", { body: rest });
    expect(r.status).toBe(201);
    const detail = await coord.json(`/coord/events/${r.body.event.id}`);
    expect(detail.body.event.radiusM).toBe(100);

    const student = createClient(env);
    await login(student, "1001");
    const mural = await student.json("/events");
    expect(mural.body.events.map((e: any) => e.title)).toContain("Palestra de Teste");
  });

  it("recusa fim antes do início e horas inválidas", async () => {
    const start = Date.now();
    const a = await coord.json("/coord/events", { body: eventPayload({ startsAt: start, endsAt: start - 1 }) });
    expect(a.status).toBe(400);
    expect(a.body.error.field).toBe("endsAt");
    const b = await coord.json("/coord/events", { body: eventPayload({ hours: 0 }) });
    expect(b.status).toBe(400);
    expect(b.body.error.field).toBe("hours");
  });

  it("exige palavra-chave no modo entrada + palavra-chave", async () => {
    const r = await coord.json("/coord/events", { body: eventPayload({ checkinMode: "entry_keyword" }) });
    expect(r.status).toBe(400);
    expect(r.body.error.field).toBe("keyword");
  });

  it("não expõe segredo do QR nem hash da palavra-chave", async () => {
    const r = await coord.request("/coord/events", {
      body: eventPayload({ checkinMode: "entry_keyword", keyword: "segredo" }),
    });
    const text = await r.text();
    expect(text).not.toContain("qr_secret");
    expect(text).not.toContain("keyword_hash");
  });

  it("aluno não cria evento", async () => {
    const student = createClient(env);
    await login(student, "1001");
    expect((await student.json("/coord/events", { body: eventPayload() })).status).toBe(403);
  });
});

describe("mural e inscrição", () => {
  it("esconde eventos encerrados", async () => {
    const past = Date.now() - 10 * 60 * 60 * 1000;
    await coord.json("/coord/events", { body: eventPayload({ title: "Antigo", startsAt: past, endsAt: past + 1000 }) });
    const student = createClient(env);
    await login(student, "1001");
    const mural = await student.json("/events");
    expect(mural.body.events.map((e: any) => e.title)).not.toContain("Antigo");
  });

  it("inscrição repetida mantém uma só e aparece em Meus eventos", async () => {
    const { body } = await coord.json("/coord/events", { body: eventPayload() });
    const student = createClient(env);
    await login(student, "1001");
    await student.json(`/events/${body.event.id}/register`, { body: {} });
    await student.json(`/events/${body.event.id}/register`, { body: {} });
    const mine = await student.json("/me/events");
    expect(mine.body.events).toHaveLength(1);
    expect(mine.body.events[0].registered).toBe(true);

    const counts = await coord.json(`/coord/events/${body.event.id}`);
    expect(counts.body.counts.registered).toBe(1);

    await student.json(`/events/${body.event.id}/register`, { method: "DELETE" });
    expect((await student.json("/me/events")).body.events).toHaveLength(0);
  });
});
