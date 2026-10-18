import { getDB } from "@/lib/db";
export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const { email, password, username } = await request.json();
    const db = getDB();

    // ۱. بررسی اینکه آیا این ایمیل قبلاً ثبت شده یا نه
    const existingUser = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    
    if (existingUser) {
      return new Response(JSON.stringify({ success: false, error: "این ایمیل قبلاً ثبت‌نام کرده است" }), { status: 400 });
    }

    // ۲. ساخت یک نام کاربری خودکار (اگر کاربر وارد نکرده بود)
    const finalUsername = username || email.split('@')[0];

    // ۳. ثبت کاربر جدید در دیتابیس
    // نقش پیش‌فرض را 'visitor' می‌گذاریم (طبق خواسته شما برای نقش شماره ۱)
    await db.prepare("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, 'visitor')")
      .bind(finalUsername, email, password).run();

    return new Response(JSON.stringify({ success: true, message: "حساب کاربری شما ساخته شد" }));
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: "خطا در ثبت‌نام: " + error.message }), { status: 500 });
  }
}

