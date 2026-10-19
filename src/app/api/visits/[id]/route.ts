import { getDB } from "@/lib/db";
import { guard } from "@/lib/permissions";
import { normText, toEnDigits } from "@/lib/normalize";
import { HISTORY_QUESTIONS } from "@/lib/visit-options";

export const runtime = "edge";

type Ctx = { params: Promise<{ id: string }> };

// مبلغ: ارقام فارسی را قبول می‌کند، خالی = null، نامعتبر = "bad"
function money(v: unknown): number | null | "bad" {
  const s = toEnDigits(String(v ?? "")).replace(/[,،\s]/g, "");
  if (!s) return null;
  if (!/^\d{1,10}$/.test(s)) return "bad";
  return Number(s);
}

type Entry = { none: boolean; items: string[]; when: string; note: string };

// سوابق را تمیز می‌کند و مطمئن می‌شود به هر شش سؤال جواب داده شده
function cleanHistory(h: unknown): { data?: Record<string, Entry>; error?: string } {
  const src = (h && typeof h === "object" ? h : {}) as Record<string, any>;
  const data: Record<string, Entry> = {};
  for (const q of HISTORY_QUESTIONS) {
    const v = src[q.key] ?? {};
    const none = v.none === true;
    const items: string[] =
      none || !Array.isArray(v.items)
        ? []
        : v.items.slice(0, 20).map((s: unknown) => normText(s).slice(0, 40)).filter(Boolean);
    if (!none && items.length === 0) return { error: `به سؤال «${q.title}» پاسخ داده نشده` };
    data[q.key] = {
      none,
      items,
      when: none || !q.hasWhen ? "" : normText(v.when).slice(0, 40),
      note: normText(v.note).slice(0, 30),
    };
  }
  return { data };
}

// جزئیات یک ویزیت + اطلاعات بیمار + لیست جراح‌ها
export async function GET(_req: Request, ctx: Ctx) {
  const { error } = await guard("visits:read");
  if (error) return error;

  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return Response.json({ error: "نامعتبر" }, { status: 400 });

  const db = getDB();
  const visit = await db
    .prepare(
      `SELECT v.*, p.daily_number, p.admission_date, p.first_name, p.last_name, p.phone, p.landline,
              p.father_name, p.age, p.job, p.marital_status, p.residence_area, p.surgery_type,
              p.referral_source, p.notes AS patient_notes
       FROM visits v JOIN patients p ON p.id = v.patient_id WHERE v.id = ?`
    )
    .bind(id)
    .first();
  if (!visit) return Response.json({ error: "ویزیت پیدا نشد" }, { status: 404 });

  const { results } = await db
    .prepare("SELECT full_name FROM users WHERE role = 'doctor' AND active = 1 ORDER BY full_name")
    .all();

  let history = null;
  try {
    history = visit.history ? JSON.parse(visit.history) : null;
  } catch {}

  return Response.json({
    visit: { ...visit, history },
    surgeons: results.map((r: any) => r.full_name),
  });
}

// part = "doctor": فرم دکتر | part = "secretary": تاریخ جراحی و هزینه‌ها
export async function PATCH(request: Request, ctx: Ctx) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return Response.json({ error: "نامعتبر" }, { status: 400 });
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const db = getDB();

  if (b.part === "doctor") {
    const { user, error } = await guard("visits:doctor");
    if (error) return error;

    const cost = money(b.surgery_cost);
    if (cost === "bad") return Response.json({ error: "هزینه جراحی نامعتبر است" }, { status: 400 });
    const h = cleanHistory(b.history);
    if (!h.data) return Response.json({ error: h.error }, { status: 400 });

    const before = (await db
      .prepare(
        `SELECT v.status, p.daily_number, p.first_name, p.last_name
         FROM visits v JOIN patients p ON p.id = v.patient_id WHERE v.id = ?`
      )
      .bind(id)
      .first()) as
      | { status: string; daily_number: number; first_name: string; last_name: string }
      | null;
    if (!before) return Response.json({ error: "ویزیت پیدا نشد" }, { status: 404 });

    const res = await db
      .prepare(
        `UPDATE visits
         SET surgeon_name = ?, surgery_cost = ?, history = ?, status = 'completed',
             doctor_id = ?, completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)
         WHERE id = ?`
      )
      .bind(normText(b.surgeon_name).slice(0, 60) || null, cost, JSON.stringify(h.data), user.uid, id)
      .run();
    if (!res.meta.changes) return Response.json({ error: "ویزیت پیدا نشد" }, { status: 404 });

    if (before.status !== "completed") {
      try {
        await db
          .prepare(
            `INSERT INTO notifications (user_id, title, message)
             SELECT id, ?, ? FROM users WHERE role = 'scheduler' AND active = 1`
          )
          .bind(
            "ویزیت تکمیل شد؛ اقدام منشی لازم است",
            `پرونده ${before.daily_number} — ${before.first_name} ${before.last_name} توسط پزشک ویزیت شد و برای پیگیری منشی آماده است.`
          )
          .run();
      } catch (notificationError) {
        console.error("VISIT_COMPLETION_NOTIFICATION_FAILED", notificationError);
      }
    }
    return Response.json({ ok: true });
  }

  if (b.part === "secretary") {
    const { user, error } = await guard("surgeries:write");
    if (error) return error;

    const visit = await db.prepare("SELECT status FROM visits WHERE id = ?").bind(id).first();
    if (!visit) return Response.json({ error: "ویزیت پیدا نشد" }, { status: 404 });
    if (visit.status !== "completed")
      return Response.json({ error: "ابتدا باید دکتر ویزیت را تکمیل کند" }, { status: 409 });

    const date = toEnDigits(normText(b.surgery_date)).replace(/[-.]/g, "/");
    if (date && !/^14\d{2}\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])$/.test(date))
      return Response.json({ error: "تاریخ جراحی را شمسی و به شکل ۱۴۰۵/۰۸/۲۵ وارد کنید" }, { status: 400 });

    const reservation = money(b.reservation_fee);
    const photography = money(b.photography_fee);
    if (reservation === "bad" || photography === "bad")
      return Response.json({ error: "مبلغ نامعتبر است" }, { status: 400 });

    await db
      .prepare(
        `UPDATE visits
         SET surgery_date = ?, reservation_fee = ?, photography_fee = ?,
             updated_by = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .bind(date || null, reservation, photography, user.uid, id)
      .run();
    return Response.json({ ok: true });
  }

  return Response.json({ error: "نوع به‌روزرسانی نامعتبر است" }, { status: 400 });
}
