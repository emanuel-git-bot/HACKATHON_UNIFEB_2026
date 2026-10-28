import { Hono } from "hono";
import { parseUnifebBanners, type SiteBanner } from "@syncfeb/core";
import { requireRole } from "../lib/auth";
import { ApiError } from "../lib/http";
import type { AppEnv } from "../types";

const SITE_URL = "https://www.unifeb.edu.br/";
const SYNCED_KEY = "banners_synced_at";
/** Depois desse tempo a próxima leitura busca o site de novo, em segundo plano. */
const REFRESH_AFTER_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8_000;

/** Baixa a página inicial do UNIFEB e troca os banners salvos. Se o site falhar, mantém os antigos. */
export async function syncSiteBanners(db: D1Database, fetcher: typeof fetch = fetch): Promise<SiteBanner[]> {
  const res = await fetcher(SITE_URL, {
    headers: { "User-Agent": "CampusFEB/1.0 (+https://campusfeb.roqueemanuel2018.workers.dev)" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`site respondeu ${res.status}`);
  const banners = parseUnifebBanners(await res.text());
  if (banners.length === 0) throw new Error("nenhum banner encontrado no site");
  await db.batch([
    db.prepare("DELETE FROM site_banners"),
    ...banners.map((b, i) =>
      db.prepare("INSERT INTO site_banners (position, image_url, link_url) VALUES (?, ?, ?)").bind(i, b.imageUrl, b.linkUrl),
    ),
    db
      .prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .bind(SYNCED_KEY, String(Date.now())),
  ]);
  return banners;
}

export const bannerRoutes = new Hono<AppEnv>()
  .get("/", async (c) => {
    const db = c.env.DB;
    const [rows, synced] = await Promise.all([
      db.prepare("SELECT image_url, link_url FROM site_banners ORDER BY position").all<{ image_url: string; link_url: string | null }>(),
      db.prepare("SELECT value FROM settings WHERE key = ?").bind(SYNCED_KEY).first<{ value: string }>(),
    ]);
    const syncedAt = synced ? Number(synced.value) : null;
    if (syncedAt === null || Date.now() - syncedAt > REFRESH_AFTER_MS) {
      try {
        // Só existe no Worker; nos testes não há contexto de execução e a atualização é pulada.
        c.executionCtx.waitUntil(syncSiteBanners(db).catch((err) => console.error("banners:", err)));
      } catch {
        /* sem executionCtx */
      }
    }
    return c.json({
      syncedAt,
      banners: rows.results.map((r) => ({ imageUrl: r.image_url, linkUrl: r.link_url })),
    });
  })

  .post("/sync", requireRole("admin"), async (c) => {
    try {
      const banners = await syncSiteBanners(c.env.DB);
      return c.json({ count: banners.length });
    } catch (err) {
      throw new ApiError(502, "site_unavailable", `Não foi possível ler o site do UNIFEB (${(err as Error).message}).`);
    }
  });
