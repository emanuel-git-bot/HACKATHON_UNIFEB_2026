import { beforeEach, describe, expect, it } from "vitest";
import { createClient, createTestDb, login, seedBasics, type TestClient } from "./helpers";

let env: { DB: D1Database };
let admin: TestClient;
let student: TestClient;

const HOUR = 60 * 60 * 1000;
const place = { name: "Biblioteca", category: "library", description: "", lat: -20.575, lng: -48.561, accessible: true };

beforeEach(async () => {
  env = { DB: createTestDb() };
  await seedBasics(env.DB);
  admin = createClient(env);
  await login(admin, "admin");
  student = createClient(env);
  await login(student, "1001");
});

async function newPlace() {
  return (await admin.json("/places", { body: place })).body.place.id as string;
}

function groupPayload(placeId: string | null, overrides: Record<string, unknown> = {}) {
  return {
    title: "Revisão de Cálculo I",
    subject: "Cálculo I",
    meetsAt: Date.now() + 2 * HOUR,
    placeId,
    maxMembers: 2,
    ...overrides,
  };
}

describe("mapa do campus", () => {
  it("é público para leitura e só o admin edita", async () => {
    const id = await newPlace();
    const pub = await createClient(env).json("/places");
    expect(pub.status).toBe(200);
    expect(pub.body.places[0]).toMatchObject({ id, name: "Biblioteca", accessible: true });
    expect((await student.json("/places", { body: place })).status).toBe(403);
    expect((await createClient(env).json("/places", { body: place })).status).toBe(401);
  });

  it("valida a categoria", async () => {
    const r = await admin.json("/places", { body: { ...place, category: "piscina" } });
    expect(r.status).toBe(400);
    expect(r.body.error.field).toBe("category");
  });

  it("admin edita e exclui", async () => {
    const id = await newPlace();
    const up = await admin.json(`/places/${id}`, { method: "PUT", body: { ...place, name: "Biblioteca Central" } });
    expect(up.body.place.name).toBe("Biblioteca Central");
    expect((await admin.json(`/places/${id}`, { method: "DELETE" })).status).toBe(200);
    expect((await admin.json(`/places/${id}`, { method: "DELETE" })).status).toBe(404);
  });
});

describe("grupos de estudo", () => {
  it("cria, entra e respeita o limite de vagas", async () => {
    const placeId = await newPlace();
    const created = await student.json("/groups", { body: groupPayload(placeId) });
    expect(created.status).toBe(201);
    expect(created.body.group).toMatchObject({ members: 1, isMember: true, isOwner: true });
    const id = created.body.group.id;

    const second = createClient(env);
    await login(second, "1002");
    const joined = await second.json(`/groups/${id}/join`, { body: {} });
    expect(joined.body.group).toMatchObject({ members: 2, isMember: true, isOwner: false });

    const third = createClient(env);
    await login(third, "2001");
    const full = await third.json(`/groups/${id}/join`, { body: {} });
    expect(full.status).toBe(409);
    expect(full.body.error.code).toBe("group_full");

    const detail = await second.json(`/groups/${id}`);
    expect(detail.body.members.map((m: { name: string }) => m.name)).toEqual(["Aluno Um", "Aluno Dois"]);
  });

  it("exige local ou link e data futura", async () => {
    const noPlace = await student.json("/groups", { body: groupPayload(null) });
    expect(noPlace.status).toBe(400);
    const online = await student.json("/groups", { body: groupPayload(null, { onlineUrl: "https://meet.google.com/abc" }) });
    expect(online.status).toBe(201);
    const past = await student.json("/groups", { body: groupPayload(null, { onlineUrl: "https://x.com", meetsAt: Date.now() - 1000 }) });
    expect(past.status).toBe(400);
  });

  it("grupo só do curso fica escondido para outros cursos", async () => {
    const r = await student.json("/groups", { body: groupPayload(await newPlace(), { courseOnly: true }) });
    const other = createClient(env);
    await login(other, "2001");
    expect((await other.json("/groups")).body.groups).toHaveLength(0);
    expect((await other.json(`/groups/${r.body.group.id}`)).status).toBe(404);
  });

  it("criador não sai, mas exclui; outro aluno não exclui", async () => {
    const id = (await student.json("/groups", { body: groupPayload(await newPlace()) })).body.group.id;
    expect((await student.json(`/groups/${id}/join`, { method: "DELETE" })).status).toBe(409);
    const other = createClient(env);
    await login(other, "1002");
    expect((await other.json(`/groups/${id}`, { method: "DELETE" })).status).toBe(403);
    expect((await student.json(`/groups/${id}`, { method: "DELETE" })).status).toBe(200);
  });
});

