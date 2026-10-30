import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { hashPassword } from "@syncfeb/core";
import { createApp } from "../src/app";

/** Implementação mínima da API do D1 sobre SQLite em memória, só para os testes. */
class TestStatement {
  constructor(
    private readonly db: DatabaseSync,
    private readonly sql: string,
    private readonly params: SQLInputValue[] = [],
  ) {}

  bind(...params: unknown[]) {
    return new TestStatement(this.db, this.sql, params as SQLInputValue[]);
  }

  async first<T>(): Promise<T | null> {
    return (this.db.prepare(this.sql).get(...this.params) as T | undefined) ?? null;
  }

  async all<T>() {
    return { results: this.db.prepare(this.sql).all(...this.params) as T[], success: true, meta: {} };
  }

  async run() {
    const r = this.db.prepare(this.sql).run(...this.params);
    return { success: true, results: [], meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
  }
}

export function createTestDb(): D1Database {
  const db = new DatabaseSync(":memory:");
  const dir = fileURLToPath(new URL("../migrations/", import.meta.url));
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    db.exec(readFileSync(dir + file, "utf8"));
  }
  const d1 = {
    prepare: (sql: string) => new TestStatement(db, sql),
    exec: async (sql: string) => {
      db.exec(sql);
      return { count: 0, duration: 0 };
    },
    batch: async (stmts: TestStatement[]) => Promise.all(stmts.map((s) => s.run())),
  };
  return d1 as unknown as D1Database;
}

/** KV em memória com a parte da API usada pelas fotos; `keys()` ajuda a conferir o que sobrou. */
export function createTestKv() {
  const store = new Map<string, { value: ArrayBuffer; metadata: unknown }>();
  const kv = {
    put: async (key: string, value: ArrayBuffer, options?: { metadata?: unknown }) => {
      store.set(key, { value, metadata: options?.metadata ?? null });
    },
    getWithMetadata: async (key: string) => ({ value: store.get(key)?.value ?? null, metadata: store.get(key)?.metadata ?? null }),
    delete: async (key: string) => {
      store.delete(key);
    },
  };
  return { kv: kv as unknown as KVNamespace, keys: () => [...store.keys()] };
}

export interface TestClient {
  /** `body` em FormData vai como multipart; qualquer outro valor vai como JSON. */
  request: (path: string, init?: { method?: string; body?: unknown; ip?: string }) => Promise<Response>;
  json: <T = any>(path: string, init?: { method?: string; body?: unknown; ip?: string }) => Promise<{ status: number; body: T }>;
  /** Simula outro navegador no mesmo aparelho: mantém o cookie do aparelho e apaga o de sessão. */
  logoutLocal: () => void;
}

/** Cliente que guarda cookies como um navegador (cada cliente = um aparelho). */
export function createClient(env: { DB: D1Database; PHOTOS?: KVNamespace }): TestClient {
  const app = createApp();
  const cookies = new Map<string, string>();

  const request: TestClient["request"] = async (path, init = {}) => {
    const headers = new Headers({ "CF-Connecting-IP": init.ip ?? "177.10.20.30" });
    const isForm = init.body instanceof FormData;
    if (init.body !== undefined && !isForm) headers.set("Content-Type", "application/json");
    if (cookies.size) headers.set("Cookie", [...cookies].map(([k, v]) => `${k}=${v}`).join("; "));
    const body = init.body === undefined ? undefined : isForm ? (init.body as FormData) : JSON.stringify(init.body);
    const res = await app.request(
      `https://syncfeb.test/api${path}`,
      { method: init.method ?? (init.body !== undefined ? "POST" : "GET"), headers, body },
      env,
    );
    for (const raw of (res.headers as unknown as globalThis.Headers & { getSetCookie(): string[] }).getSetCookie()) {
      const [pair] = raw.split(";");
      const [name, ...rest] = (pair ?? "").split("=");
      const value = rest.join("=");
      if (!name) continue;
      if (value === "" || /max-age=0/i.test(raw)) cookies.delete(name.trim());
      else cookies.set(name.trim(), value);
    }
    return res;
  };

  return {
    request,
    json: async (path, init) => {
      const res = await request(path, init);
      return { status: res.status, body: await res.json() };
    },
    logoutLocal: () => cookies.delete("sfb_session"),
  };
}

/** Banco com 1 curso, coordenador, admin e alunos prontos (senhas fracas: só testes). */
export async function seedBasics(db: D1Database) {
  const pw = await hashPassword("senha123", 1_000);
  const now = Date.now();
  const sql = [
    `INSERT INTO courses (id, name) VALUES ('c1', 'Engenharia de Computação'), ('c2', 'Sistemas de Informação')`,
    `INSERT INTO users (id, role, ra, name, course_id, password_hash, active, created_at) VALUES
      ('admin', 'admin', 'admin', 'Admin', NULL, '${pw}', 1, ${now}),
      ('coord1', 'coordinator', 'coord1', 'Coord EC', 'c1', '${pw}', 1, ${now}),
      ('coord2', 'coordinator', 'coord2', 'Coord SI', 'c2', '${pw}', 1, ${now}),
      ('s1', 'student', '1001', 'Aluno Um', 'c1', '${pw}', 1, ${now}),
      ('s2', 'student', '1002', 'Aluno Dois', 'c1', '${pw}', 1, ${now}),
      ('s3', 'student', '2001', 'Aluno SI', 'c2', '${pw}', 1, ${now})`,
  ];
  for (const s of sql) await db.exec(s);
}

export async function login(client: TestClient, ra: string, password = "senha123") {
  const r = await client.json("/auth/login", { body: { ra, password } });
  if (r.status !== 200) throw new Error(`login falhou para ${ra}: ${JSON.stringify(r.body)}`);
  return r.body;
}

export const AUDITORIO = { lat: -20.5531, lng: -48.5698 };
export const NEAR_GPS = { lat: -20.5531 + 30 / 111_320, lng: -48.5698, accuracy: 15 };
export const FAR_GPS = { lat: -20.5531 + 2_000 / 111_320, lng: -48.5698, accuracy: 15 };

export function eventPayload(overrides: Record<string, unknown> = {}) {
  const start = Date.now() - 60_000;
  return {
    title: "Palestra de Teste",
    description: "",
    speaker: "",
    category: "palestra",
    location: "Auditório",
    startsAt: start,
    endsAt: start + 2 * 60 * 60 * 1000,
    hours: 4,
    lat: AUDITORIO.lat,
    lng: AUDITORIO.lng,
    radiusM: 100,
    checkinMode: "entry",
    ...overrides,
  };
}
