import { getRequestContext } from "@cloudflare/next-on-pages";
export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json(); // اینجا username ورودیِ فیلد اول است (ایمیل)
    const { env } = getRequestContext();
    const db = env.DB;

    // جستجوی کاربر در کل جدول بر اساس ایمیل یا نام کاربری
    const user = await db.prepare("SELECT * FROM users WHERE email = ? OR username = ?")
      .bind(username, username).first();

    if (!user) {
      return new Response(JSON.stringify({ success: false, error: "حساب کاربری با این مشخصات یافت نشد" }), { status: 401 });
    }

    // چک کردن پسورد
    if (user.password !== password) {
      return new Response(JSON.stringify({ success: false, error: "رمز عبور اشتباه است" }), { status: 401 });
    }

    // ورود موفقیت‌آمیز
    return new Response(JSON.stringify({ 
      success: true, 
      role: user.role, 
      username: user.username,
      email: user.email 
    }));
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: "خطا در برقراری ارتباط" }), { status: 500 });
  }
}
