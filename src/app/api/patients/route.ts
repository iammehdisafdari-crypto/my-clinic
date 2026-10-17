import { getDB } from "@/lib/db";
import { guard } from "@/lib/permissions";
import { normText, toEnDigits } from "@/lib/normalize";

export const runtime = "edge";

// تاریخ امروز به وقت تهران، به شکل YYYY-MM-DD
function todayTehran() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });
}

const COLS =
  "id, daily_number, admission_date, first_name, last_name, phone, landline, father_name, age, job, marital_status, residence_area, surgery_type, referral_source, notes, created_at";

// بدون q: بیماران امروز | با q: جستجو بر اساس نام، نام خانوادگی یا شماره
export async function GET(request: Request) {
  const { error } = await guard("patients:read");
  if (error) return error;

  const q = normText(new URL(request.url).searchParams.get("q")).replace(/[%_]/g, "");
  const db = getDB();

  if (!q) {
    const { results } = await db
      .prepare(`SELECT ${COLS} FROM patients WHERE admission_date = ? ORDER BY daily_number DESC LIMIT 100`)
      .bind(todayTehran())
      .all();
    return Response.json(results);
  }

  const like = `%${toEnDigits(q)}%`;
  const { results } = await db
    .prepare(
      `SELECT ${COLS} FROM patients
       WHERE (first_name || ' ' || last_name) LIKE ?1
          OR (last_name || ' ' || first_name) LIKE ?1
          OR phone LIKE ?1
          OR landline LIKE ?1
       ORDER BY id DESC LIMIT 50`
    )
    .bind(like)
    .all();
  return Response.json(results);
}

// ثبت بیمار جدید
export async function POST(request: Request) {
  const { user, error } = await guard("patients:write");
  if (error) return error;

  const b = (await request.json()) as Record<string, unknown>;
  const first_name = normText(b.first_name);
  const last_name = normText(b.last_name);
  const phone = toEnDigits(String(b.phone ?? "")).replace(/\D/g, "");

  if (!first_name || !last_name)
    return Response.json({ error: "نام و نام خانوادگی را وارد کنید" }, { status: 400 });
  if (!/^09\d{9}$/.test(phone))
    return Response.json({ error: "شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود" }, { status: 400 });

  let age: number | null = null;
  const ageRaw = toEnDigits(String(b.age ?? "")).trim();
  if (ageRaw) {
    age = Number(ageRaw);
    if (!Number.isInteger(age) || age < 0 || age > 120)
      return Response.json({ error: "سن نامعتبر است" }, { status: 400 });
  }

  const landline = toEnDigits(String(b.landline ?? "")).replace(/\D/g, "") || null;
  const opt = (v: unknown) => normText(v) || null;
  const date = todayTehran();

  try {
    const db = getDB();
    // شماره پرونده روز: بزرگ‌ترین شماره‌ی امروز + ۱ (هر روز از ۱ شروع می‌شود)
    const res = await db
      .prepare(
        `INSERT INTO patients
         (daily_number, admission_date, first_name, last_name, phone, landline, father_name, age,
          job, marital_status, residence_area, surgery_type, referral_source, notes, created_by)
         VALUES
         ((SELECT COALESCE(MAX(daily_number), 0) + 1 FROM patients WHERE admission_date = ?1),
          ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`
      )
      .bind(
        date, first_name, last_name, phone, landline, opt(b.father_name), age,
        opt(b.job), opt(b.marital_status), opt(b.residence_area), opt(b.surgery_type),
        opt(b.referral_source), opt(b.notes), user.uid
      )
      .run();

    const row = await db
      .prepare("SELECT id, daily_number, admission_date FROM patients WHERE id = ?")
      .bind(res.meta.last_row_id)
      .first();
    return Response.json({ ok: true, patient: row });
  } catch {
    return Response.json({ error: "ثبت بیمار انجام نشد. دوباره تلاش کنید" }, { status: 500 });
  }
}