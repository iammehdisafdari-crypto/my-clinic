import { getRequestContext } from "@cloudflare/next-on-pages";

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
  try {
    const ctx = getRequestContext();
    if (ctx && ctx.env) {
      return ctx.env as unknown as Env;
    }
  } catch {}

  return {
    DB: (globalThis as any)?.__D1_BETA__ || (globalThis as any)?.DB || (process.env as any)?.DB,
    JWT_SECRET: process.env.JWT_SECRET || "",
    SESSION_SECRET: process.env.SESSION_SECRET || "",
  } as Env;
}

export function getDB() {
  const env = getEnv();
  return env?.DB || (globalThis as any)?.DB;
}