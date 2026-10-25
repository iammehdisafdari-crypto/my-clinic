import { getDB } from "@/lib/db";
import { guard } from "@/lib/permissions";
import { normText, toEnDigits } from "@/lib/normalize";

export const runtime = "edge";

export async function GET(request: Request) {
  const { error } = await guard("visits:read");
  if (error) return error;

  const rawPatientId = new URL(request.url).searchParams.get("patient_id");
  const patientId = rawPatientId ? Number(rawPatientId) : null;
  if (rawPatientId && (!Number.isInteger(patientId) || Number(patientId) <= 0))
    return Response.json({ error: "شناسه بیمار نامعتبر است." }, { status: 400 });

  try {
    const db = getDB();
    const query = `SELECT v.id, v.patient_id, v.blood_pressure, v.heart_rate,
                           v.temperature, v.notes, v.created_at,
                           COALESCE(NULLIF(u.full_name, ''), u.username, 'پرستار') AS nurse_name
                    FROM vitals v
                    LEFT JOIN users u ON u.id = v.nurse_id
                    ${patientId ? "WHERE v.patient_id = ?" : ""}
                    ORDER BY v.id DESC
                    LIMIT 100`;
    const statement = db.prepare(query);
    const { results } = patientId
      ? await statement.bind(patientId).all()
      : await statement.all();
    return Response.json(results, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    console.error("NURSE_VITALS_READ_FAILED", cause);
    return Response.json({ error: "دریافت سوابق علائم حیاتی انجام نشد." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { user, error } = await guard("vitals:write");
  if (error) return error;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const patientId = Number(body.patient_id);
  const bloodPressure = toEnDigits(normText(body.blood_pressure)) || null;
  const heartRate = toEnDigits(normText(body.heart_rate)) || null;
  const temperature = toEnDigits(normText(body.temperature)) || null;
  const notes = normText(body.notes) || null;

  if (!Number.isInteger(patientId) || patientId <= 0)
    return Response.json({ error: "بیمار انتخاب‌شده معتبر نیست." }, { status: 400 });
  if (!bloodPressure && !heartRate && !temperature && !notes)
    return Response.json({ error: "حداقل یکی از علائم حیاتی یا یادداشت را وارد کنید." }, { status: 400 });

  try {
    const db = getDB();
    const patient = await db.prepare("SELECT id FROM patients WHERE id = ?").bind(patientId).first();
    if (!patient) return Response.json({ error: "بیمار پیدا نشد." }, { status: 404 });

    const result = await db
      .prepare(
        `INSERT INTO vitals (patient_id, nurse_id, blood_pressure, heart_rate, temperature, notes)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(patientId, user.uid, bloodPressure, heartRate, temperature, notes)
      .run();

    return Response.json({ ok: true, id: Number(result.meta.last_row_id) }, { status: 201 });
  } catch (cause) {
    console.error("NURSE_VITALS_CREATE_FAILED", cause);
    return Response.json({ error: "ثبت علائم حیاتی انجام نشد. ساختار جدول D1 را بررسی و دوباره تلاش کنید." }, { status: 500 });
  }
}
