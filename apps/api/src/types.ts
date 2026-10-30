export type Role = "student" | "coordinator" | "admin" | "organizer";

export interface SessionUser {
  id: string;
  role: Role;
  ra: string;
  name: string;
  courseId: string | null;
  courseName: string | null;
}

export interface Bindings {
  DB: D1Database;
  /** Arquivos das fotos dos locais (o R2 não está ativado na conta; o KV atende bem a este volume). */
  PHOTOS: KVNamespace;
  /** Iterações do PBKDF2 para senhas novas (padrão no core). */
  PBKDF2_ITERATIONS?: string;
}

export interface AppEnv {
  Bindings: Bindings;
  Variables: {
    user: SessionUser | null;
    deviceToken: string;
  };
}
