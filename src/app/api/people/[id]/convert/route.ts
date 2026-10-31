import { getDB } from "@/lib/db";
import { guard } from "@/lib/permissions";

export const runtime = "edge";
function todayTehran() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });
}
type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context) {
  const { user, error } = await guard("patients:write");
  if (error) return error;
  const allowed = ["admin", "manager", "doctor", "admission", "scheduler"];
  if (!allowed.includes(user.role)) {
    return Response.json({ error: "برای تشکیل پرونده پزشکی دسترسی پذیرش لازم است." }, { status: 403 });
  }

  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "شناسه شخص نامعتبر است" }, { status: 400 });
  const db = getDB();
  const date = todayTehran();

  try {
    const result = await db.prepare(
      "UPDATE patients SET daily_number = (SELECT COALESCE(MAX(daily_number), 0) + 1 FROM patients WHERE admission_date = ? AND daily_number > 0), " +
      "admission_date = ?, lifecycle_stage = 'patient', converted_at = CURRENT_TIMESTAMP, " +
      "updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND lifecycle_stage = 'lead'"
    ).bind(date, date, user.uid, id).run();

    if (!result.meta.changes) {
      const current = await db.prepare("SELECT lifecycle_stage FROM patients WHERE id = ?").bind(id)
        .first() as { lifecycle_stage: string } | null;
      if (!current) return Response.json({ error: "شخص پیدا نشد" }, { status: 404 });
      if (current.lifecycle_stage === "patient") return Response.json({ error: "این شخص قبلاً به بیمار تبدیل شده است." }, { status: 409 });
      return Response.json({ error: "تبدیل متقاضی انجام نشد." }, { status: 409 });
    }

    const patient = await db.prepare(
      "SELECT id, daily_number, admission_date, lifecycle_stage FROM patients WHERE id = ?"
    ).bind(id).first();
    return Response.json({ ok: true, patient });
  } catch (cause) {
    console.error("LEAD_CONVERSION_FAILED", cause);
    return Response.json({ error: "تشکیل پرونده انجام نشد. سوابق قبلی حفظ شده‌اند." }, { status: 500 });
  }
}
