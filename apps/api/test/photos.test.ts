import { beforeEach, describe, expect, it } from "vitest";
import { createClient, createTestDb, createTestKv, login, seedBasics, type TestClient } from "./helpers";

let env: { DB: D1Database; PHOTOS: KVNamespace };
let kvKeys: () => string[];
let admin: TestClient;
let student: TestClient;
let placeId: string;

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 9, 9]);

function photoForm(fields: { placeId?: string; photo?: Uint8Array | string; thumb?: Uint8Array; caption?: string } = {}) {
  const form = new FormData();
  form.set("placeId", fields.placeId ?? placeId);
  const photo = fields.photo ?? JPEG;
  if (typeof photo === "string") form.set("photo", photo);
  else form.set("photo", new File([photo], "foto.jpg", { type: "image/jpeg" }));
  if (fields.thumb) form.set("thumb", new File([fields.thumb], "mini.png", { type: "image/png" }));
  if (fields.caption !== undefined) form.set("caption", fields.caption);
  form.set("width", "1600");
  form.set("height", "1200");
  return form;
}

beforeEach(async () => {
  const kv = createTestKv();
  env = { DB: createTestDb(), PHOTOS: kv.kv };
  kvKeys = kv.keys;
  await seedBasics(env.DB);
  admin = createClient(env);
  await login(admin, "admin");
  student = createClient(env);
  await login(student, "1001");
  const created = await admin.json("/places", {
    body: { name: "Biblioteca", category: "library", lat: -20.574, lng: -48.5625 },
  });
  placeId = created.body.place.id;
});

describe("fotos dos locais", () => {
  it("o admin envia; a foto aparece no mapa público e é servida com cache longo", async () => {
    const r = await admin.json("/place-photos", { body: photoForm({ thumb: PNG, caption: "  Entrada principal  " }) });
    expect(r.status).toBe(201);
    expect(r.body.photo).toMatchObject({ caption: "Entrada principal", width: 1600, height: 1200 });

    const map = await createClient(env).json("/places");
    const place = map.body.places.find((p: { id: string }) => p.id === placeId);
    expect(place.photos).toEqual([r.body.photo]);

    const full = await createClient(env).request(`/place-photos/${r.body.photo.id}/full`);
    expect(full.status).toBe(200);
    expect(full.headers.get("Content-Type")).toBe("image/jpeg");
    expect(full.headers.get("Cache-Control")).toContain("immutable");
    expect(new Uint8Array(await full.arrayBuffer())).toEqual(JPEG);

    const thumb = await createClient(env).request(`/place-photos/${r.body.photo.id}/thumb`);
    expect(thumb.headers.get("Content-Type")).toBe("image/png");
  });

  it("sem miniatura, a própria foto serve de miniatura", async () => {
    const r = await admin.json("/place-photos", { body: photoForm() });
    const thumb = await admin.request(`/place-photos/${r.body.photo.id}/thumb`);
    expect(new Uint8Array(await thumb.arrayBuffer())).toEqual(JPEG);
  });

  it("só o admin envia fotos", async () => {
    expect((await student.json("/place-photos", { body: photoForm() })).status).toBe(403);
    expect((await createClient(env).json("/place-photos", { body: photoForm() })).status).toBe(401);
    expect(kvKeys()).toEqual([]);
  });

  it("recusa arquivo que não é imagem, envio sem foto e local inexistente", async () => {
    const svg = await admin.json("/place-photos", { body: photoForm({ photo: new TextEncoder().encode("<svg onload=alert(1)>") }) });
    expect(svg.status).toBe(415);
    expect((await admin.json("/place-photos", { body: photoForm({ photo: "texto" }) })).status).toBe(400);
    expect((await admin.json("/place-photos", { body: photoForm({ placeId: "nao-existe" }) })).status).toBe(404);
    expect((await admin.json("/place-photos", { body: { placeId } })).status).toBe(400);
  });

  it("recusa foto acima do limite", async () => {
    const big = new Uint8Array(2_000_001);
    big.set(JPEG);
    const r = await admin.json("/place-photos", { body: photoForm({ photo: big }) });
    expect(r.status).toBe(413);
    expect(r.body.error.message).toContain("2 MB");
  });

  it("aceita até 6 fotos por local", async () => {
    for (let i = 0; i < 6; i++) expect((await admin.json("/place-photos", { body: photoForm() })).status).toBe(201);
    const seventh = await admin.json("/place-photos", { body: photoForm() });
    expect(seventh.status).toBe(409);
    expect(seventh.body.error.code).toBe("too_many_photos");
  });

  it("apagar a foto tira do mapa e do armazenamento", async () => {
    const r = await admin.json("/place-photos", { body: photoForm() });
    expect((await student.json(`/place-photos/${r.body.photo.id}`, { method: "DELETE" })).status).toBe(403);
    expect((await admin.json(`/place-photos/${r.body.photo.id}`, { method: "DELETE" })).status).toBe(200);
    expect((await admin.request(`/place-photos/${r.body.photo.id}/full`)).status).toBe(404);
    expect(kvKeys()).toEqual([]);
    expect((await admin.json(`/place-photos/${r.body.photo.id}`, { method: "DELETE" })).status).toBe(404);
  });

  it("excluir o local apaga as fotos dele", async () => {
    await admin.json("/place-photos", { body: photoForm() });
    await admin.json("/place-photos", { body: photoForm() });
    expect(kvKeys()).toHaveLength(4);
    expect((await admin.json(`/places/${placeId}`, { method: "DELETE" })).status).toBe(200);
    expect(kvKeys()).toEqual([]);
  });

  it("tamanho de foto desconhecido dá 404", async () => {
    const r = await admin.json("/place-photos", { body: photoForm() });
    expect((await admin.request(`/place-photos/${r.body.photo.id}/original`)).status).toBe(404);
  });
});
