import { getDB } from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "edge";

// دریافت اعلان‌های کاربر جاری
export async function GET() {
  const user = await getSession();
  if (!user) return Response.json({ error: "ابتدا وارد شوید" }, { status: 401 });

  const db = getDB();
  const { results } = await db
    .prepare("SELECT id, title, message, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 20")
    .bind(user.uid)
    .all();

  return Response.json(results);
}

// علامت‌گذاری اعلان‌ها به عنوان خوانده شده
export async function PATCH(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ error: "ابتدا وارد شوید" }, { status: 401 });

  const db = getDB();
  await db
    .prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?")
    .bind(user.uid)
    .run();

  return Response.json({ ok: true });
}