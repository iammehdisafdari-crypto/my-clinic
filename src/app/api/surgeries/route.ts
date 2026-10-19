import { getDB, getEnv } from "@/lib/db";
import { guard } from "@/lib/permissions";
import { normText, toEnDigits } from "@/lib/normalize";

export const runtime = "edge";

function patientMessage(patient: { first_name: string; surgery_type: string | null }, date: string, time: string, hospital: string, address: string) {
  return `سلام ${patient.first_name} عزیز،\nنوبت جراحی شما (${patient.surgery_type || "عمل جراحی"}) برای تاریخ ${date} ساعت ${time} در بیمارستان «${hospital}» ثبت شد.\n\n📍 آدرس بیمارستان:\n${address || "-"}\n\nلطفاً ۲ ساعت پیش از ساعت اعلام‌شده در بیمارستان حضور داشته باشید.\nبا تشکر`;
}

function messageLinks(phone: string, message: string) {
  const normalizedPhone = toEnDigits(phone).replace(/\D/g, "").replace(/^0/, "98");
  return {
    whatsappUrl: `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`,
  };
}

export async function GET(request: Request) {
  const { error } = await guard("surgeries:write");
  if (error) return error;

  const url = new URL(request.url);
  const date = url.searchParams.get("date");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return Response.json({ error: "تاریخ نامعتبر است" }, { status: 400 });

  const db = getDB();
  const { results } = await db
    .prepare(
      `SELECT a.id, a.patient_id, a.appointment_date, a.appointment_time, a.status, a.hospital_name, a.hospital_address,
              p.daily_number, p.first_name, p.last_name, p.phone, p.surgery_type,
              r.id AS photography_referral_id, r.status AS photography_status, r.notified_channel AS photography_channel
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       LEFT JOIN photography_referrals r ON r.appointment_id = a.id
       WHERE a.appointment_date = ? AND a.type = 'surgery'
       ORDER BY a.appointment_time ASC`
    )
    .bind(date)
    .all();

  return Response.json(results.map((s: any) => ({
    ...s,
    patientMessageText: patientMessage(s, s.appointment_date, s.appointment_time, s.hospital_name, s.hospital_address),
    ...messageLinks(s.phone, patientMessage(s, s.appointment_date, s.appointment_time, s.hospital_name, s.hospital_address)),
  })));
}

export async function POST(request: Request) {
  const { user, error } = await guard("surgeries:write");
  if (error) return error;

  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const patient_id = Number(b.patient_id);
  const appointment_date = toEnDigits(normText(b.appointment_date));
  const appointment_time = toEnDigits(normText(b.appointment_time));
  const hospital_name = normText(b.hospital_name);
  const hospital_address = normText(b.hospital_address);
  const description = normText(b.description) || null;

  if (!Number.isInteger(patient_id) || patient_id <= 0)
    return Response.json({ error: "بیمار نامعتبر است" }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(appointment_date))
    return Response.json({ error: "تاریخ نامعتبر است" }, { status: 400 });
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(appointment_time))
    return Response.json({ error: "ساعت جراحی نامعتبر است" }, { status: 400 });
  if (!hospital_name)
    return Response.json({ error: "انتخاب بیمارستان الزامی است" }, { status: 400 });

  const db = getDB();
  const patient = (await db
    .prepare("SELECT first_name, last_name, phone, surgery_type FROM patients WHERE id = ?")
    .bind(patient_id)
    .first()) as { first_name: string; last_name: string; phone: string; surgery_type: string | null } | null;
  if (!patient) return Response.json({ error: "بیمار پیدا نشد." }, { status: 404 });

  let res: any;
  try {
    res = await db
      .prepare(
        `INSERT INTO appointments (patient_id, type, appointment_date, appointment_time, hospital_name, hospital_address, description, created_by)
         VALUES (?, 'surgery', ?, ?, ?, ?, ?, ?)`
      )
      .bind(patient_id, appointment_date, appointment_time, hospital_name, hospital_address, description, user.uid)
      .run();
  } catch (insertError) {
    const details = insertError instanceof Error ? insertError.message : String(insertError);
    console.error("SURGERY_APPOINTMENT_INSERT_FAILED", details);
    if (/unique|constraint failed/i.test(details))
      return Response.json({ error: "این ساعت در اتاق عمل قبلاً رزرو شده است." }, { status: 409 });
    return Response.json({ error: "ثبت نوبت عمل در سامانه انجام نشد. دوباره تلاش کنید." }, { status: 500 });
  }

  const appointmentId = Number(res.meta.last_row_id);
  const notifMsg = `بیمار: ${patient.first_name} ${patient.last_name} | تاریخ: ${appointment_date} ساعت ${appointment_time} | بیمارستان: ${hospital_name}`;
  try {
    await db
      .prepare(
        `INSERT INTO notifications (user_id, title, message)
         SELECT id, ?, ? FROM users WHERE role IN ('manager', 'doctor') AND active = 1`
      )
      .bind("نوبت جراحی جدید ثبت شد", notifMsg)
      .run();
  } catch (notificationError) {
    console.error("SURGERY_APPOINTMENT_NOTIFICATION_FAILED", notificationError);
  }

  const env = getEnv();
  if (env.RESEND_API_KEY && env.MANAGER_EMAIL) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "Clinic System <onboarding@resend.dev>",
          to: [env.MANAGER_EMAIL],
          subject: `نوبت عمل جدید: ${patient.first_name} ${patient.last_name}`,
          html: `<div dir="rtl"><h2>رزرو نوبت اتاق عمل جدید</h2><p>${notifMsg}</p></div>`,
        }),
      });
    } catch (emailError) {
      console.error("SURGERY_APPOINTMENT_EMAIL_FAILED", emailError);
    }
  }

  // لینک‌ها پیام را برای بررسی آماده می‌کنند؛ منشی باید آن را در پیام‌رسان ارسال و تأیید کند.
  const patientMessageText = patientMessage(patient, appointment_date, appointment_time, hospital_name, hospital_address);
  return Response.json({
    ok: true,
    id: appointmentId,
    patientMessageText,
    ...messageLinks(patient.phone, patientMessageText),
  }, { status: 201 });
}
