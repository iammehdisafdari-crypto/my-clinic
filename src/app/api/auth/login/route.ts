import { getDB } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { HOME_BY_ROLE } from "@/lib/permissions";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const { username, password } = (await request.json()) as { username?: string; password?: string };
    if (!username || !password)
      return Response.json({ success: false, error: "نام کاربری و رمز را وارد کنید" }, { status: 400 });

    const db = getDB();
    const user = await db
      .prepare("SELECT * FROM users WHERE (username = ?1 OR email = ?1) AND active = 1")
      .bind(username.trim())
      .first();

    // پیام یکسان برای «کاربر نیست» و «رمز غلط» (کسی نتواند حدس بزند کدام حساب وجود دارد)
    if (!user || !(await verifyPassword(password, user.password_hash)))
      return Response.json({ success: false, error: "نام کاربری یا رمز عبور اشتباه است" }, { status: 401 });

    await createSession(user);
    return Response.json({ success: true, role: user.role, home: HOME_BY_ROLE[user.role] || "/" });
  } catch {
    return Response.json({ success: false, error: "خطا در برقراری ارتباط" }, { status: 500 });
  }
}
