import { getDB } from "@/lib/db";
import { guard } from "@/lib/permissions";
import { hashPassword } from "@/lib/crypto";
import { canManageRole, ROLE_HIERARCHY } from "@/lib/roles";

export const runtime = "edge";

export async function GET() {
  const { user, error } = await guard("users:manage");
  if (error) return error;
  const { results } = await getDB()
    .prepare("SELECT id, username, COALESCE(NULLIF(full_name, ''), username) AS display_name, role, 1 AS is_active FROM users ORDER BY id")
    .all();
  return Response.json((results || []).filter((row: any) => canManageRole(user.role, String(row.role))));
}

export async function POST(request: Request) {
  const { user, error } = await guard("users:manage");
  if (error) return error;
  const body = (await request.json()) as Record<string, unknown>;
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = typeof body.role === "string" ? body.role : "";
  if (!username || !fullName || password.length < 8 || !Object.prototype.hasOwnProperty.call(ROLE_HIERARCHY, role) || !canManageRole(user.role, role))
    return Response.json({ error: "اطلاعات نامعتبر است یا اجازهٔ اعطای این نقش را ندارید (رمز حداقل ۸ کاراکتر)" }, { status: 400 });
  try {
    const db = getDB();
    await db
      .prepare("INSERT INTO users (username, password_hash, full_name, role, active) VALUES (?1, ?2, ?3, ?4, 1)")
      .bind(username, await hashPassword(password), fullName, role)
      .run();
    const created = await db
      .prepare("SELECT id, username, COALESCE(NULLIF(full_name, ''), username) AS display_name, role, 1 AS is_active FROM users WHERE username = ?1")
      .bind(username)
      .first();
    return Response.json({ ok: true, user: created }, { status: 201 });
  } catch {
    return Response.json({ error: "این نام کاربری قبلاً ثبت شده است" }, { status: 409 });
  }
}

