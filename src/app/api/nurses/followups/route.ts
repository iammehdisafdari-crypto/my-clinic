import { getDB } from "@/lib/db";
import { guard } from "@/lib/permissions";
import { normText, toEnDigits } from "@/lib/normalize";

export const runtime = "edge";

const SERVICES: Record<string, string> = {
  taping: "چسب",
  splint_stitches: "آتل و بخیه",
  tampon: "تامپون",
  examination_evening: "معاینه عصر",
  examination_morning: "معاینه صبح",
  dissatisfaction: "ناراضی‌ها",
};

function todayTehran() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });
}

export async function GET(request: Request) {
  const { user, error } = await guard("patients:read");
  if (error) return error;

  const db = getDB();
  const url = new URL(request.url);
  const query = normText(url.searchParams.get("q"));
  const pattern = `%${query}%`;
  const today = todayTehran();

  const [candidateResult, appointmentResult] = await Promise.all([
    db
      .prepare(
        `SELECT s.id AS surgery_appointment_id, s.appointment_date AS surgery_date,
                s.appointment_time AS surgery_time, s.hospital_name,
                p.id AS patient_id, p.daily_number, p.first_name, p.last_name, p.phone
         FROM appointments s
         JOIN patients p ON p.id = s.patient_id
         WHERE s.type = 'surgery'
           AND s.appointment_date <= ?
           AND s.status <> 'cancelled'
           AND NOT EXISTS (
             SELECT 1 FROM appointments f
             WHERE f.related_surgery_appointment_id = s.id
               AND f.type = 'consultation'
               AND f.status <> 'cancelled'
           )
           AND (? = '' OR p.first_name LIKE ? OR p.last_name LIKE ?
                OR (p.first_name || ' ' || p.last_name) LIKE ?
                OR CAST(p.daily_number AS TEXT) LIKE ?)
         ORDER BY s.appointment_date DESC, s.appointment_time DESC
         LIMIT 300`
      )
      .bind(today, query, pattern, pattern, pattern, pattern)
      .all(),
    db
      .prepare(
        `SELECT f.id, f.patient_id, f.appointment_date, f.appointment_time,
                f.status, f.attendance_status, f.description,
                f.related_surgery_appointment_id, s.appointment_date AS surgery_date,
                p.daily_number, p.first_name, p.last_name, p.phone,
                COALESCE(NULLIF(u.full_name, ''), u.username) AS nurse_name
         FROM appointments f
         JOIN patients p ON p.id = f.patient_id
         LEFT JOIN users u ON u.id = f.created_by
         LEFT JOIN appointments s ON s.id = f.related_surgery_appointment_id
         WHERE f.type = 'consultation'
           AND f.related_surgery_appointment_id IS NOT NULL
           AND f.created_by = ?
         ORDER BY f.appointment_date DESC, f.appointment_time DESC
         LIMIT 100`
      )
      .bind(user.uid)
      .all(),
  ]);

  return Response.json({
    candidates: candidateResult.results,
    appointments: appointmentResult.results,
  });
}

