import { getDB } from "@/lib/db";
import { guard } from "@/lib/permissions";

export const runtime = "edge";

function todayTehran() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });
}

// لیست ویزیت‌های یک روز (پیش‌فرض: امروز). ارجاع‌شده‌ها به ترتیب ارجاع، تکمیل‌شده‌ها پایین‌تر
export async function GET(request: Request) {
  const { error } = await guard("visits:read");
  if (error) return error;

  const date = new URL(request.url).searchParams.get("date") || todayTehran();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return Response.json({ error: "تاریخ نامعتبر" }, { status: 400 });

  const { results } = await getDB()
    .prepare(
      `SELECT v.id, v.patient_id, v.visit_date, v.status, v.referred_at, v.completed_at,
              v.surgery_date, p.first_name, p.last_name, p.phone, p.age, p.surgery_type, p.daily_number
       FROM visits v JOIN patients p ON p.id = v.patient_id
       WHERE v.visit_date = ?
       ORDER BY (v.status = 'completed'), v.referred_at ASC, v.id ASC`
    )
    .bind(date)
    .all();
  return Response.json(results);
}

// ارجاع بیمار به دکتر (منشی)
export async function POST(request: Request) {
  const { user, error } = await guard("visits:refer");
  if (error) return error;

  const b = (await request.json().catch(() => ({}))) as { patient_id?: unknown };
  const pid = Number(b.patient_id);
  if (!Number.isInteger(pid) || pid <= 0)
    return Response.json({ error: "بیمار نامعتبر است" }, { status: 400 });

  const db = getDB();
  const patient = await db.prepare("SELECT id FROM patients WHERE id = ?").bind(pid).first();
  if (!patient) return Response.json({ error: "بیمار پیدا نشد" }, { status: 404 });

  const date = todayTehran();
  const dup = await db
    .prepare("SELECT id FROM visits WHERE patient_id = ? AND visit_date = ? AND status = 'referred'")
    .bind(pid, date)
    .first();
  if (dup) return Response.json({ error: "این بیمار امروز قبلاً به دکتر ارجاع شده" }, { status: 409 });

  const res = await db
    .prepare("INSERT INTO visits (patient_id, visit_date, referred_by) VALUES (?, ?, ?)")
    .bind(pid, date, user.uid)
    .run();
  return Response.json({ ok: true, id: res.meta.last_row_id });
}