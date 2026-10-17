import { getRequestContext } from "@cloudflare/next-on-pages";

// نوع ساده برای bindingها (DB = دیتابیس D1)
export type Env = {
  DB: any;
  JWT_SECRET: string;
  RESEND_API_KEY?: string;
  MANAGER_EMAIL?: string;
  SMS_API_KEY?: string;
  SMS_SENDER?: string;
  CRON_SECRET?: string;
  MEDIA?: any; // R2 (مرحله ۴)
};

export function getEnv(): Env {
  return getRequestContext().env as unknown as Env;
}
export function getDB() {
  return getEnv().DB;
}
