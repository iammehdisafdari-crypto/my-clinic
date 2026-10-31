import { env as workerEnv } from "cloudflare:workers";

export type Env = {
  DB: any;
  JWT_SECRET: string;
  SESSION_SECRET?: string;
  RESEND_API_KEY?: string;
  MANAGER_EMAIL?: string;
  SMS_API_KEY?: string;
  SMS_SENDER?: string;
  CRON_SECRET?: string;
  MEDIA?: any;
};

export function getEnv(): Env {
  const runtimeEnv = workerEnv as unknown as Partial<Env>;
  return {
    ...runtimeEnv,
    DB: runtimeEnv.DB || (process.env as any)?.DB,
    JWT_SECRET: runtimeEnv.JWT_SECRET || process.env.JWT_SECRET || "",
    SESSION_SECRET: runtimeEnv.SESSION_SECRET || process.env.SESSION_SECRET || "",
  } as Env;
}

export function getDB() {
  const env = getEnv();
  return env?.DB || (globalThis as any)?.DB;
}