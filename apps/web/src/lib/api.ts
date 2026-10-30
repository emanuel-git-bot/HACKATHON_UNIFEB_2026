const DEVICE_KEY = "sfb_device";

function randomId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // Fora de HTTPS o randomUUID não existe (ex.: teste pela rede local).
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Token do aparelho, guardado também no localStorage (o servidor guarda em cookie). */
function deviceToken(): string | null {
  try {
    let token = localStorage.getItem(DEVICE_KEY);
    if (!token) {
      token = randomId();
      localStorage.setItem(DEVICE_KEY, token);
    }
    return token;
  } catch {
    return null;
  }
}

function rememberDevice(token: string | null) {
  if (!token) return;
  try {
    localStorage.setItem(DEVICE_KEY, token);
  } catch {
    /* navegador sem storage: o cookie basta */
  }
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly data: Record<string, any> = {},
  ) {
    super(message);
  }
}

/** `body` em FormData vai como multipart (fotos); qualquer outro valor vai como JSON. */
export async function api<T = any>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const device = deviceToken();
  if (device) headers["X-Device-Token"] = device;
  const isForm = options.body instanceof FormData;
  if (options.body !== undefined && !isForm) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
      headers,
      body: options.body === undefined ? undefined : isForm ? (options.body as FormData) : JSON.stringify(options.body),
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(0, "network", "Sem conexão. Verifique a internet e tente de novo.");
  }
  rememberDevice(res.headers.get("X-Device-Token"));

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data?.error ?? {};
    throw new ApiError(res.status, err.code ?? "error", err.message ?? "Algo deu errado. Tente novamente.", err);
  }
  return data as T;
}