export async function POST(request: Request) {
  const { user, error } = await guard("appointments:write");
  if (error) return error;
  if (!["nurse", "manager", "admin", "doctor"].includes(user.role))
    return Response.json({ error: "فقط پرستار می‌تواند نوبت پیگیری پس از عمل ثبت کند." }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const surgeryAppointmentId = Number(body.surgery_appointment_id);
  const serviceType = normText(body.service_type);
  const appointmentDate = toEnDigits(normText(body.appointment_date));
  const appointmentTime = toEnDigits(normText(body.appointment_time));
  const notes = normText(body.notes);
  const serviceLabel = SERVICES[serviceType];

  if (!Number.isInteger(surgeryAppointmentId) || surgeryAppointmentId <= 0)
    return Response.json({ error: "بیمار را از فهرست جراحی‌های انجام‌شده انتخاب کنید." }, { status: 400 });
  if (!serviceLabel)
    return Response.json({ error: "نوع خدمت پرستاری نامعتبر است." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate) || appointmentDate < todayTehran())
    return Response.json({ error: "تاریخ نوبت باید امروز یا در آینده باشد." }, { status: 400 });
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(appointmentTime))
    return Response.json({ error: "ساعت نوبت نامعتبر است (فرمت HH:MM)." }, { status: 400 });

  const db = getDB();
  const surgery = (await db
    .prepare(
      `SELECT a.id, a.appointment_date, p.id AS patient_id, p.first_name, p.last_name, p.phone
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       WHERE a.id = ? AND a.type = 'surgery'
         AND a.appointment_date <= ? AND a.status <> 'cancelled'`
    )
    .bind(surgeryAppointmentId, todayTehran())
    .first()) as {
      id: number;
      appointment_date: string;
      patient_id: number;
      first_name: string;
      last_name: string;
      phone: string;
    } | null;
  if (!surgery)
    return Response.json({ error: "نوبت عمل پیدا نشد یا هنوز تاریخ عمل نرسیده است." }, { status: 404 });

  const existing = await db
    .prepare(
      `SELECT id FROM appointments
       WHERE related_surgery_appointment_id = ? AND type = 'consultation' AND status <> 'cancelled'`
    )
    .bind(surgeryAppointmentId)
    .first();
  if (existing)
    return Response.json({ error: "برای این عمل قبلاً نوبت پیگیری ثبت شده است." }, { status: 409 });

  const description = `[خدمت پرستاری: ${serviceLabel}]${notes ? ` ${notes}` : ""}`;
  try {
    const result = await db
      .prepare(
        `INSERT INTO appointments (
           patient_id, type, appointment_date, appointment_time, description,
           created_by, related_surgery_appointment_id, attendance_status
         ) VALUES (?, 'consultation', ?, ?, ?, ?, ?, 'pending')`
      )
      .bind(
        surgery.patient_id,
        appointmentDate,
        appointmentTime,
        description,
        user.uid,
        surgeryAppointmentId
      )
      .run();

    const normalizedPhone = toEnDigits(surgery.phone).replace(/\D/g, "").replace(/^0/, "98");
    return Response.json({
      ok: true,
      id: Number(result.meta.last_row_id),
      patient: { first_name: surgery.first_name, last_name: surgery.last_name, phone: surgery.phone },
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      service_label: serviceLabel,
      whatsappUrl: `https://wa.me/${normalizedPhone}`,
    }, { status: 201 });
  } catch (cause) {
    const details = cause instanceof Error ? cause.message : String(cause);
    console.error("NURSE_FOLLOWUP_CREATE_FAILED", details);
    if (/unique|constraint failed/i.test(details))
      return Response.json({ error: "این ساعت برای نوبت دیگری رزرو شده است؛ ساعت دیگری انتخاب کنید." }, { status: 409 });
    return Response.json({ error: "ثبت نوبت پیگیری انجام نشد. دوباره تلاش کنید." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const { user, error } = await guard("appointments:write");
  if (error) return error;
  if (!["nurse", "manager", "admin", "doctor"].includes(user.role))
    return Response.json({ error: "دسترسی ندارید." }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const appointmentId = Number(body.appointment_id);
  const attendanceStatus = normText(body.attendance_status);
  if (!Number.isInteger(appointmentId) || appointmentId <= 0)
    return Response.json({ error: "نوبت نامعتبر است." }, { status: 400 });
  if (!["pending", "attended", "no_show"].includes(attendanceStatus))
    return Response.json({ error: "وضعیت مراجعه نامعتبر است." }, { status: 400 });

  const db = getDB();
  const canManageAny = ["manager", "admin", "doctor"].includes(user.role);
  const query = `UPDATE appointments
     SET attendance_status = ?,
         status = CASE
           WHEN ? = 'attended' THEN 'completed'
           WHEN ? IN ('pending', 'no_show') AND status = 'completed' THEN 'pending'
           ELSE status
         END
     WHERE id = ? AND type = 'consultation'
       AND related_surgery_appointment_id IS NOT NULL
       AND status <> 'cancelled'
       ${canManageAny ? "" : "AND created_by = ?"}`;
  const params = canManageAny
    ? [attendanceStatus, attendanceStatus, attendanceStatus, appointmentId]
    : [attendanceStatus, attendanceStatus, attendanceStatus, appointmentId, user.uid];
  const result = await db.prepare(query).bind(...params).run();
  if (!result.meta.changes)
    return Response.json({ error: "این نوبت پیدا نشد یا اجازهٔ تغییر آن را ندارید." }, { status: 404 });

  return Response.json({ ok: true, appointment_id: appointmentId, attendance_status: attendanceStatus });
}
