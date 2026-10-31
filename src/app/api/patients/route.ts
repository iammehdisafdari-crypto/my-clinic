import { getDB } from "@/lib/db";
import { can, guard } from "@/lib/permissions";
import { guardPatientRead } from "@/lib/guard-patient-read";
import { verifyMutationOrigin } from "@/lib/request-security";
import { normText, toEnDigits } from "@/lib/normalize";

export const runtime = "edge";
function todayTehran() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });
}
const COLS =
  "id, daily_number, admission_date, first_name, last_name, phone, landline, father_name, age, job, marital_status, residence_area, surgery_type, referral_source, notes, created_at";

export async function GET(request: Request) {
  const { error } = await guardPatientRead();
  if (error) return error;
  const q = normText(new URL(request.url).searchParams.get("q")).replace(/[%_]/g, "");
  const db = getDB();

  if (!q) {
    const { results } = await db.prepare(
      "SELECT " + COLS + " FROM patients WHERE lifecycle_stage = 'patient' AND admission_date = ? ORDER BY daily_number DESC LIMIT 100"
    ).bind(todayTehran()).all();
    return Response.json(results);
  }

  const like = "%" + toEnDigits(q) + "%";
  const { results } = await db.prepare(
    "SELECT " + COLS + " FROM patients WHERE lifecycle_stage = 'patient' AND " +
    "((first_name || ' ' || last_name) LIKE ?1 OR (last_name || ' ' || first_name) LIKE ?1 OR phone LIKE ?1 OR landline LIKE ?1) " +
    "ORDER BY id DESC LIMIT 50"
  ).bind(like).all();
  return Response.json(results);
}

export async function POST(request: Request) {
  const originError = verifyMutationOrigin(request);
  if (originError) return originError;
  const { user, error } = await guard("patients:create");
  if (error) return error;
  const b = (await request.json()) as Record<string, unknown>;
  const first_name = normText(b.first_name);
  const last_name = normText(b.last_name);
  const phone = toEnDigits(String(b.phone ?? "")).replace(/\D/g, "");
  const appointment_date = toEnDigits(normText(b.appointment_date));
  const appointment_time = toEnDigits(normText(b.appointment_time));
  const hasAppointment = Boolean(appointment_date || appointment_time);

  if (user.role === "visitor" && !hasAppointment) {
    return Response.json({ error: "برای ثبت بیمار، انتخاب تاریخ و ساعت مراجعه الزامی است." }, { status: 400 });
  }
  if (hasAppointment && (!appointment_date || !appointment_time)) {
    return Response.json({ error: "تاریخ و ساعت مراجعه را کامل انتخاب کنید." }, { status: 400 });
  }
  if (hasAppointment && !can(user.role, "appointments:write")) {
    return Response.json({ error: "دسترسی ثبت نوبت ندارید." }, { status: 403 });
  }
  if (hasAppointment && !/^\d{4}-\d{2}-\d{2}$/.test(appointment_date)) {
    return Response.json({ error: "تاریخ مراجعه نامعتبر است." }, { status: 400 });
  }
  if (hasAppointment && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(appointment_time)) {
    return Response.json({ error: "ساعت مراجعه نامعتبر است." }, { status: 400 });
  }

  if (!first_name || !last_name) return Response.json({ error: "نام و نام خانوادگی را وارد کنید" }, { status: 400 });
  if (!/^09\d{9}$/.test(phone)) return Response.json({ error: "شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود" }, { status: 400 });

  let age: number | null = null;
  const ageRaw = toEnDigits(String(b.age ?? "")).trim();
  if (ageRaw) {
    age = Number(ageRaw);
    if (!Number.isInteger(age) || age < 0 || age > 120) return Response.json({ error: "سن نامعتبر است" }, { status: 400 });
  }

  const landline = toEnDigits(String(b.landline ?? "")).replace(/\D/g, "") || null;
  const opt = (v: unknown) => normText(v) || null;
  const date = todayTehran();

  try {
    const db = getDB();
    const patientColumns = await db.prepare("PRAGMA table_info(patients)").all<{ name: string }>();
    const hasLegacyNationalId = (patientColumns.results ?? []).some((column) => column.name === "national_id");
    const legacyNationalId = hasLegacyNationalId ? "LEGACY-" + crypto.randomUUID() : null;
    const columns = [
      "daily_number", "admission_date", "first_name", "last_name", "phone", "landline",
      "father_name", "age", "job", "marital_status", "residence_area", "surgery_type",
      "referral_source", "notes", "created_by",
    ];
    const values: unknown[] = [
      date, date, first_name, last_name, phone, landline, opt(b.father_name), age,
      opt(b.job), opt(b.marital_status), opt(b.residence_area), opt(b.surgery_type),
      opt(b.referral_source), opt(b.notes), user.uid,
    ];
    if (hasLegacyNationalId) {
      columns.push("national_id");
      values.push(legacyNationalId);
    }
    const placeholders = values.map((_, index) => "?" + (index + 1));
    placeholders[0] = "(SELECT COALESCE(MAX(daily_number), 0) + 1 FROM patients WHERE admission_date = ?1 AND daily_number > 0)";
    const patientInsert = db.prepare(
      "INSERT INTO patients (" + columns.join(", ") + ") VALUES (" + placeholders.join(", ") + ")"
    ).bind(...values);

    let patientId: number;
    if (hasAppointment) {
      // D1 batch is transactional: a slot conflict rolls back the patient insert too.
      const batchResults = await db.batch([
        patientInsert,
        db.prepare(
          "INSERT INTO appointments (patient_id, type, appointment_date, appointment_time, description, created_by) " +
          "VALUES (last_insert_rowid(), 'consultation', ?, ?, 'ثبت‌شده توسط ویزیتور', ?)"
        ).bind(appointment_date, appointment_time, user.uid),
      ]);
      const insertedPatientId = batchResults[0]?.meta?.last_row_id;
      if (!insertedPatientId) throw new Error("Patient insert did not return an id");
      const row = await db.prepare(
        "SELECT id, daily_number, admission_date FROM patients WHERE id = ?"
      ).bind(insertedPatientId).first<{ id: number; daily_number: number; admission_date: string }>();
      if (!row) throw new Error("Patient row missing after transactional insert");
      return Response.json({
        ok: true,
        patient: row,
        appointment: { appointment_date, appointment_time },
      }, { status: 201 });
    }

    const res = await patientInsert.run();
    const row = await db.prepare(
      "SELECT id, daily_number, admission_date FROM patients WHERE id = ?"
    ).bind(res.meta.last_row_id).first();
    return Response.json({ ok: true, patient: row }, { status: 201 });
  } catch (err) {
    console.error("PATIENT_CREATE_ERROR:", err);
    const message = err instanceof Error ? err.message : "";
    if (hasAppointment && /unique|constraint/i.test(message)) {
      return Response.json({ error: "این ساعت قبلاً رزرو شده است. بیمار ثبت نشد؛ لطفاً زمان دیگری انتخاب کنید." }, { status: 409 });
    }
    return Response.json({ error: "ثبت بیمار انجام نشد. دوباره تلاش کنید" }, { status: 500 });
  }
}
