import { getDB } from "@/lib/db";
import { guard } from "@/lib/permissions";
import { normText, toEnDigits } from "@/lib/normalize";

export const runtime = "edge";
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const { user, error } = await guard("appointments:write");
  if (error) return error;
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "شناسه نوبت نامعتبر است" }, { status: 400 });

  const db = getDB();
  const current = await db.prepare(
    "SELECT id, created_by, status, attendance_status FROM appointments WHERE id = ?"
  ).bind(id).first() as {
    id: number; created_by: number | null; status: string; attendance_status: string | null;
  } | null;

  if (!current) return Response.json({ error: "نوبت پیدا نشد" }, { status: 404 });
  if (user.role === "visitor" && Number(current.created_by) !== Number(user.uid)) {
    return Response.json({ error: "فقط می‌توانید نوبت‌های ثبت‌شده توسط خودتان را مدیریت کنید." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = normText(body.action);
  const reason = normText(body.reason) || null;
  const updates: string[] = [];
  const values: unknown[] = [];

  if (action === "confirm") {
    if (current.status === "cancelled") return Response.json({ error: "نوبت لغوشده را نمی‌توان تأیید کرد." }, { status: 409 });
    updates.push("status = 'confirmed'");
  } else if (action === "cancel") {
    updates.push("status = 'cancelled'");
  } else if (action === "no_show") {
    updates.push("attendance_status = 'no_show'");
  } else if (action === "attended") {
    updates.push("attendance_status = 'attended'", "status = 'completed'");
  } else if (action === "reschedule") {
    const date = toEnDigits(normText(body.appointment_date));
    const time = toEnDigits(normText(body.appointment_time));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Response.json({ error: "تاریخ جدید نامعتبر است" }, { status: 400 });
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) return Response.json({ error: "ساعت جدید نامعتبر است" }, { status: 400 });
    updates.push("appointment_date = ?", "appointment_time = ?", "status = 'pending'", "attendance_status = 'pending'");
    values.push(date, time);
  } else if (action === "edit") {
    updates.push("description = ?");
    values.push(normText(body.description) || null);
  } else {
    return Response.json({ error: "عملیات نوبت نامعتبر است" }, { status: 400 });
  }

  updates.push("updated_by = ?", "updated_at = CURRENT_TIMESTAMP", "last_change_reason = ?");
  values.push(user.uid, reason, id);

  try {
    await db.prepare("UPDATE appointments SET " + updates.join(", ") + " WHERE id = ?").bind(...values).run();
    return Response.json({ ok: true });
  } catch (cause) {
    console.error("APPOINTMENT_UPDATE_FAILED", cause);
    return Response.json({ error: "این زمان قابل رزرو نیست یا تغییر نوبت انجام نشد." }, { status: 409 });
  }
}
