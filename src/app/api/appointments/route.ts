import { getDB } from "@/lib/db";
import { guard } from "@/lib/permissions";
import { normText, toEnDigits } from "@/lib/normalize";

export const runtime = "edge";

export async function GET(request: Request) {
  const { user, error } = await guard("patients:read");
  if (error) return error;
  const url = new URL(request.url);
  const personId = Number(url.searchParams.get("person_id") || url.searchParams.get("patient_id"));
  const date = url.searchParams.get("date");
  const type = url.searchParams.get("type") || "consultation";
  const mine = url.searchParams.get("mine") === "1";
  const db = getDB();

  if (Number.isInteger(personId) && personId > 0) {
    const { results } = await db.prepare(
      "SELECT a.id, a.patient_id, a.appointment_date, a.appointment_time, a.status, a.attendance_status, " +
      "a.type, a.description, a.created_at, p.first_name, p.last_name, p.phone " +
      "FROM appointments a JOIN patients p ON p.id = a.patient_id WHERE a.patient_id = ?" +
      (user.role === "visitor" ? " AND a.created_by = ?" : "") +
      " ORDER BY a.appointment_date DESC, a.appointment_time DESC LIMIT 100"
    ).bind(...(user.role === "visitor" ? [personId, user.uid] : [personId])).all();
    return Response.json(results);
  }

  if (mine) {
    const { results } = await db.prepare(
      "SELECT a.id, a.patient_id, a.appointment_date, a.appointment_time, a.status, a.attendance_status, " +
      "a.type, a.description, p.first_name, p.last_name, p.phone " +
      "FROM appointments a JOIN patients p ON p.id = a.patient_id WHERE a.created_by = ? " +
      "ORDER BY a.appointment_date DESC, a.appointment_time DESC LIMIT 100"
    ).bind(user.uid).all();
    return Response.json(results);
  }

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "تاریخ نامعتبر است" }, { status: 400 });
  }

  // Slot availability does not need patient-identifying information.
  const { results } = await db.prepare(
    "SELECT id, appointment_date, appointment_time, status, attendance_status, type " +
    "FROM appointments WHERE appointment_date = ? AND type = ? ORDER BY appointment_time ASC"
  ).bind(date, type).all();
  return Response.json(results);
}

export async function POST(request: Request) {
  const { user, error } = await guard("appointments:write");
  if (error) return error;
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const patient_id = Number(b.patient_id ?? b.person_id);
  const type = normText(b.type);
  const appointment_date = toEnDigits(normText(b.appointment_date));
  const appointment_time = toEnDigits(normText(b.appointment_time));
  const description = normText(b.description) || null;

  if (!Number.isInteger(patient_id) || patient_id <= 0) return Response.json({ error: "شخص انتخاب‌شده نامعتبر است" }, { status: 400 });
  if (type !== "consultation" && type !== "surgery") return Response.json({ error: "نوع نوبت نامعتبر است" }, { status: 400 });
  if (user.role === "nurse" && type !== "consultation") return Response.json({ error: "پرستار فقط می‌تواند نوبت خدمات پرستاری ثبت کند" }, { status: 403 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(appointment_date)) return Response.json({ error: "تاریخ نامعتبر است" }, { status: 400 });
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(appointment_time)) return Response.json({ error: "ساعت نوبت نامعتبر است (فرمت HH:MM)" }, { status: 400 });

  const db = getDB();
  const person = await db.prepare("SELECT id FROM patients WHERE id = ?").bind(patient_id).first();
  if (!person) return Response.json({ error: "شخص پیدا نشد" }, { status: 404 });

  try {
    const res = await db.prepare(
      "INSERT INTO appointments (patient_id, type, appointment_date, appointment_time, description, created_by) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(patient_id, type, appointment_date, appointment_time, description, user.uid).run();
    return Response.json({ ok: true, id: res.meta.last_row_id }, { status: 201 });
  } catch {
    return Response.json({ error: "این ساعت قبلاً رزرو شده است. لطفاً زمان دیگری انتخاب کنید." }, { status: 409 });
  }
}
