import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api } from "./api";

/** Busca `path` ao montar e, opcionalmente, a cada `pollMs`. */
export function useApi<T>(path: string | null, pollMs?: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const pathRef = useRef(path);
  pathRef.current = path;

  const reload = useCallback(async () => {
    const current = pathRef.current;
    if (current === null) return;
    try {
      const result = await api<T>(current);
      if (pathRef.current === current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (pathRef.current === current) setError(err as ApiError);
    } finally {
      if (pathRef.current === current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(path !== null);
    void reload();
    if (!pollMs || path === null) return;
    const id = window.setInterval(() => void reload(), pollMs);
    return () => window.clearInterval(id);
  }, [path, pollMs, reload]);

  return { data, error, loading, reload, setData };
}
