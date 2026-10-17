import { getDB } from "@/lib/db";
import { guard } from "@/lib/permissions";
import { hashPassword } from "@/lib/password";

export const runtime = "edge";

const ROLES = ["scheduler", "visitor", "uploader", "nurse"];
// لیست کارمندان: فقط مدیر و دکتر
export async function GET() {
  const { error } = await guard("users:manage");
  if (error) return error;
  const { results } = await getDB()
    .prepare("SELECT id, username, email, full_name, role, active FROM users WHERE role NOT IN ('manager','doctor') ORDER BY id")
    .all();
  return Response.json(results);
}

// ساخت کارمند جدید: فقط مدیر و دکتر (ثبت‌نام آزاد وجود ندارد)
export async function POST(request: Request) {
  const { error } = await guard("users:manage");
  if (error) return error;
  const b = (await request.json()) as Record<string, string>;
  if (!b.username || !b.full_name || !b.password || b.password.length < 8 || !ROLES.includes(b.role))
    return Response.json({ error: "اطلاعات نامعتبر (رمز حداقل ۸ کاراکتر)" }, { status: 400 });
  try {
    await getDB()
      .prepare("INSERT INTO users (username, email, password_hash, full_name, role) VALUES (?,?,?,?,?)")
      .bind(b.username.trim(), b.email?.trim() || null, await hashPassword(b.password), b.full_name.trim(), b.role)
      .run();
  } catch {
    return Response.json({ error: "این نام کاربری یا ایمیل قبلاً ثبت شده" }, { status: 409 });
  }
  return Response.json({ ok: true });
}
