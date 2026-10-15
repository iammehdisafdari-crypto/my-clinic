// src/lib/auth.ts
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET_KEY = new TextEncoder().encode("your-secret-key-123456789"); // این کلید باید خیلی محرمانه باشد

export async function loginAction(formData: FormData, db: any) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  // ۱. جستجو در دیتابیس D1 کلودفلر
  const user = await db
    .prepare("SELECT * FROM users WHERE username = ?")
    .bind(username)
    .first();

  // ۲. بررسی صحت یوزر و پسورد (فعلاً ساده، بعداً هش شده)
  if (!user || user.password !== password) {
    return { error: "نام کاربری یا رمز عبور اشتباه است" };
  }

  // ۳. ساخت توکن امنیتی JWT
  const token = await new SignJWT({ id: user.id, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h") // توکن بعد از ۲ ساعت باطل می‌شود
    .sign(SECRET_KEY);

  // ۴. ذخیره در کوکی امن (HttpOnly)
  const cookieStore = await cookies();
  cookieStore.set("auth_token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 7200,
  });

  return { success: true, role: user.role };
}