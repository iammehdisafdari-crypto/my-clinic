import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getDB, getEnv } from "./db";

export const COOKIE = "auth_token";
export type SessionUser = {
  uid: number;
  id: number;
  role: string;
  name: string;
  username?: string;
};

function secretKey(): Uint8Array {
  const env = getEnv();
  const secret = env?.JWT_SECRET || process.env.JWT_SECRET || "";

  if (secret.length < 32 || secret === "NOT_SET") {
    throw new Error("JWT_SECRET must be configured with at least 32 characters.");
  }

  return new TextEncoder().encode(secret);
}

export async function createSession(user: {
  id: number;
  role: string;
  full_name?: string;
  display_name?: string;
  username?: string;
}) {
  const key = secretKey();
  const rawName = user.full_name || user.display_name || user.username || "مدیر";

  const token = await new SignJWT({
    uid: user.id,
    role: user.role,
    name: rawName,
    username: user.username,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(key);

  const cookieStore = cookies();
  cookieStore.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return token;
}

export async function getSession(): Promise<SessionUser | null> {
  if (process.env.NODE_ENV === "test" && (globalThis as any).__TEST_SESSION__ !== undefined) {
    return (globalThis as any).__TEST_SESSION__;
  }

  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, secretKey());
    const uid = Number(payload.uid);
    if (!Number.isSafeInteger(uid) || uid <= 0) return null;

    const db = getDB();
    if (!db) return null;

    const row = (await db
      .prepare(
        "SELECT role, COALESCE(NULLIF(full_name, ''), username) as name, username, active FROM users WHERE id = ?1"
      )
      .bind(uid)
      .first()) as {
        role: string;
        name: string;
        username: string;
        active: number;
      } | null;

    if (!row || Number(row.active) !== 1) return null;

    const role = String(row.role || "").trim().toLowerCase();
    if (!role) return null;

    const fetchedName = String(row.name || "");
    const username = String(row.username || "");

    return {
      uid,
      id: uid,
      role,
      name: fetchedName.includes("\u0000") || !fetchedName ? "مدیر سیستم" : fetchedName,
      username,
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
