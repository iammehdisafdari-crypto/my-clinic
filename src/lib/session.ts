import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getDB, getEnv } from "./db";

export const COOKIE = "auth_token";
export type SessionUser = { uid: number; id: number; role: string; name: string; username?: string };
const FALLBACK_SECRET = "clinic_super_secret_jwt_key_2026_production_secure_random_9981";

function secretKey(): Uint8Array {
  try {
    const env = getEnv();
    const s = env?.JWT_SECRET || process.env.JWT_SECRET || FALLBACK_SECRET;
    if (s && s.length >= 32) return new TextEncoder().encode(s);
  } catch {}
  return new TextEncoder().encode(FALLBACK_SECRET);
}

export async function createSession(user: { id: number; role: string; full_name?: string; display_name?: string; username?: string }) {
  const rawName = user.full_name || user.display_name || user.username || "مدیر";
  const token = await new SignJWT({ uid: user.id, role: user.role, name: rawName, username: user.username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secretKey());

  const cookieStore = cookies();
  cookieStore.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
    secure: true,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, secretKey());
    const uid = Number(payload.uid);
    if (!uid) return null;

    let cleanName = typeof payload.name === "string" ? payload.name : "مدیر";
    // اگر نام در توکن آسیب دیده بود
    if (cleanName.includes("\u0000")) {
      cleanName = "مدیر سیستم";
    }

    try {
      const db = getDB();
      if (db) {
        const row = (await db
          .prepare("SELECT role, COALESCE(NULLIF(full_name, ''), username) as name, username, active FROM users WHERE id = ?1")
          .bind(uid)
          .first()) as { role: string; name: string; username: string; active: number } | null;
        if (row && row.active !== 0) {
          const fetchedName = String(row.name || "");
          return {
            uid,
            id: uid,
            role: String(row.role),
            name: fetchedName.includes("\u0000") || !fetchedName ? "مدیر سیستم" : fetchedName,
            username: String(row.username || ""),
          };
        }
      }
    } catch {}

    return {
      uid,
      id: uid,
      role: String(payload.role || "admin"),
      name: cleanName,
      username: typeof payload.username === "string" ? payload.username : undefined,
    };
  } catch {
    return null;
  }
}

export async function destroySession() {
  try {
    const cookieStore = cookies();
    cookieStore.delete(COOKIE);
  } catch {}
}

