import { beforeEach, describe, expect, it } from "vitest";
import { syncSiteBanners } from "../src/routes/banners";
import { createClient, createTestDb, login, seedBasics, type TestClient } from "./helpers";

let env: { DB: D1Database };
let admin: TestClient;
let atletica: TestClient;
let student: TestClient;

const HOUR = 60 * 60 * 1000;

function gamePayload(overrides: Record<string, unknown> = {}) {
  return {
    kind: "futsal",
    title: "Futsal: EC x SI",
    startsAt: Date.now() + 24 * HOUR,
    location: "Quadra poliesportiva",
    capacity: 2,
    ...overrides,
  };
}

beforeEach(async () => {
  env = { DB: createTestDb() };
  await seedBasics(env.DB);
  admin = createClient(env);
  await login(admin, "admin");
  const created = await admin.json("/admin/organizers", { body: { name: "Atlética Cerberus", login: "atletica", password: "senha123" } });
  expect(created.status).toBe(201);
  atletica = createClient(env);
  await login(atletica, "atletica");
  student = createClient(env);
  await login(student, "1001");
});

describe("contas da Atlética", () => {
  it("o admin lista e desativa; conta desativada perde a sessão", async () => {
    const list = await admin.json("/admin/organizers");
    expect(list.body.organizers).toEqual([expect.objectContaining({ name: "Atlética Cerberus", login: "atletica", active: true })]);
    const id = list.body.organizers[0].id;
    await admin.json(`/admin/organizers/${id}`, { method: "PUT", body: { active: false } });
    expect((await atletica.json("/auth/me")).status).toBe(401);
  });

  it("o login da Atlética não pode repetir o de outra conta", async () => {
    const r = await admin.json("/admin/organizers", { body: { name: "Outra", login: "1001", password: "senha123" } });
    expect(r.status).toBe(409);
  });
});

describe("eventos da Atlética", () => {
  it("a Atlética cria; o mural é público e mostra quantos confirmaram", async () => {
    const created = await atletica.json("/social-events", { body: gamePayload() });
    expect(created.status).toBe(201);
    expect(created.body.event).toMatchObject({ organizerName: "Atlética Cerberus", confirmed: 0, canManage: true });

    const pub = await createClient(env).json(`/social-events/${created.body.event.id}`);
    expect(pub.status).toBe(200);
    expect(pub.body.event).toMatchObject({ title: "Futsal: EC x SI", isConfirmed: false, canManage: false });
  });

  it("aluno e coordenador não criam evento da Atlética", async () => {
    expect((await student.json("/social-events", { body: gamePayload() })).status).toBe(403);
    const coord = createClient(env);
    await login(coord, "coord1");
    expect((await coord.json("/social-events", { body: gamePayload() })).status).toBe(403);
  });

  it("confirma presença, respeita as vagas e deixa cancelar", async () => {
    const id = (await atletica.json("/social-events", { body: gamePayload() })).body.event.id;
    const yes = await student.json(`/social-events/${id}/rsvp`, { body: {} });
    expect(yes.body.event).toMatchObject({ confirmed: 1, isConfirmed: true });
    // confirmar de novo não duplica
    expect((await student.json(`/social-events/${id}/rsvp`, { body: {} })).body.event.confirmed).toBe(1);

    const second = createClient(env);
    await login(second, "1002");
    await second.json(`/social-events/${id}/rsvp`, { body: {} });
    const third = createClient(env);
    await login(third, "2001");
    const full = await third.json(`/social-events/${id}/rsvp`, { body: {} });
    expect(full.status).toBe(409);
    expect(full.body.error.code).toBe("event_full");

    const cancel = await student.json(`/social-events/${id}/rsvp`, { method: "DELETE" });
    expect(cancel.body.event).toMatchObject({ confirmed: 1, isConfirmed: false });
  });

  it("a Atlética vê a lista de confirmados; outro aluno não", async () => {
    const id = (await atletica.json("/social-events", { body: gamePayload() })).body.event.id;
    await student.json(`/social-events/${id}/rsvp`, { body: {} });
    const list = await atletica.json(`/social-events/${id}/rsvps`);
    expect(list.body.rsvps).toEqual([expect.objectContaining({ name: "Aluno Um", ra: "1001", courseName: "Engenharia de Computação" })]);
    expect((await student.json(`/social-events/${id}/rsvps`)).status).toBe(403);
  });

  it("exige local e data futura; local do mapa vira o nome do lugar", async () => {
    const noPlace = await atletica.json("/social-events", { body: gamePayload({ location: null }) });
    expect(noPlace.status).toBe(400);
    const past = await atletica.json("/social-events", { body: gamePayload({ startsAt: Date.now() - 1000 }) });
    expect(past.status).toBe(400);

    const place = (await admin.json("/places", { body: { name: "Quadra", category: "sports", lat: -20.57, lng: -48.56 } })).body.place;
    const r = await atletica.json("/social-events", { body: gamePayload({ placeId: place.id, location: null }) });
    expect(r.body.event).toMatchObject({ placeId: place.id, location: "Quadra" });
  });

  it("só quem criou (ou o admin) edita e exclui", async () => {
    const id = (await atletica.json("/social-events", { body: gamePayload() })).body.event.id;
    expect((await student.json(`/social-events/${id}`, { method: "DELETE" })).status).toBe(403);
    const edited = await atletica.json(`/social-events/${id}`, { method: "PUT", body: gamePayload({ title: "Futsal remarcado" }) });
    expect(edited.body.event.title).toBe("Futsal remarcado");
    expect((await admin.json(`/social-events/${id}`, { method: "DELETE" })).status).toBe(200);
    expect((await createClient(env).json(`/social-events/${id}`)).status).toBe(404);
  });
});

