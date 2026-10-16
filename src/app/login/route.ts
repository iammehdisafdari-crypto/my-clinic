import { getRequestContext } from "@cloudflare/next-on-pages";
export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    const { env } = getRequestContext();
    const db = env.DB;
    const user = await db.prepare("SELECT * FROM users WHERE username = ? OR email = ?")
      .bind(username, username).first();

    if (!user || user.password !== password) {
      return new Response(JSON.stringify({ success: false, error: "اطلاعات ورود اشتباه است" }), { status: 401 });
    }
    return new Response(JSON.stringify({ success: true, role: user.role }));
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: "خطای سرور" }), { status: 500 });
  }
}
