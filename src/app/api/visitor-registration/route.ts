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
  const appointmentPermission = await guard("appointments:write", request);
  if (appointmentPermission.error) return appointmentPermission.error;
  if (user.role !== "visitor" || appointmentPermission.user.uid !== user.uid) {
    return Response.json({ error: "این عملیات فقط در دسترس نقش ویزیتور است." }, { status: 403 });
  }

  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const first_name = normText(b.first_name);
  const last_name = normText(b.last_name);
  const phone = toEnDigits(String(b.phone ?? "")).replace(/\D/g, "");
  const national_id = toEnDigits(String(b.national_id ?? "")).replace(/\D/g, "");
  const ageRaw = toEnDigits(String(b.age ?? "")).trim();
  const age = ageRaw ? Number(ageRaw) : null;
  const father_name = normText(b.father_name) || null;
  const marital_status = normText(b.marital_status) || null;
  const referral_source = normText(b.referral_source) || null;
  const surgeon_name = normText(b.surgeon_name) || null;
  const appointment_date = toEnDigits(normText(b.appointment_date));
  const appointment_time = toEnDigits(normText(b.appointment_time));

  if (!first_name || !last_name) return Response.json({ error: "نام و نام خانوادگی را وارد کنید." }, { status: 400 });
  if (!/^09\d{9}$/.test(phone)) return Response.json({ error: "شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود." }, { status: 400 });
  if (national_id && !/^\d{10}$/.test(national_id)) return Response.json({ error: "کد ملی باید ۱۰ رقم باشد." }, { status: 400 });
  if (age !== null && (!Number.isInteger(age) || age < 1 || age > 120)) return Response.json({ error: "سن معتبر نیست." }, { status: 400 });
  const todayTehran = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });
  if (!isRealDate(appointment_date) || appointment_date < todayTehran) return Response.json({ error: "تاریخ مراجعه معتبر نیست یا در گذشته قرار دارد." }, { status: 400 });
  if (!TIME_SLOTS.has(appointment_time)) return Response.json({ error: "لطفاً یکی از ساعت‌های مجاز و آزاد را انتخاب کنید." }, { status: 400 });

  const db = getDB();
  try {
    const schema = await db.prepare("PRAGMA table_info(patients)").all<{ name: string; notnull: number }>();
    let patientSchema = schema.results ?? [];
    let columnSet = new Set(patientSchema.map((column) => column.name));
    if (!columnSet.has("national_id")) {
      await db.prepare("ALTER TABLE patients ADD COLUMN national_id TEXT").run();
      columnSet.add("national_id");
    }
    if (!columnSet.has("surgeon_name")) {
      await db.prepare("ALTER TABLE patients ADD COLUMN surgeon_name TEXT").run();
      columnSet.add("surgeon_name");
    }
    patientSchema = (await db.prepare("PRAGMA table_info(patients)").all<{ name: string; notnull: number }>()).results ?? [];
    const nationalIdColumn = patientSchema.find((column) => column.name === "national_id");
    const storedNationalId = national_id || (nationalIdColumn?.notnull ? `LEGACY-${crypto.randomUUID()}` : null);
    const columns = [
      "daily_number", "admission_date", "first_name", "last_name", "phone", "father_name",
      "age", "marital_status", "surgery_type", "referral_source", "surgeon_name", "national_id", "created_by",
    ];
    const values: unknown[] = [
      new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" }),
      new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" }),
      first_name, last_name, phone, father_name, age, marital_status,
      normText(b.surgery_type) || null, referral_source, surgeon_name, storedNationalId, user.uid,
    ];
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
