import { Hono } from "hono";
import { loadSession } from "./lib/auth";
import { resolveDevice } from "./lib/device";
import { ApiError } from "./lib/http";
import { adminRoutes, courseRoutes } from "./routes/admin";
import { authRoutes } from "./routes/auth";
import { bannerRoutes } from "./routes/banners";
import { announcementRoutes, groupRoutes, placeRoutes, reportRoutes, resourceRoutes } from "./routes/campus";
import { checkinRoutes } from "./routes/checkin";
import { coordinatorRoutes } from "./routes/coordinator";
import { eventRoutes, meRoutes } from "./routes/events";
import { socialEventRoutes } from "./routes/social";
import type { AppEnv } from "./types";

export function createApp() {
  const api = new Hono<AppEnv>()
    .use(resolveDevice)
    .use(loadSession)
    .get("/health", (c) => c.json({ ok: true }))
    .route("/auth", authRoutes)
    .route("/courses", courseRoutes)
    .route("/events", eventRoutes)
    .route("/me", meRoutes)
    .route("/places", placeRoutes)
    .route("/groups", groupRoutes)
    .route("/announcements", announcementRoutes)
    .route("/resources", resourceRoutes)
    .route("/accessibility-reports", reportRoutes)
    .route("/social-events", socialEventRoutes)
    .route("/banners", bannerRoutes)
    .route("/coord", coordinatorRoutes)
    .route("/admin", adminRoutes)
    .route("/", checkinRoutes);

  const app = new Hono<AppEnv>();
  app.route("/api", api);

  app.onError((err, c) => {
    if (err instanceof ApiError) {
      return c.json({ error: { code: err.code, message: err.message, ...err.extra } }, err.status);
    }
    console.error(err);
    return c.json({ error: { code: "internal", message: "Erro inesperado. Tente novamente." } }, 500);
  });
  app.notFound((c) => c.json({ error: { code: "not_found", message: "Rota não encontrada." } }, 404));

  return app;
}
