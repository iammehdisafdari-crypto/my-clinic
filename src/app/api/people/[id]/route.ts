import { getDB } from "@/lib/db";
import { guard } from "@/lib/permissions";
import { normText, toEnDigits } from "@/lib/normalize";

export const runtime = "edge";
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const { error } = await guard("patients:read");
  if (error) return error;
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "شناسه شخص نامعتبر است" }, { status: 400 });

  const db = getDB();
  const person = await db.prepare(
    "SELECT id, lifecycle_stage, first_name, last_name, phone, landline, father_name, age, job, marital_status, " +
    "residence_area, surgery_type, referral_source, notes, profile_created_at, converted_at, admission_date, " +
    "CASE WHEN lifecycle_stage = 'patient' THEN daily_number ELSE NULL END AS daily_number FROM patients WHERE id = ?"
  ).bind(id).first();
  if (!person) return Response.json({ error: "شخص پیدا نشد" }, { status: 404 });

  const { results: appointments } = await db.prepare(
    "SELECT id, type, appointment_date, appointment_time, status, attendance_status, description, created_at " +
    "FROM appointments WHERE patient_id = ? ORDER BY appointment_date DESC, appointment_time DESC LIMIT 100"
  ).bind(id).all();

  const { results: events } = await db.prepare(
    "SELECT id, event_type, changed_fields, performed_by, created_at FROM person_events " +
    "WHERE person_id = ? ORDER BY id DESC LIMIT 100"
  ).bind(id).all();

  const patientRecord = await db.prepare(
    "SELECT id, created_at FROM patient_records WHERE patient_id = ?"
  ).bind(id).first();

  return Response.json({
    person, appointments, events, has_patient_record: Boolean(patientRecord),
    patient_record_created_at: patientRecord?.created_at ?? null
  });
}

export async function PATCH(request: Request, context: Context) {
  const { user, error } = await guard("patients:write");
  if (error) return error;
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "شناسه شخص نامعتبر است" }, { status: 400 });

  const db = getDB();
  const existing = await db.prepare("SELECT id, created_by FROM patients WHERE id = ?")
    .bind(id).first() as { id: number; created_by: number | null } | null;
  if (!existing) return Response.json({ error: "شخص پیدا نشد" }, { status: 404 });
  if (user.role === "visitor" && Number(existing.created_by) !== Number(user.uid)) {
    return Response.json({ error: "فقط می‌توانید اطلاعات متقاضیان ثبت‌شده توسط خودتان را ویرایش کنید." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const allowedText = [
    "first_name", "last_name", "phone", "landline", "father_name", "job",
    "marital_status", "residence_area", "surgery_type", "referral_source", "notes"
  ];
  const updates: string[] = [];
  const values: unknown[] = [];

  for (const field of allowedText) {
    if (!(field in body)) continue;
    let value = normText(body[field]);
    if (field === "phone") {
      value = toEnDigits(String(body[field] ?? "")).replace(/\D/g, "");
      if (!/^09\d{9}$/.test(value)) return Response.json({ error: "شماره موبایل نامعتبر است" }, { status: 400 });
    }
    if ((field === "first_name" || field === "last_name") && !value) {
      return Response.json({ error: "نام و نام خانوادگی الزامی است" }, { status: 400 });
    }
    updates.push(field + " = ?");
    values.push(value || null);
  }

  if ("age" in body) {
    const raw = toEnDigits(String(body.age ?? "")).trim();
    const age = raw ? Number(raw) : null;
    if (age !== null && (!Number.isInteger(age) || age < 0 || age > 120)) {
      return Response.json({ error: "سن نامعتبر است" }, { status: 400 });
    }
    updates.push("age = ?");
    values.push(age);
  }

  if (!updates.length) return Response.json({ error: "تغییری برای ذخیره ارسال نشده است" }, { status: 400 });
  updates.push("updated_by = ?", "updated_at = CURRENT_TIMESTAMP");
  values.push(user.uid, id);

  try {
    await db.prepare("UPDATE patients SET " + updates.join(", ") + " WHERE id = ?").bind(...values).run();
    return Response.json({ ok: true });
  } catch (cause) {
    console.error("PERSON_UPDATE_FAILED", cause);
    return Response.json({ error: "ویرایش اطلاعات انجام نشد." }, { status: 500 });
  }
}
