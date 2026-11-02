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