describe("vagas nos avisos", () => {
  it("coordenador publica estágio com empresa, link e prazo", async () => {
    const coord = createClient(env);
    await login(coord, "coord1");
    const deadlineAt = Date.now() + 5 * 24 * HOUR;
    const r = await coord.json("/announcements", {
      body: {
        title: "Estágio em TI",
        body: "6 horas por dia.",
        category: "internship",
        company: "Empresa X",
        linkUrl: "https://empresa.example/vaga",
        deadlineAt,
      },
    });
    expect(r.status).toBe(201);
    const list = await student.json("/announcements");
    expect(list.body.announcements[0]).toMatchObject({
      category: "internship",
      company: "Empresa X",
      linkUrl: "https://empresa.example/vaga",
      deadlineAt,
    });
  });

  it("recusa link de candidatura que não é http", async () => {
    const r = await admin.json("/announcements", {
      body: { title: "Vaga", body: "texto", category: "job", linkUrl: "javascript:alert(1)" },
    });
    expect(r.status).toBe(400);
  });
});

describe("palestras", () => {
  it("o coordenador não cria mais minicurso", async () => {
    const coord = createClient(env);
    await login(coord, "coord1");
    const start = Date.now() + HOUR;
    const r = await coord.json("/coord/events", {
      body: { title: "Minicurso", category: "minicurso", location: "Lab", startsAt: start, endsAt: start + HOUR, hours: 2, checkinMode: "entry" },
    });
    expect(r.status).toBe(400);
  });
});

describe("banners do site", () => {
  const html = `<div id="oc-slider"><a href="https://sistema.unifeb.edu.br/"><img src="http://unifeb.edu.br/uploads/banners/b1.png"></a>
    <img src="http://unifeb.edu.br/uploads/banners/b2.png"></div></section>`;
  const fakeFetch = (async () => new Response(html, { status: 200 })) as unknown as typeof fetch;

  it("copia o carrossel do site e serve para qualquer pessoa", async () => {
    expect(await syncSiteBanners(env.DB, fakeFetch)).toHaveLength(2);
    const r = await createClient(env).json("/banners");
    expect(r.body.banners).toEqual([
      { imageUrl: "https://www.unifeb.edu.br/uploads/banners/b1.png", linkUrl: "https://sistema.unifeb.edu.br/" },
      { imageUrl: "https://www.unifeb.edu.br/uploads/banners/b2.png", linkUrl: null },
    ]);
    expect(r.body.syncedAt).toBeGreaterThan(0);
  });

  it("se o site não tiver banners, mantém os antigos", async () => {
    await syncSiteBanners(env.DB, fakeFetch);
    const broken = (async () => new Response("<html></html>", { status: 200 })) as unknown as typeof fetch;
    await expect(syncSiteBanners(env.DB, broken)).rejects.toThrow();
    expect((await createClient(env).json("/banners")).body.banners).toHaveLength(2);
  });

  it("só o admin força a atualização", async () => {
    expect((await student.json("/banners/sync", { body: {} })).status).toBe(403);
  });
});
