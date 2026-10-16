import { getRequestContext } from "@cloudflare/next-on-pages";
export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const { email, password, username } = await request.json();
    const { env } = getRequestContext();
    const db = env.DB;

    // ثبت یوزر جدید با ایمیل و یوزرنیم (نقش پیش‌فرض: ویزیتور)
    await db.prepare("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, 'visitor')")
      .bind(username, email, password).run();

    return new Response(JSON.stringify({ success: true }));
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: "این ایمیل یا نام کاربری قبلاً استفاده شده است" }), { status: 400 });
  }
}
