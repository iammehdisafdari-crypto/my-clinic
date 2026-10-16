import { getRequestContext } from "@cloudflare/next-on-pages";
export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json(); // ورودی فیلد اول
    const { env } = getRequestContext();
    const db = env.DB;

    // جستجو: هم در ستون ایمیل و هم در ستون یوزرنیم چک می‌کند
    const user = await db.prepare("SELECT * FROM users WHERE email = ? OR username = ?")
      .bind(username, username).first();

    if (!user || user.password !== password) {
      return new Response(JSON.stringify({ success: false, error: "ایمیل یا رمز عبور اشتباه است" }), { status: 401 });
    }

    return new Response(JSON.stringify({ success: true, role: user.role, username: user.username }));
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: "خطا در برقراری ارتباط با دیتابیس" }), { status: 500 });
  }
}
