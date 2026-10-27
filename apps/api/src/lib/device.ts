import type { MiddlewareHandler } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { randomToken } from "@syncfeb/core";
import type { AppEnv } from "../types";
import { isHttps } from "./auth";

const DEVICE_COOKIE = "sfb_device";
const DEVICE_HEADER = "X-Device-Token";
const MAX_COOKIE_AGE_S = 400 * 24 * 60 * 60; // limite dos navegadores
const VALID_TOKEN = /^[A-Za-z0-9-]{16,64}$/;

/**
 * Token persistente do aparelho (trava de aparelho único).
 * O cookie tem prioridade; o front também guarda o valor no localStorage e o envia no cabeçalho,
 * então apagar só um dos dois não gera um aparelho "novo".
 */
export const resolveDevice: MiddlewareHandler<AppEnv> = async (c, next) => {
  const fromCookie = getCookie(c, DEVICE_COOKIE);
  const fromHeader = c.req.header(DEVICE_HEADER);
  const token =
    (fromCookie && VALID_TOKEN.test(fromCookie) && fromCookie) ||
    (fromHeader && VALID_TOKEN.test(fromHeader) && fromHeader) ||
    randomToken(16);

  c.set("deviceToken", token);
  await next();

  if (token !== fromCookie) {
    setCookie(c, DEVICE_COOKIE, token, {
      httpOnly: true,
      secure: isHttps(c),
      sameSite: "Lax",
      path: "/",
      maxAge: MAX_COOKIE_AGE_S,
    });
  }
  c.header(DEVICE_HEADER, token);
};
