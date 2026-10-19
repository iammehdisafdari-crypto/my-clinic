import { getDB } from "@/lib/db";
import { guard } from "@/lib/permissions";

export const runtime = "edge";

export async function GET() {
  const { error } = await guard("photos:write");
  if (error) return error;

  try {
    const db = getDB();
    const [surgeryReferrals, visitReferrals] = await Promise.all([
      db
        .prepare(
          `SELECT r.id, r.appointment_id, r.patient_id, r.notified_channel, r.referred_at, r.status,
                a.appointment_date, a.appointment_time, a.hospital_name,
                p.daily_number, p.first_name, p.last_name, p.phone, p.surgery_type,
                (SELECT COUNT(*) FROM patient_media m
                 WHERE m.photography_referral_id = r.id) AS photo_count,
                'surgery' AS referral_kind, NULL AS visit_id
         FROM photography_referrals r
         JOIN appointments a ON a.id = r.appointment_id
         JOIN patients p ON p.id = r.patient_id
         WHERE r.status = 'pending'
         ORDER BY r.referred_at ASC, r.id ASC`
        )
        .all(),
      db
        .prepare(
          `SELECT r.id, NULL AS appointment_id, r.patient_id, NULL AS notified_channel, r.referred_at, r.status,
                v.visit_date AS appointment_date, NULL AS appointment_time, NULL AS hospital_name,
                p.daily_number, p.first_name, p.last_name, p.phone, p.surgery_type,
                (SELECT COUNT(*) FROM patient_media m
                 WHERE m.visit_photography_referral_id = r.id) AS photo_count,
                'visit' AS referral_kind, r.visit_id
         FROM visit_photography_referrals r
         JOIN visits v ON v.id = r.visit_id
         JOIN patients p ON p.id = r.patient_id
         WHERE r.status = 'pending'
         ORDER BY r.referred_at ASC, r.id ASC`
        )
        .all(),
    ]);

    const results = [...surgeryReferrals.results, ...visitReferrals.results].sort((a, b) => {
      const byDate = String(a.referred_at ?? "").localeCompare(String(b.referred_at ?? ""));
      if (byDate) return byDate;
      const byKind = String(a.referral_kind).localeCompare(String(b.referral_kind));
      return byKind || Number(a.id) - Number(b.id);
    });
    return Response.json(results);
  } catch (error) {
    console.error("PHOTOGRAPHY_REFERRALS_LIST_FAILED", error);
    return Response.json({ error: "دریافت ارجاع‌های عکاسی انجام نشد." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const visitId = Number(body.visit_id);
  if (Number.isInteger(visitId) && visitId > 0) {
    const { user, error } = await guard("visits:refer");
    if (error) return error;

    const db = getDB();
    try {
      const visit = (await db
        .prepare(
          `SELECT v.id, v.patient_id, v.status, p.daily_number, p.first_name, p.last_name
           FROM visits v JOIN patients p ON p.id = v.patient_id WHERE v.id = ?`
        )
        .bind(visitId)
        .first()) as { id: number; patient_id: number; status: string; daily_number: number; first_name: string; last_name: string } | null;
      if (!visit) return Response.json({ error: "پرونده ویزیت پیدا نشد." }, { status: 404 });
      if (visit.status !== "completed")
        return Response.json({ error: "ابتدا باید پزشک ویزیت را تکمیل کند." }, { status: 409 });

      const existing = (await db
        .prepare("SELECT id, status FROM visit_photography_referrals WHERE visit_id = ?")
        .bind(visitId)
        .first()) as { id: number; status: string } | null;
      if (existing)
        return Response.json({ ok: true, id: existing.id, status: existing.status, already_exists: true });

      let inserted: any;
      try {
        inserted = await db
          .prepare("INSERT INTO visit_photography_referrals (visit_id, patient_id, referred_by) VALUES (?, ?, ?)")
          .bind(visitId, visit.patient_id, user.uid)
          .run();
      } catch (insertError) {
        const raced = (await db
          .prepare("SELECT id, status FROM visit_photography_referrals WHERE visit_id = ?")
          .bind(visitId)
          .first()) as { id: number; status: string } | null;
        if (raced)
          return Response.json({ ok: true, id: raced.id, status: raced.status, already_exists: true });
        throw insertError;
      }

      let notificationWarning: string | undefined;
      try {
        const notification = await db
          .prepare(
            `INSERT INTO notifications (user_id, title, message)
             SELECT id, ?, ? FROM users WHERE role IN ('uploader', 'photographer') AND active = 1`
          )
          .bind(
            "پروندهٔ جدید برای عکاسی",
            `پرونده ${visit.daily_number} — ${visit.first_name} ${visit.last_name} پس از ویزیت پزشک برای عکاسی ارجاع شد.`
          )
          .run();
        if (!Number(notification.meta.changes || 0)) notificationWarning = "ارجاع ثبت شد، اما عکاس فعالی برای دریافت اعلان پیدا نشد.";
      } catch (notificationError) {
        console.error("VISIT_PHOTOGRAPHY_REFERRAL_NOTIFICATION_FAILED", notificationError);
        notificationWarning = "ارجاع در صف عکاسی ثبت شد، اما اعلان داخلی ارسال نشد.";
      }

      return Response.json({ ok: true, id: Number(inserted.meta.last_row_id), status: "pending", notificationWarning }, { status: 201 });
    } catch (error) {
      console.error("VISIT_PHOTOGRAPHY_REFERRAL_CREATE_FAILED", error);
      return Response.json({ error: "ارجاع پرونده به عکاس ثبت نشد. دوباره تلاش کنید." }, { status: 500 });
    }
  }

  const { user, error } = await guard("surgeries:write");
  if (error) return error;

  const appointmentId = Number(body.appointment_id);
  const channel = body.channel;
  if (!Number.isInteger(appointmentId) || appointmentId <= 0)
    return Response.json({ error: "نوبت عمل نامعتبر است." }, { status: 400 });
  if (channel !== "whatsapp" && channel !== "telegram" && channel !== "rubika")
    return Response.json({ error: "روش اطلاع‌رسانی را انتخاب کنید." }, { status: 400 });
  if (body.confirmed_sent !== true)
    return Response.json({ error: "ابتدا ارسال پیام به بیمار را تأیید کنید." }, { status: 400 });

  const db = getDB();
  try {
    const appointment = (await db
      .prepare(
        `SELECT a.id, a.patient_id, a.type, p.daily_number, p.first_name, p.last_name
         FROM appointments a JOIN patients p ON p.id = a.patient_id
         WHERE a.id = ?`
      )
      .bind(appointmentId)
      .first()) as { id: number; patient_id: number; type: string; daily_number: number; first_name: string; last_name: string } | null;

    if (!appointment || appointment.type !== "surgery")
      return Response.json({ error: "نوبت عمل پیدا نشد." }, { status: 404 });

    const existing = (await db
      .prepare("SELECT id, status FROM photography_referrals WHERE appointment_id = ?")
      .bind(appointmentId)
      .first()) as { id: number; status: string } | null;
    if (existing)
      return Response.json({ ok: true, id: existing.id, already_exists: true, status: existing.status });

    let inserted: any;
    try {
      inserted = await db
        .prepare(
          `INSERT INTO photography_referrals (appointment_id, patient_id, notified_channel, notified_by)
           VALUES (?, ?, ?, ?)`
        )
        .bind(appointmentId, appointment.patient_id, channel, user.uid)
        .run();
    } catch (insertError) {
      const raced = (await db
        .prepare("SELECT id, status FROM photography_referrals WHERE appointment_id = ?")
        .bind(appointmentId)
        .first()) as { id: number; status: string } | null;
      if (raced) return Response.json({ ok: true, id: raced.id, already_exists: true, status: raced.status });
      throw insertError;
    }
    const referralId = Number(inserted.meta.last_row_id);

    let notifiedPhotographers = 0;
    let notificationWarning: string | undefined;
    try {
      const notification = await db
        .prepare(
          `INSERT INTO notifications (user_id, title, message)
           SELECT id, ?, ? FROM users
           WHERE role IN ('uploader', 'photographer') AND active = 1`
        )
        .bind(
          "ارجاع جدید برای عکاسی",
          `پرونده ${appointment.daily_number} — ${appointment.first_name} ${appointment.last_name}؛ پس از هماهنگی نوبت عمل، عکس بیمار را در پنل عکاسی ثبت کنید.`
        )
        .run();
      notifiedPhotographers = Number(notification.meta.changes || 0);
      if (notifiedPhotographers === 0) notificationWarning = "کار ثبت شد، اما عکاس فعالی برای دریافت اعلان پیدا نشد.";
    } catch (notificationError) {
      console.error("PHOTOGRAPHY_REFERRAL_NOTIFICATION_FAILED", notificationError);
      notificationWarning = "کار در صف عکاسی ثبت شد؛ اعلان داخلی ارسال نشد.";
    }

    return Response.json({ ok: true, id: referralId, notifiedPhotographers, notificationWarning }, { status: 201 });
  } catch (error) {
    console.error("PHOTOGRAPHY_REFERRAL_CREATE_FAILED", error);
    return Response.json({ error: "ارجاع به عکاس ثبت نشد. دوباره تلاش کنید." }, { status: 500 });
  }
}
