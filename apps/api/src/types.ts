export type Role = "student" | "coordinator" | "admin";

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
