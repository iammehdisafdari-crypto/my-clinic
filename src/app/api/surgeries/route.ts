import { getDB, getEnv } from "@/lib/db";
import { guard } from "@/lib/permissions";
import { normText, toEnDigits } from "@/lib/normalize";

export const runtime = "edge";

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
      `SELECT a.id, a.patient_id, a.appointment_time, a.status, a.hospital_name, a.hospital_address,
              p.first_name, p.last_name, p.phone, p.surgery_type
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       WHERE a.appointment_date = ? AND a.type = 'surgery'
       ORDER BY a.appointment_time ASC`
    )
    .bind(date)
    .all();

  return Response.json(results);
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

  try {
    // ثبت نوبت در دیتابیس
    const res = await db
      .prepare(
        `INSERT INTO appointments (patient_id, type, appointment_date, appointment_time, hospital_name, hospital_address, description, created_by)
         VALUES (?, 'surgery', ?, ?, ?, ?, ?, ?)`
      )
      .bind(patient_id, appointment_date, appointment_time, hospital_name, hospital_address, description, user.uid)
      .run();

    // دریافت اطلاعات بیمار برای ساخت پیام‌ها
    const patient: any = await db
      .prepare("SELECT first_name, last_name, phone, surgery_type FROM patients WHERE id = ?")
      .bind(patient_id)
      .first();

    // ایجاد اعلان درون‌برنامه‌ای برای مدیران و دکترها
    const managersAndDoctors = await db
      .prepare("SELECT id FROM users WHERE role IN ('manager', 'doctor') AND active = 1")
      .all();

    const notifTitle = "نوبت جراحی جدید ثبت شد";
    const notifMsg = `بیمار: ${patient.first_name} ${patient.last_name} | تاریخ: ${appointment_date} ساعت ${appointment_time} | بیمارستان: ${hospital_name}`;

    for (const row of managersAndDoctors.results as any[]) {
      await db
        .prepare("INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)")
        .bind(row.id, notifTitle, notifMsg)
        .run();
    }

    // ارسال ایمیل در صورت تنظیم Resend API
    const env = getEnv();
    if (env.RESEND_API_KEY && env.MANAGER_EMAIL) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Clinic System <onboarding@resend.dev>",
            to: [env.MANAGER_EMAIL],
            subject: `نوبت عمل جدید: ${patient.first_name} ${patient.last_name}`,
            html: `<div dir="rtl"><h2>رزرو نوبت اتاق عمل جدید</h2><p>${notifMsg}</p></div>`,
          }),
        });
      } catch (err) {
        console.error("Email send failed", err);
      }
    }

    // ساخت متن آماده جهت ارسال پیام واتس‌اپ / تلگرام به بیمار
    const patientMessageText = `سلام ${patient.first_name} ${patient.last_name} عزیز،\nنوبت جراحی شما (${patient.surgery_type || 'عمل جراحی'}) برای تاریخ ${appointment_date} ساعت ${appointment_time} در بیمارستان "${hospital_name}" ثبت گردید.\n\n📍 آدرس بیمارستان:\n${hospital_address}\n\n⚠️ لطفاً حتماً ۲ ساعت پیش از ساعت اعلام‌شده برای انجام پذیرایی و تشریفات اولیه در بیمارستان حضور داشته باشید.\nبا تشکر`;

    const whatsappUrl = `https://wa.me/${patient.phone.replace(/^0/, "98")}?text=${encodeURIComponent(patientMessageText)}`;
    const telegramUrl = `https://t.me/share/url?url=&text=${encodeURIComponent(patientMessageText)}`;

    return Response.json({ 
      ok: true, 
      id: res.meta.last_row_id,
      patientMessageText,
      whatsappUrl,
      telegramUrl
    });
  } catch (err) {
    return Response.json({ error: "این ساعت در اتاق عمل قبلاً رزرو شده است." }, { status: 409 });
  }
}