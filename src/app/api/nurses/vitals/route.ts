import { getDB } from "@/lib/db";
import { guard } from "@/lib/permissions";
import { normText, toEnDigits } from "@/lib/normalize";

export const runtime = "edge";

export async function GET(request: Request) {
  const { error } = await guard("visits:read");
  if (error) return error;

  const url = new URL(request.url);
  const patient_id = url.searchParams.get("patient_id");

  const db = getDB();
  let query = `SELECT v.*, u.name as nurse_name FROM vitals v LEFT JOIN users u ON u.id = v.nurse_id`;
  let params: any[] = [];

  if (patient_id) {
    query += ` WHERE v.patient_id = ?`;
    params.push(Number(patient_id));
  }

  query += ` ORDER BY v.id DESC LIMIT 50`;

  const { results } = await db.prepare(query).bind(...params).all();
  return Response.json(results);
}

export async function POST(request: Request) {
  const { user, error } = await guard("visits:write");
  if (error) return error;

  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const patient_id = Number(b.patient_id);
  const blood_pressure = toEnDigits(normText(b.blood_pressure)) || null;
  const heart_rate = toEnDigits(normText(b.heart_rate)) || null;
  const temperature = toEnDigits(normText(b.temperature)) || null;
  const notes = normText(b.notes) || null;

  if (!Number.isInteger(patient_id) || patient_id <= 0)
    return Response.json({ error: "بیمار نامعتبر است" }, { status: 400 });

  const db = getDB();
  await db
    .prepare(
      `INSERT INTO vitals (patient_id, nurse_id, blood_pressure, heart_rate, temperature, notes)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(patient_id, user.uid, blood_pressure, heart_rate, temperature, notes)
    .run();

  return Response.json({ ok: true });
}