describe("avisos", () => {
  it("coordenador publica para o próprio curso e só esse curso vê", async () => {
    const coord = createClient(env);
    await login(coord, "coord1");
    const r = await coord.json("/announcements", {
      body: { title: "Prova remarcada", body: "A prova de Cálculo foi para sexta.", category: "exam", courseId: null },
    });
    expect(r.status).toBe(201);

    const mine = await student.json("/announcements");
    expect(mine.body.announcements[0]).toMatchObject({ title: "Prova remarcada", courseName: "Engenharia de Computação" });
    expect(mine.body.unread).toBe(1);

    const other = createClient(env);
    await login(other, "2001");
    expect((await other.json("/announcements")).body.announcements).toHaveLength(0);
  });

  it("admin publica para o campus todo e o aluno marca como lido", async () => {
    await admin.json("/announcements", { body: { title: "Semana de calouros", body: "Boas-vindas!", category: "event" } });
    const list = await student.json("/announcements");
    expect(list.body.unread).toBe(1);
    await student.json("/announcements/read", { body: { ids: [list.body.announcements[0].id] } });
    expect((await student.json("/announcements")).body.unread).toBe(0);
  });

  it("aluno não publica", async () => {
    const r = await student.json("/announcements", { body: { title: "Oi", body: "teste", category: "notice" } });
    expect(r.status).toBe(403);
  });
});

describe("recursos compartilhados", () => {
  it("compartilha link, exige URL exceto para livro, e só o dono exclui", async () => {
    const noUrl = await student.json("/resources", { body: { title: "Resumo de Física", subject: "Física", kind: "summary" } });
    expect(noUrl.status).toBe(400);
    const book = await student.json("/resources", { body: { title: "Livro Cálculo Stewart", subject: "Cálculo", kind: "book" } });
    expect(book.status).toBe(201);
    const link = await student.json("/resources", {
      body: { title: "Resumo de Física", subject: "Física", kind: "summary", url: "https://drive.google.com/x" },
    });
    expect(link.status).toBe(201);

    const other = createClient(env);
    await login(other, "2001");
    const list = await other.json("/resources");
    expect(list.body.resources).toHaveLength(2);
    expect(list.body.resources.every((r: { canDelete: boolean }) => !r.canDelete)).toBe(true);
    expect((await other.json(`/resources/${link.body.id}`, { method: "DELETE" })).status).toBe(403);
    expect((await student.json(`/resources/${link.body.id}`, { method: "DELETE" })).status).toBe(200);
  });

  it("recusa link que não é http", async () => {
    const r = await student.json("/resources", {
      body: { title: "Malicioso", subject: "X", kind: "link", url: "javascript:alert(1)" },
    });
    expect(r.status).toBe(400);
  });
});

describe("relatos de acessibilidade", () => {
  it("aluno relata, vê só os seus, e o admin resolve", async () => {
    const placeId = await newPlace();
    const r = await student.json("/accessibility-reports", { body: { placeId, description: "Rampa bloqueada por um carro." } });
    expect(r.status).toBe(201);

    const other = createClient(env);
    await login(other, "1002");
    expect((await other.json("/accessibility-reports")).body.reports).toHaveLength(0);

    const all = await admin.json("/accessibility-reports");
    expect(all.body.reports[0]).toMatchObject({ placeName: "Biblioteca", status: "open", userName: "Aluno Um" });
    expect((await student.json(`/accessibility-reports/${r.body.id}/resolve`, { body: {} })).status).toBe(403);
    await admin.json(`/accessibility-reports/${r.body.id}/resolve`, { body: {} });
    expect((await student.json("/accessibility-reports")).body.reports[0].status).toBe("resolved");
  });
});
