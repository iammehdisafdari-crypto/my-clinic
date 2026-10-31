import { getDB } from "@/lib/db";
import { guard } from "@/lib/permissions";
import { normText, toEnDigits } from "@/lib/normalize";

export const runtime = "edge";

const TIME_SLOTS = new Set([
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00",
]);

function isRealDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export async function POST(request: Request) {
  const { user, error } = await guard("patients:create", request);
  if (error) return error;
  if (!["visitor", "admin", "manager"].includes(user.role)) {
    return Response.json({ error: "این عملیات فقط در دسترس نقش ویزیتور است." }, { status: 403 });
  }

  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const first_name = normText(b.first_name);
  const last_name = normText(b.last_name);
  const phone = toEnDigits(String(b.phone ?? "")).replace(/\D/g, "");
  const appointment_date = toEnDigits(normText(b.appointment_date));
  const appointment_time = toEnDigits(normText(b.appointment_time));

  if (!first_name || !last_name) return Response.json({ error: "نام و نام خانوادگی را وارد کنید." }, { status: 400 });
  if (!/^09\d{9}$/.test(phone)) return Response.json({ error: "شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود." }, { status: 400 });
  if (!isRealDate(appointment_date)) return Response.json({ error: "تاریخ مشاوره معتبر نیست." }, { status: 400 });
  if (!TIME_SLOTS.has(appointment_time)) return Response.json({ error: "لطفاً یکی از ساعت‌های مجاز و آزاد را انتخاب کنید." }, { status: 400 });

  const db = getDB();
  try {
    const patientColumns = await db.prepare("PRAGMA table_info(patients)").all<{ name: string }>();
    const hasLegacyNationalId = (patientColumns.results ?? []).some((column) => column.name === "national_id");
    const columns = [
      "daily_number", "admission_date", "first_name", "last_name", "phone", "landline",
      "father_name", "age", "job", "marital_status", "residence_area", "surgery_type",
      "referral_source", "notes", "created_by",
    ];
    const values: unknown[] = [
      appointment_date, appointment_date, first_name, last_name, phone, null,
      null, null, null, null, null, normText(b.surgery_type) || null,
      null, normText(b.notes) || null, user.uid,
    ];
    if (hasLegacyNationalId) {
      columns.push("national_id");
      values.push(`LEGACY-${crypto.randomUUID()}`);
    }
    const placeholders = values.map((_, index) => `?${index + 1}`);
    placeholders[0] = "(SELECT COALESCE(MAX(daily_number), 0) + 1 FROM patients WHERE admission_date = ?1)";

    // D1 batch runs these statements in one transaction: either both records persist or neither does.
    const results = await db.batch([
      db.prepare(`INSERT INTO patients (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`).bind(...values),
      db.prepare(
        `INSERT INTO appointments (patient_id, type, appointment_date, appointment_time, description, created_by)
         VALUES (last_insert_rowid(), 'consultation', ?, ?, ?, ?)`
      ).bind(appointment_date, appointment_time, "ثبت‌شده توسط ویزیتور", user.uid),
    ]);

    const patientId = results?.[0]?.meta?.last_row_id;
    const appointmentId = results?.[1]?.meta?.last_row_id;
    if (!patientId || !appointmentId) throw new Error("D1 did not return inserted record IDs");

    const patient = await db.prepare("SELECT id, daily_number, admission_date FROM patients WHERE id = ?")
      .bind(patientId).first();
    return Response.json({ ok: true, patient, appointment_id: appointmentId });
  } catch (err) {
    console.error("VISITOR_REGISTRATION_ERROR:", err);
    const message = String((err as Error)?.message ?? "");
    if (/UNIQUE|constraint/i.test(message)) {
      return Response.json({ error: "این ساعت در همین لحظه رزرو شده یا شماره پرونده هم‌زمان ثبت شده است. ساعت دیگری انتخاب کنید." }, { status: 409 });
    }
    return Response.json({ error: "ثبت هم‌زمان بیمار و نوبت انجام نشد؛ هیچ‌کدام نباید ثبت شده باشند. دوباره تلاش کنید." }, { status: 500 });
  }
}
