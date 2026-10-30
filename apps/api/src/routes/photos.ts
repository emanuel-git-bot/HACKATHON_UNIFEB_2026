import { Hono } from "hono";
import { PLACE_PHOTO_LIMITS, detectImageType, type PhotoType } from "@syncfeb/core";
import { requireRole } from "../lib/auth";
import { ApiError, notFound } from "../lib/http";
import type { AppEnv, Bindings } from "../types";

interface PhotoRow {
  id: string;
  place_id: string;
  caption: string | null;
  width: number | null;
  height: number | null;
}

export type PlacePhoto = ReturnType<typeof photoJson>;

const photoJson = (r: PhotoRow) => ({
  id: r.id,
  caption: r.caption,
  width: r.width,
  height: r.height,
  url: `/api/place-photos/${r.id}/full`,
  thumbUrl: `/api/place-photos/${r.id}/thumb`,
});

type PhotoSize = "full" | "thumb";
const objectKey = (id: string, size: PhotoSize) => `place-photo:${id}:${size}`;

/** Fotos agrupadas por local (de um local só, quando `placeId` é informado). */
export async function photosByPlace(db: D1Database, placeId?: string): Promise<Map<string, PlacePhoto[]>> {
  const sql = "SELECT id, place_id, caption, width, height FROM place_photos";
  const stmt = placeId
    ? db.prepare(`${sql} WHERE place_id = ? ORDER BY created_at`).bind(placeId)
    : db.prepare(`${sql} ORDER BY created_at`);
  const grouped = new Map<string, PlacePhoto[]>();
  for (const row of (await stmt.all<PhotoRow>()).results) {
    grouped.set(row.place_id, [...(grouped.get(row.place_id) ?? []), photoJson(row)]);
  }
  return grouped;
}

async function deleteObjects(env: Bindings, ids: string[]) {
  await Promise.all(ids.flatMap((id) => [env.PHOTOS.delete(objectKey(id, "full")), env.PHOTOS.delete(objectKey(id, "thumb"))]));
}

/** Chamado antes de excluir um local, para não deixar arquivos órfãos no KV. */
export async function deletePlacePhotos(env: Bindings, placeId: string) {
  const rows = await env.DB.prepare("SELECT id FROM place_photos WHERE place_id = ?").bind(placeId).all<{ id: string }>();
  await deleteObjects(env, rows.results.map((r) => r.id));
  await env.DB.prepare("DELETE FROM place_photos WHERE place_id = ?").bind(placeId).run();
}

const megabytes = (bytes: number) => `${(bytes / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;

async function readImage(form: FormData, field: string, maxBytes: number): Promise<{ bytes: ArrayBuffer; type: PhotoType } | null> {
  // `unknown` + Blob: os tipos do Workers e do Node declaram FormData de jeitos diferentes.
  const value: unknown = form.get(field);
  if (!(value instanceof Blob)) return null;
  if (value.size > maxBytes) {
    throw new ApiError(413, "photo_too_large", `A imagem passou do limite de ${megabytes(maxBytes)}.`, { field });
  }
  const bytes = await value.arrayBuffer();
  const type = detectImageType(new Uint8Array(bytes));
  if (!type) throw new ApiError(415, "unsupported_image", "Envie uma imagem JPG, PNG ou WebP.", { field });
  return { bytes, type };
}

function dimension(value: unknown): number | null {
  const n = typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isInteger(n) && n > 0 && n <= 10_000 ? n : null;
}

/**
 * Fotos dos locais: o admin envia (já reduzidas no navegador) e qualquer pessoa vê,
 * como o próprio mapa. Os arquivos não mudam depois de enviados, então o cache é longo.
 */
export const photoRoutes = new Hono<AppEnv>()
  .post("/", requireRole("admin"), async (c) => {
    let form: FormData;
    try {
      form = await c.req.formData();
    } catch {
      throw new ApiError(400, "invalid_form", "Envie a foto como formulário (multipart).");
    }
    const placeId = form.get("placeId");
    if (typeof placeId !== "string" || !placeId) throw new ApiError(400, "validation", "Informe o local.", { field: "placeId" });
    if (!(await c.env.DB.prepare("SELECT id FROM places WHERE id = ?").bind(placeId).first())) throw notFound("Local");

    const count = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM place_photos WHERE place_id = ?").bind(placeId).first<{ n: number }>();
    if ((count?.n ?? 0) >= PLACE_PHOTO_LIMITS.perPlace) {
      throw new ApiError(409, "too_many_photos", `Cada local pode ter até ${PLACE_PHOTO_LIMITS.perPlace} fotos. Apague uma para enviar outra.`);
    }

    const full = await readImage(form, "photo", PLACE_PHOTO_LIMITS.maxBytes);
    if (!full) throw new ApiError(400, "validation", "Escolha uma foto para enviar.", { field: "photo" });
    const thumb = (await readImage(form, "thumb", PLACE_PHOTO_LIMITS.maxThumbBytes)) ?? full;
    const rawCaption = form.get("caption");
    const caption = typeof rawCaption === "string" && rawCaption.trim() ? rawCaption.trim().slice(0, PLACE_PHOTO_LIMITS.maxCaption) : null;

    const row: PhotoRow = { id: crypto.randomUUID(), place_id: placeId, caption, width: dimension(form.get("width")), height: dimension(form.get("height")) };
    await Promise.all([
      c.env.PHOTOS.put(objectKey(row.id, "full"), full.bytes, { metadata: { type: full.type } }),
      c.env.PHOTOS.put(objectKey(row.id, "thumb"), thumb.bytes, { metadata: { type: thumb.type } }),
    ]);
    await c.env.DB.prepare(
      "INSERT INTO place_photos (id, place_id, caption, width, height, size_bytes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(row.id, placeId, caption, row.width, row.height, full.bytes.byteLength, Date.now())
      .run();
    return c.json({ photo: photoJson(row) }, 201);
  })

  .delete("/:id", requireRole("admin"), async (c) => {
    const id = c.req.param("id");
    const r = await c.env.DB.prepare("DELETE FROM place_photos WHERE id = ?").bind(id).run();
    if (!r.meta.changes) throw notFound("Foto");
    await deleteObjects(c.env, [id]);
    return c.json({ ok: true });
  })

  .get("/:id/:size", async (c) => {
    const size = c.req.param("size");
    if (size !== "full" && size !== "thumb") throw notFound("Foto");
    const { value, metadata } = await c.env.PHOTOS.getWithMetadata<{ type: PhotoType }>(objectKey(c.req.param("id"), size), {
      type: "arrayBuffer",
      cacheTtl: 86_400,
    });
    if (!value) throw notFound("Foto");
    return new Response(value, {
      headers: {
        "Content-Type": metadata?.type ?? "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
