import { getDB } from "@/lib/db";
import { guard } from "@/lib/permissions";
import { normText, toEnDigits } from "@/lib/normalize";

export const runtime = "edge";

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function POST(request: Request) {
  const { user, error } = await guard("patients:create");
  if (error) return error;
  if (user.role !== "visitor") {
    return Response.json({ error: "این عملیات فقط برای نقش ویزیتور مجاز است" }, { status: 403 });
  }

  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const text = (key: string) => normText(b[key]);
  const first_name = text("first_name");
  const last_name = text("last_name");
  const father_name = text("father_name") || null;
  const phone = toEnDigits(String(b.phone ?? "")).replace(/\D/g, "");
  const national_id = toEnDigits(String(b.national_id ?? "")).replace(/\D/g, "");
  const ageRaw = toEnDigits(String(b.age ?? "")).trim();
  const age = ageRaw ? Number(ageRaw) : null;
  const marital_status = text("marital_status") || null;
  const referral_source = text("referral_source") || null;
  const surgery_type = text("surgery_type") || null;
  const surgeon_name = text("surgeon_name") || null;
  const appointment_date = toEnDigits(text("appointment_date"));
  const appointment_time = toEnDigits(text("appointment_time"));

  if (!first_name || !last_name) return Response.json({ error: "نام و نام خانوادگی الزامی است" }, { status: 400 });
  if (!/^09\d{9}$/.test(phone)) return Response.json({ error: "شماره تماس باید ۱۱ رقم و با ۰۹ شروع شود" }, { status: 400 });
  if (national_id && !/^\d{10}$/.test(national_id)) return Response.json({ error: "کد ملی باید ۱۰ رقم باشد" }, { status: 400 });
  if (age !== null && (!Number.isInteger(age) || age < 1 || age > 120)) return Response.json({ error: "سن معتبر نیست" }, { status: 400 });
  if (!validDate(appointment_date) || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(appointment_time)) {
    return Response.json({ error: "تاریخ و ساعت مراجعه معتبر نیست" }, { status: 400 });
  }

  const db = getDB();
  try {
    // سازگاری با دیتابیس‌های قدیمی و جدید؛ فقط ستون‌های فاقد schema اضافه می‌شوند.
    let info = await db.prepare("PRAGMA table_info(patients)").all<{ name: string; notnull: number }>();
    let columnNames = new Set((info.results ?? []).map((column) => column.name));
    if (!columnNames.has("national_id")) {
      await db.prepare("ALTER TABLE patients ADD COLUMN national_id TEXT").run();
    }
    if (!columnNames.has("surgeon_name")) {
      await db.prepare("ALTER TABLE patients ADD COLUMN surgeon_name TEXT").run();
    }
    info = await db.prepare("PRAGMA table_info(patients)").all<{ name: string; notnull: number }>();
    columnNames = new Set((info.results ?? []).map((column) => column.name));
    if (!columnNames.has("national_id") || !columnNames.has("surgeon_name")) {
      return Response.json({ error: "ساختار دیتابیس برای ثبت اطلاعات جدید آماده نیست" }, { status: 500 });
    }
    // دیتابیس قدیمی ممکن است national_id را اجباری تعریف کرده باشد؛
    // در این حالت برای ورودی خالی فقط مقدار سازگاری داخلی ذخیره می‌شود.
    const nationalIdColumn = (info.results ?? []).find((column) => column.name === "national_id");
    const storedNationalId = national_id || (nationalIdColumn?.notnull ? `LEGACY-${crypto.randomUUID()}` : null);

    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });
    const patientColumns = [
      "daily_number", "admission_date", "first_name", "last_name", "phone",
      "father_name", "age", "marital_status", "referral_source", "surgery_type",
      "surgeon_name", "national_id", "created_by"
    ];
    const patientValues = [
      today, today, first_name, last_name, phone, father_name, age, marital_status,
      referral_source, surgery_type, surgeon_name, storedNationalId, user.uid
    ];
    const placeholders = [
      "(SELECT COALESCE(MAX(daily_number), 0) + 1 FROM patients WHERE admission_date = ?1)",
      ...patientValues.slice(1).map((_, i) => `?${i + 2}`)
    ];

    const patientInsert = db.prepare(
      `INSERT INTO patients (${patientColumns.join(", ")}) VALUES (${placeholders.join(", ")})`
    ).bind(...patientValues);

    // D1 batch اجراها را در یک تراکنش انجام می‌دهد؛ شکست رزرو، ثبت بیمار را نیز rollback می‌کند.
    const appointmentInsert = db.prepare(
      `INSERT INTO appointments (patient_id, type, appointment_date, appointment_time, description, created_by)
       SELECT last_insert_rowid(), 'consultation', ?, ?, 'ثبت یک‌مرحله‌ای توسط ویزیتور', ?
       WHERE EXISTS (SELECT 1 FROM patients WHERE id = last_insert_rowid())`
    ).bind(appointment_date, appointment_time, user.uid);

    const results = await db.batch([patientInsert, appointmentInsert]);
    const patientId = results[0]?.meta?.last_row_id;
    if (!patientId) {
      return Response.json({ error: "ثبت پرونده بیمار تأیید نشد؛ دوباره تلاش کنید" }, { status: 500 });
    }
    const patient = await db.prepare(
      "SELECT id, daily_number, first_name, last_name FROM patients WHERE id = ?"
    ).bind(patientId).first();
    const appointment = await db.prepare(
      `SELECT id FROM appointments
       WHERE patient_id = ? AND created_by = ? AND type = 'consultation'
         AND appointment_date = ? AND appointment_time = ?
       ORDER BY id DESC LIMIT 1`
    ).bind(patientId, user.uid, appointment_date, appointment_time).first<{ id: number }>();
    if (!patient || !appointment) {
      return Response.json({ error: "ثبت پرونده و نوبت کامل تأیید نشد؛ با پشتیبانی تماس بگیرید" }, { status: 500 });
    }
    return Response.json({ ok: true, patient, appointment_id: appointment.id }, { status: 201 });
  } catch (err: any) {
    console.error("VISITOR_REGISTRATION_ERROR:", err);
    const message = String(err?.message || "");
    if (/UNIQUE|constraint/i.test(message)) {
      return Response.json({ error: "این ساعت قبلاً رزرو شده یا کد ملی تکراری است؛ اطلاعات را بررسی کنید" }, { status: 409 });
    }
    return Response.json({ error: "ثبت اطلاعات انجام نشد. لطفاً دوباره تلاش کنید" }, { status: 500 });
  }
}
