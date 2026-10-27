import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ZodType } from "zod";

/** Erro esperado da API: vira `{ error: { code, message } }` com o status informado. */
export class ApiError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: string,
    message: string,
    readonly extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export const notFound = (what = "Recurso") => new ApiError(404, "not_found", `${what} não encontrado.`);
export const forbidden = () => new ApiError(403, "forbidden", "Você não tem permissão para isso.");

export async function parseBody<T>(c: Context, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw new ApiError(400, "invalid_json", "Corpo da requisição inválido.");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue?.path.join(".");
    throw new ApiError(400, "validation", issue?.message ?? "Dados inválidos.", field ? { field } : {});
  }
  return result.data;
}

export function parseJsonList(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}
