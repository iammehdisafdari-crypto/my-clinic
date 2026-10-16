import { getRequestContext } from "@cloudflare/next-on-pages";
export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const { email, password, username } = await request.json();
    const { env } = getRequestContext();
    const db = env.DB;

    // ۱. بررسی دقیق تکراری بودن یوزرنیم
    const checkUser = await db.prepare("SELECT id FROM users WHERE username = ?").bind(username).first();
    if (checkUser) {
      return new Response(JSON.stringify({ success: false, error: "این نام کاربری قبلاً انتخاب شده است" }), { status: 400 });
    }

    // ۲. بررسی دقیق تکراری بودن ایمیل
    const checkEmail = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    if (checkEmail) {
      return new Response(JSON.stringify({ success: false, error: "این ایمیل قبلاً ثبت شده است" }), { status: 400 });
    }

    // ۳. اگر هیچکدام تکراری نبود، ثبت‌نام انجام شود
    await db.prepare("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, 'visitor')")
      .bind(username || null, email, password).run();

    return new Response(JSON.stringify({ success: true }));
  } catch (error: any) {
    console.error("Register Error:", error);
    return new Response(JSON.stringify({ success: false, error: "خطا در دیتابیس: " + error.message }), { status: 500 });
  }
}
