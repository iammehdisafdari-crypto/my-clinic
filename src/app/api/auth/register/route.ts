import { getRequestContext } from "@cloudflare/next-on-pages";
export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const { email, password, username } = await request.json();
    const { env } = getRequestContext();
    const db = env.DB;

    // ۱. بررسی تکراری بودن ایمیل (شرط اصلی)
    const existingEmail = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    if (existingEmail) {
      return new Response(JSON.stringify({ success: false, error: "این ایمیل قبلاً ثبت‌نام شده است" }), { status: 400 });
    }

    // ۲. تعیین یوزرنیم (اگر کاربر وارد نکرد، از بخش قبل از @ ایمیل استفاده کن)
    const finalUsername = username || email.split('@')[0] + Math.floor(Math.random() * 1000);

    // ۳. ذخیره در دیتابیس
    await db.prepare("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, 'visitor')")
      .bind(finalUsername, email, password).run();

    return new Response(JSON.stringify({ success: true }));
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: "خطا در سیستم ثبت‌نام" }), { status: 500 });
  }
}
