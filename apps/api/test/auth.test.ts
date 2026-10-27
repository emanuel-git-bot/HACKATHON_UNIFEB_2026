import { beforeEach, describe, expect, it } from "vitest";
import { createClient, createTestDb, login, seedBasics } from "./helpers";

let env: { DB: D1Database };

beforeEach(async () => {
  env = { DB: createTestDb() };
  await seedBasics(env.DB);
});

describe("login com RA e senha", () => {
  it("entra com credenciais válidas e mantém a sessão", async () => {
    const client = createClient(env);
    const r = await client.json("/auth/login", { body: { ra: "1001", password: "senha123" } });
    expect(r.status).toBe(200);
    expect(r.body.user).toMatchObject({ ra: "1001", role: "student", courseName: "Engenharia de Computação" });
    const me = await client.json("/auth/me");
    expect(me.body.user.id).toBe("s1");
  });

  it("usa a mesma mensagem para RA inexistente e senha errada", async () => {
    const client = createClient(env);
    const wrongPw = await client.json("/auth/login", { body: { ra: "1001", password: "errada" } });
    const noUser = await client.json("/auth/login", { body: { ra: "9999", password: "senha123" } });
    expect(wrongPw.status).toBe(401);
    expect(noUser.status).toBe(401);
    expect(wrongPw.body.error.message).toBe(noUser.body.error.message);
  });

  it("bloqueia o RA após 5 erros seguidos", async () => {
    const client = createClient(env);
    for (let i = 0; i < 5; i++) await client.json("/auth/login", { body: { ra: "1001", password: "x" } });
    const r = await client.json("/auth/login", { body: { ra: "1001", password: "senha123" } });
    expect(r.status).toBe(429);
  });

  it("nunca devolve senha ou hash", async () => {
    const client = createClient(env);
    const res = await client.request("/auth/login", { body: { ra: "1001", password: "senha123" } });
    const text = await res.text();
    expect(text).not.toContain("pbkdf2");
    expect(text).not.toContain("password");
  });

  it("logout encerra a sessão", async () => {
    const client = createClient(env);
    await login(client, "1001");
    await client.json("/auth/logout", { body: {} });
    expect((await client.json("/auth/me")).status).toBe(401);
  });

  it("coordenador desativado não entra", async () => {
    await env.DB.exec("UPDATE users SET active = 0 WHERE id = 'coord1'");
    const r = await createClient(env).json("/auth/login", { body: { ra: "coord1", password: "senha123" } });
    expect(r.status).toBe(401);
  });
});

describe("cadastro de aluno", () => {
  it("cria a conta com RA novo e já entra", async () => {
    const client = createClient(env);
    const r = await client.json("/auth/register", {
      body: { name: "Maria Teste", ra: "3001", courseId: "c1", password: "segredo1" },
    });
    expect(r.status).toBe(201);
    expect((await client.json("/auth/me")).body.user.ra).toBe("3001");
  });

  it("recusa RA duplicado", async () => {
    const r = await createClient(env).json("/auth/register", {
      body: { name: "Outro Aluno", ra: "1001", courseId: "c1", password: "segredo1" },
    });
    expect(r.status).toBe(409);
    expect(r.body.error.message).toContain("já possui conta");
  });
});

describe("papéis e permissões", () => {
  it("aluno não acessa rota de coordenador", async () => {
    const client = createClient(env);
    await login(client, "1001");
    expect((await client.json("/coord/events")).status).toBe(403);
    expect((await client.json("/admin/coordinators")).status).toBe(403);
  });

  it("sem sessão recebe 401", async () => {
    expect((await createClient(env).json("/events")).status).toBe(401);
  });

  it("coordenador não acessa evento de outro curso", async () => {
    const c1 = createClient(env);
    await login(c1, "coord1");
    const created = await c1.json("/coord/events", {
      body: {
        title: "Evento EC",
        location: "Sala 1",
        startsAt: Date.now(),
        endsAt: Date.now() + 3_600_000,
        hours: 2,
        checkinMode: "entry",
      },
    });
    const c2 = createClient(env);
    await login(c2, "coord2");
    expect((await c2.json(`/coord/events/${created.body.event.id}`)).status).toBe(403);
  });
});
