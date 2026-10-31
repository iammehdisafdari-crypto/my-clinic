import { getDB } from "@/lib/db";
import { guard } from "@/lib/permissions";
import { verifyMutationOrigin } from "@/lib/request-security";
import { normText, toEnDigits } from "@/lib/normalize";

export const runtime = "edge";

function todayTehran() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });
}

export async function GET(request: Request) {
  const { user, error } = await guard("patients:read");
  if (error) return error;

  const params = new URL(request.url).searchParams;
  const q = normText(params.get("q")).replace(/[%_]/g, "");
  const stage = params.get("stage");
  const clauses: string[] = [];
  const values: string[] = [];

  if (stage === "lead" || stage === "patient") {
    values.push(stage);
    clauses.push("lifecycle_stage = ?" + values.length);
  }
  if (q) {
    values.push("%" + toEnDigits(q) + "%");
    const p = "?" + values.length;
    clauses.push("((first_name || ' ' || last_name) LIKE " + p +
      " OR (last_name || ' ' || first_name) LIKE " + p + " OR phone LIKE " + p + ")");
  }

  const where = clauses.length ? "WHERE " + clauses.join(" AND ") : "";
  const { results } = await getDB()
    .prepare(
      "SELECT id, lifecycle_stage, first_name, last_name, phone, age, surgery_type, referral_source, notes, " +
      "profile_created_at, created_at, " +
      "CASE WHEN lifecycle_stage = 'patient' THEN daily_number ELSE NULL END AS daily_number, " +
      "CASE WHEN lifecycle_stage = 'patient' THEN admission_date ELSE NULL END AS admission_date, created_by " +
      "FROM patients " + where + " ORDER BY id DESC LIMIT 100"
    )
    .bind(...values)
    .all();

  return Response.json(results.map((row: Record<string, unknown>) => {
    const { created_by, ...person } = row;
    return { ...person, can_edit: Number(created_by) === Number(user.uid) };
  }));
}

export async function POST(request: Request) {
  const originError = verifyMutationOrigin(request);
  if (originError) return originError;
  const { user, error } = await guard("patients:create");
  if (error) return error;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const firstName = normText(body.first_name);
  const lastName = normText(body.last_name);
  const phone = toEnDigits(String(body.phone ?? "")).replace(/\D/g, "");

  if (!firstName || !lastName) return Response.json({ error: "نام و نام خانوادگی را وارد کنید" }, { status: 400 });
  if (!/^09\d{9}$/.test(phone)) return Response.json({ error: "شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود" }, { status: 400 });

  const db = getDB();
  if (body.confirm_duplicate !== true) {
    const { results } = await db.prepare(
      "SELECT id, first_name, last_name, phone, lifecycle_stage, created_by FROM patients WHERE phone = ? ORDER BY id DESC LIMIT 10"
    ).bind(phone).all();
    if (results.length) {
      return Response.json({
        error: "این شماره قبلاً ثبت شده است؛ شخص قبلی را انتخاب کنید یا ثبت شخص جدید را تأیید کنید.",
        duplicates: results.map((row: Record<string, unknown>) => {
          const { created_by, ...person } = row;
          return { ...person, can_edit: Number(created_by) === Number(user.uid) };
        })
      }, { status: 409 });
    }
  }

  let age: number | null = null;
  const ageRaw = toEnDigits(String(body.age ?? "")).trim();
  if (ageRaw) {
    age = Number(ageRaw);
    if (!Number.isInteger(age) || age < 0 || age > 120) return Response.json({ error: "سن نامعتبر است" }, { status: 400 });
  }

  const date = todayTehran();
  const minRow = await db.prepare(
    "SELECT MIN(daily_number) AS min_number FROM patients WHERE admission_date = ? AND daily_number < 0"
  ).bind(date).first() as { min_number: number | null } | null;
  const temporaryNumber = Math.min(-1, Number(minRow?.min_number ?? 0) - 1);
  const optional = (value: unknown) => normText(value) || null;

  try {
    const columns = [
      "daily_number", "admission_date", "first_name", "last_name", "phone", "landline",
      "father_name", "age", "job", "marital_status", "residence_area", "surgery_type",
      "referral_source", "notes", "created_by", "lifecycle_stage", "profile_created_at"
    ];
    const values: unknown[] = [
      temporaryNumber, date, firstName, lastName, phone, null, null, age, null, null, null,
      optional(body.surgery_type), optional(body.referral_source), optional(body.notes),
      user.uid, "lead", new Date().toISOString()
    ];

    const patientColumns = await db.prepare("PRAGMA table_info(patients)").all<{ name: string }>();
    const hasLegacyNationalId = (patientColumns.results ?? []).some((column) => column.name === "national_id");
    if (hasLegacyNationalId) {
      columns.push("national_id");
      values.push("LEAD-" + crypto.randomUUID());
    }

    const placeholders = values.map((_, index) => "?" + (index + 1));
    const result = await db.prepare(
      "INSERT INTO patients (" + columns.join(", ") + ") VALUES (" + placeholders.join(", ") + ")"
    ).bind(...values).run();

    const person = await db.prepare(
      "SELECT id, lifecycle_stage, first_name, last_name, phone, profile_created_at FROM patients WHERE id = ?"
    ).bind(result.meta.last_row_id).first();

    return Response.json({ ok: true, person: person ? { ...person, can_edit: true } : null }, { status: 201 });
  } catch (cause) {
    console.error("LEAD_CREATE_FAILED", cause);
    return Response.json({ error: "ثبت متقاضی انجام نشد. دوباره تلاش کنید." }, { status: 500 });
  }
}
