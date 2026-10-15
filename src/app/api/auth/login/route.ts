import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    const { env } = getRequestContext();
    const db = env.DB;

    if (!db) {
      return new Response(JSON.stringify({ success: false, error: "دیتابیس شناسایی نشد" }), { status: 500 });
    }

    const user = await db.prepare("SELECT * FROM users WHERE username = ?").bind(username).first();

    if (!user) {
      return new Response(JSON.stringify({ success: false, error: "کاربر یافت نشد" }), { status: 401 });
    }

    if (user.password !== password) {
      return new Response(JSON.stringify({ success: false, error: "رمز عبور غلط است" }), { status: 401 });
    }

    return new Response(JSON.stringify({ success: true, role: user.role }));
  } catch (error: any) {
    // اینجا خطای واقعی را می‌فرستیم تا بفهمیم مشکل چیست
    return new Response(JSON.stringify({ success: false, error: "خطای فنی: " + error.message }), { status: 500 });
  }
}