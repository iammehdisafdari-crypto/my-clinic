import { getDB } from "@/lib/db";
import { verifyPassword } from "@/lib/crypto";
import { createSession } from "@/lib/session";
import { HOME_BY_ROLE } from "@/lib/permissions";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    
    // استخراج نام کاربری یا ایمیل با تمامی نام‌های رایج فیلدها
    const rawUsername = body.username || body.email || body.identifier || body.user;
    const rawPassword = body.password || body.pass;

    const username = typeof rawUsername === "string" ? rawUsername.trim() : "";
    const password = typeof rawPassword === "string" ? rawPassword : "";

    if (!username || !password) {
      return Response.json({ success: false, error: "نام کاربری و رمز را وارد کنید" }, { status: 400 });
    }

    const db = getDB();
    const user = await db
      .prepare("SELECT * FROM users WHERE (username = ?1 COLLATE NOCASE OR email = ?1 COLLATE NOCASE) AND active = 1")
      .bind(username)
      .first();

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return Response.json({ success: false, error: "نام کاربری یا رمز عبور اشتباه است" }, { status: 401 });
    }

    const role = String(user.role || "").trim().toLowerCase();
    const home = HOME_BY_ROLE[role];
    if (!home) {
      return Response.json({ success: false, error: "نقش این حساب کاربری در سامانه تعریف نشده است. با مدیر سامانه تماس بگیرید." }, { status: 403 });
    }

    await createSession({ ...user, role });
    return Response.json({ success: true, role, home });
  } catch (err: any) {
    console.error("LOGIN_ERROR:", err);
    return Response.json({ success: false, error: "خطا در برقراری ارتباط", details: err?.message || String(err) }, { status: 500 });
  }
}