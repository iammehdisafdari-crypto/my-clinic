import { getDB } from "@/lib/db";
import { guard } from "@/lib/permissions";
import { normText, toEnDigits } from "@/lib/normalize";

export const runtime = "edge";

// گرفتن نوبت‌ها یا اسلات‌های یک روز مشخص
export async function GET(request: Request) {
  const { user, error } = await guard("patients:read");
  if (error) return error;

  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const type = url.searchParams.get("type") || "consultation";
  const mine = url.searchParams.get("mine") === "1";
  const all = url.searchParams.get("mine") === "0" && ["admin", "manager", "admission", "scheduler", "nurse"].includes(user.role);
  const db = getDB();

  if (mine || all) {
    const { results } = await db
      .prepare(
        `SELECT a.id, a.patient_id, a.appointment_date, a.appointment_time,
                a.status, a.type, a.description, p.first_name, p.last_name, p.phone
         FROM appointments a
         JOIN patients p ON p.id = a.patient_id
         WHERE (? = 1 OR a.created_by = ?)
         ORDER BY a.appointment_date DESC, a.appointment_time DESC
         LIMIT 200`
      )
      .bind(all ? 1 : 0, user.uid)
      .all();

    return Response.json(results);
  }

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return Response.json({ error: "تاریخ نامعتبر است" }, { status: 400 });

  const { results } = await db
    .prepare(
      `SELECT a.id, a.patient_id, a.appointment_date, a.appointment_time, a.status, a.type,
              p.first_name, p.last_name, p.phone
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       WHERE a.appointment_date = ? AND a.type = ?
       ORDER BY a.appointment_time ASC`
    )
    .bind(date, type)
    .all();

  return Response.json(results);
}

// ثبت نوبت جدید (توسط بازاریاب برای مشاوره، یا منشی برای جراحی)
export async function POST(request: Request) {
  const { user, error } = await guard("appointments:write");
  if (error) return error;

  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const patient_id = Number(b.patient_id);
  const type = normText(b.type);
  const appointment_date = toEnDigits(normText(b.appointment_date));
  const appointment_time = toEnDigits(normText(b.appointment_time));
  const description = normText(b.description) || null;

  if (!Number.isInteger(patient_id) || patient_id <= 0)
    return Response.json({ error: "بیمار نامعتبر است" }, { status: 400 });
  if (type !== "consultation" && type !== "surgery")
    return Response.json({ error: "نوع نوبت نامعتبر است" }, { status: 400 });
  if (user.role === "nurse" && type !== "consultation")
    return Response.json({ error: "پرستار فقط می‌تواند نوبت خدمات پرستاری ثبت کند" }, { status: 403 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(appointment_date))
    return Response.json({ error: "تاریخ نامعتبر است" }, { status: 400 });
  const allowedTimes = new Set(Array.from({ length: 13 }, (_, i) => { const minutes = 18 * 60 + i * 10; return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`; }));
  if (!allowedTimes.has(appointment_time))
    return Response.json({ error: "ساعت باید بین ۱۸:۰۰ تا ۲۰:۰۰ و در فاصله‌های ۱۰ دقیقه‌ای باشد." }, { status: 400 });

  const db = getDB();

  // بررسی وجود بیمار
  const patient = await db.prepare("SELECT id FROM patients WHERE id = ?").bind(patient_id).first();
  if (!patient) return Response.json({ error: "بیمار پیدا نشد" }, { status: 404 });

  try {
    const res = await db
      .prepare(
        `INSERT INTO appointments (patient_id, type, appointment_date, appointment_time, description, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(patient_id, type, appointment_date, appointment_time, description, user.uid)
      .run();

    return Response.json({ ok: true, id: res.meta.last_row_id });
  } catch {
    return Response.json({ error: "این ساعت قبلاً رزرو شده است. لطفاً زمان دیگری انتخاب کنید." }, { status: 409 });
  }
}


// تغییر تاریخ و ساعت مراجعه فقط توسط ویزیتوری که نوبت را ثبت کرده است.
export async function PUT(request: Request) {
  const { user, error } = await guard("appointments:write", request);
  if (error) return error;
  const canManageAny = ["admin", "manager", "admission", "scheduler", "nurse"].includes(user.role);
  if (user.role !== "visitor" && !canManageAny) return Response.json({ error: "اجازه تغییر نوبت ندارید." }, { status: 403 });

  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = Number(b.id);
  const appointment_date = toEnDigits(normText(b.appointment_date));
  const appointment_time = toEnDigits(normText(b.appointment_time));
  const todayTehran = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });
  const allowedTimes = new Set(Array.from({ length: 13 }, (_, i) => { const minutes = 18 * 60 + i * 10; return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`; }));
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(appointment_date) && !Number.isNaN(new Date(appointment_date + "T00:00:00.000Z").getTime()) && new Date(appointment_date + "T00:00:00.000Z").toISOString().slice(0,10) === appointment_date;
  if (!Number.isInteger(id) || id <= 0 || !validDate || appointment_date < todayTehran || !allowedTimes.has(appointment_time)) {
    return Response.json({ error: "شناسه، تاریخ یا ساعت نوبت معتبر نیست." }, { status: 400 });
  }

  try {
    const result = await getDB().prepare(
      `UPDATE appointments SET appointment_date = ?, appointment_time = ?
       WHERE id = ? AND (? = 1 OR created_by = ?) AND type = 'consultation' AND status IN ('pending', 'confirmed')`
    ).bind(appointment_date, appointment_time, id, canManageAny ? 1 : 0, user.uid).run();
    if (!result.meta.changes) return Response.json({ error: "نوبت پیدا نشد یا امکان ویرایش آن وجود ندارد." }, { status: 404 });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "این ساعت قبلاً رزرو شده است. زمان دیگری انتخاب کنید." }, { status: 409 });
  }
}
