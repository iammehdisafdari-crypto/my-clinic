import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getEnv } from "./db";

export const COOKIE = "auth_token";

export type SessionUser = { uid: number; role: string; name: string };

function secretKey() {
  const s = getEnv().JWT_SECRET;
  if (!s || s.length < 32) throw new Error("JWT_SECRET تنظیم نشده یا کوتاه است (حداقل ۳۲ کاراکتر)");
  return new TextEncoder().encode(s);
}

export async function createSession(user: { id: number; role: string; full_name: string }) {
  const token = await new SignJWT({ uid: user.id, role: user.role, name: user.full_name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secretKey());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const uid = Number(payload.uid);
    // وضعیت و نقش را از دیتابیس می‌گیریم تا غیرفعال‌سازی فوری اعمال شود
    const row = await getEnv()
      .DB.prepare("SELECT role, full_name, active FROM users WHERE id = ?")
      .bind(uid)
      .first();
    if (!row || !row.active) return null;
    return { uid, role: String(row.role), name: String(row.full_name || "") };
  } catch {
    return null;
  }
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}
