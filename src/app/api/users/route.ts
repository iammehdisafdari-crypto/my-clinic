import { getDB } from "@/lib/db";
import { guard } from "@/lib/permissions";
import { hashPassword } from "@/lib/crypto";
import { canManageRole, isDbRole, ROLE_HIERARCHY } from "@/lib/roles";

export const runtime = "edge";

export async function GET() {
  const { user, error } = await guard("users:manage");
  if (error) return error;

  if (!user || !["admin", "manager"].includes(user.role)) {
    return Response.json({ error: "ط¯ط³طھط±ط³غŒ ظ†ط¯ط§ط±غŒط¯" }, { status: 403 });
  }

  try {
    const { results } = await getDB()
      .prepare(
        "SELECT id, username, COALESCE(NULLIF(full_name, ''), username) AS display_name, role, 1 AS is_active FROM users ORDER BY id"
      )
      .all();
    return Response.json(
      (results || []).filter((row: any) => canManageRole(user.role, String(row.role)))
    );
  } catch (err: unknown) {
    console.error("USERS_GET_ERROR:", err);
    return Response.json({ error: "ط®ط·ط§ ط¯ط± ط¯ط±غŒط§ظپطھ ظپظ‡ط±ط³طھ ع©ط§ط±ط¨ط±ط§ظ†" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { user, error } = await guard("users:manage", request);
  if (error) return error;

  if (!user || !["admin", "manager"].includes(user.role)) {
    return Response.json({ error: "ط¯ط³طھط±ط³غŒ ظ†ط¯ط§ط±غŒط¯" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "ظپط±ظ…طھ ط¯ط±ط®ظˆط§ط³طھ ظ†ط§ظ…ط¹طھط¨ط± ط§ط³طھ" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "ط¯ط§ط¯ظ‡â€Œظ‡ط§غŒ ظˆط±ظˆط¯غŒ ظ†ط§ظ…ط¹طھط¨ط± ط§ط³طھ" }, { status: 400 });
  }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const rawDisplayName = body.display_name ?? body.full_name;
  const fullName = typeof rawDisplayName === "string" ? rawDisplayName.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = typeof body.role === "string" ? body.role : "";

  // ط§ط¹طھط¨ط§ط±ط³ظ†ط¬غŒ ظˆط±ظˆط¯غŒâ€Œظ‡ط§غŒ ط§غŒط¬ط§ط¯ ع©ط§ط±ط¨ط±
  if (
    !username ||
    !fullName ||
    password.length < 8 ||
    !Object.prototype.hasOwnProperty.call(ROLE_HIERARCHY, role) ||
    !isDbRole(role)
  ) {
    return Response.json(
      { error: "ط§ط·ظ„ط§ط¹ط§طھ ظ†ط§ظ…ط¹طھط¨ط± ط§ط³طھ (ط±ظ…ط² ط¹ط¨ظˆط± ط¨ط§غŒط¯ ط­ط¯ط§ظ‚ظ„ غ¸ ع©ط§ط±ط§ع©طھط± ظˆ ظ†ظ‚ط´ ط¯ط± ط³غŒط³طھظ… ظ…ط¬ط§ط² ط¨ط§ط´ط¯)" },
      { status: 400 }
    );
  }

  // ط¨ط±ط±ط³غŒ ط³ظ„ط³ظ„ظ‡â€Œظ…ط±ط§طھط¨ ط¯ط³طھط±ط³غŒ (ط¹ط¯ظ… ط§ظ…ع©ط§ظ† ط§ط¹ط·ط§غŒ ظ†ظ‚ط´ ظ‡ظ…â€Œط³ط·ط­ غŒط§ ط¨ط§ظ„ط§طھط±)
  if (!canManageRole(user.role, role)) {
    return Response.json(
      { error: "ظ†ظ…غŒâ€Œطھظˆط§ظ†غŒط¯ ظ†ظ‚ط´غŒ ظ‡ظ…â€Œط³ط·ط­ غŒط§ ط¨ط§ظ„ط§طھط± ط§ط² ط®ظˆط¯طھط§ظ† ط§ط¹ط·ط§ ع©ظ†غŒط¯" },
      { status: 403 }
    );
  }

  try {
    const db = getDB();
    await db
      .prepare(
        "INSERT INTO users (username, password_hash, full_name, role, active) VALUES (?1, ?2, ?3, ?4, 1)"
      )
      .bind(username, await hashPassword(password), fullName, role)
      .run();

    const created = await db
      .prepare(
        "SELECT id, username, COALESCE(NULLIF(full_name, ''), username) AS display_name, role, 1 AS is_active FROM users WHERE username = ?1"
      )
      .bind(username)
      .first();

    return Response.json({ ok: true, user: created }, { status: 201 });
  } catch (err: unknown) {
    console.error("USER_CREATE_ERROR:", err);
    return Response.json({ error: "ط§غŒظ† ظ†ط§ظ… ع©ط§ط±ط¨ط±غŒ ظ‚ط¨ظ„ط§ظ‹ ط«ط¨طھ ط´ط¯ظ‡ ط§ط³طھ غŒط§ ط®ط·ط§ ط¯ط± ط§غŒط¬ط§ط¯ ط±ط® ط¯ط§ط¯" }, { status: 409 });
  }
}

