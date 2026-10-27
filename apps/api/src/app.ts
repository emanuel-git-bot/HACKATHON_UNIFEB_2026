import { Hono } from "hono";
import { loadSession } from "./lib/auth";
import { resolveDevice } from "./lib/device";
import { ApiError } from "./lib/http";
import { adminRoutes, courseRoutes } from "./routes/admin";
import { authRoutes } from "./routes/auth";
import { certificateRoutes, verifyRoutes } from "./routes/certificates";
import { checkinRoutes } from "./routes/checkin";
import { coordinatorRoutes } from "./routes/coordinator";
import { eventRoutes, meRoutes } from "./routes/events";
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
    .route("/certificates", certificateRoutes)
    .route("/verify", verifyRoutes)
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
