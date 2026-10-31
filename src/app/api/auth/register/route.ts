import { getDB } from "@/lib/db";
import { verifyOrigin } from "@/lib/security";

export const runtime = "edge";

export async function POST(request: Request) {
  const originCheck = verifyOrigin(request);
  if (!originCheck.ok && originCheck.errorResponse) {
    return originCheck.errorResponse;
  }

  try {
    const { email, password, username } = await request.json();
    const db = getDB();

    // ۱. بررسی اینکه آیا این ایمیل قبلاً ثبت شده یا نه
    const existingUser = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();

    if (existingUser) {
      return Response.json({ success: false, error: "این ایمیل قبلاً ثبت‌نام کرده است" }, { status: 400 });
    }

    // ۲. ساخت یک نام کاربری خودکار (اگر کاربر وارد نکرده بود)
    const finalUsername = username || (typeof email === "string" ? email.split("@")[0] : "");

    // ۳. ثبت کاربر جدید در دیتابیس
    await db.prepare("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, 'visitor')")
      .bind(finalUsername, email, password).run();

    return Response.json({ success: true, message: "حساب کاربری شما ساخته شد" });
  } catch (error: unknown) {
    console.error("REGISTER_ERROR:", error instanceof Error ? error.name : "UnknownError");
    return Response.json(
      { success: false, error: "خطا در فرآیند ثبت‌نام رخ داد" },
      { status: 500 }
    );
  }
}
