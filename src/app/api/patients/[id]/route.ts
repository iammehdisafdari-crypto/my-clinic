import { getDB } from "@/lib/db";
import { guard } from "@/lib/permissions";

export const runtime = "edge";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await guard("patients:record", request);
  if (error) return error;
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "شناسه بیمار معتبر نیست." }, { status: 400 });
  const patient = await getDB().prepare(
    `SELECT id, daily_number, admission_date, first_name, last_name, phone, landline, father_name,
            age, job, marital_status, residence_area, surgery_type, referral_source, notes, national_id,
            surgeon_name, created_at
     FROM patients WHERE id = ?`
  ).bind(id).first();
  if (!patient) return Response.json({ error: "پرونده بیمار پیدا نشد." }, { status: 404 });
  return Response.json(patient);
}


// حذف کامل پرونده بیمار؛ فقط مدیر کل سیستم و مدیر مجاز هستند.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await guard("patients:delete", request);
  if (error) return error;
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "شناسه بیمار معتبر نیست." }, { status: 400 });
  try {
    const result = await getDB().prepare("DELETE FROM patients WHERE id = ?").bind(id).run();
    if (!result.meta.changes) return Response.json({ error: "پرونده بیمار پیدا نشد." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("PATIENT_DELETE_ERROR:", err);
    return Response.json({ error: "این پرونده به سوابق دیگری متصل است و حذف مستقیم آن ممکن نیست." }, { status: 409 });
  }
}
