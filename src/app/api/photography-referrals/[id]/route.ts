import { getDB } from "@/lib/db";
import { guard } from "@/lib/permissions";

export const runtime = "edge";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { user, error } = await guard("photos:write");
  if (error) return error;

  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0)
    return Response.json({ error: "ارجاع عکاسی نامعتبر است." }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as { complete?: unknown };
  if (body.complete !== true)
    return Response.json({ error: "درخواست تکمیل ارجاع نامعتبر است." }, { status: 400 });

  const db = getDB();
  try {
    const referral = (await db
      .prepare(
        `SELECT r.id, r.patient_id, r.referred_at, r.status, p.daily_number, p.first_name, p.last_name
         FROM photography_referrals r JOIN patients p ON p.id = r.patient_id WHERE r.id = ?`
      )
      .bind(id)
      .first()) as {
      id: number;
      patient_id: number;
      referred_at: string;
      status: string;
      daily_number: number;
      first_name: string;
      last_name: string;
    } | null;
    if (!referral) return Response.json({ error: "ارجاع عکاسی پیدا نشد." }, { status: 404 });
    if (referral.status === "completed") return Response.json({ ok: true, already_completed: true });

    const photo = await db
      .prepare("SELECT id FROM patient_media WHERE patient_id = ? AND photography_referral_id = ? LIMIT 1")
      .bind(referral.patient_id, id)
      .first();
    if (!photo)
      return Response.json({ error: "برای تکمیل ارجاع، ابتدا دست‌کم یک عکس جدید در پرونده بیمار ثبت کنید." }, { status: 409 });

    const updated = await db
      .prepare(
        `UPDATE photography_referrals
         SET status = 'completed', completed_by = ?, completed_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status = 'pending'`
      )
      .bind(user.uid, id)
      .run();
    if (!updated.meta.changes) return Response.json({ ok: true, already_completed: true });

    try {
      await db
        .prepare(
          `INSERT INTO notifications (user_id, title, message)
           SELECT id, ?, ? FROM users WHERE role = 'scheduler' AND active = 1`
        )
        .bind(
          "عکاسی بیمار تکمیل شد",
          `پرونده ${referral.daily_number} — ${referral.first_name} ${referral.last_name}: عکاسی ارجاع‌شده انجام و عکس جدید در پرونده ثبت شد.`
        )
        .run();
    } catch (notificationError) {
      console.error("PHOTOGRAPHY_COMPLETION_NOTIFICATION_FAILED", notificationError);
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("PHOTOGRAPHY_REFERRAL_COMPLETE_FAILED", error);
    return Response.json({ error: "تکمیل ارجاع عکاسی ثبت نشد. دوباره تلاش کنید." }, { status: 500 });
  }
}
