import { getDB } from "@/lib/db";
import { guard } from "@/lib/permissions";
import { normText } from "@/lib/normalize";

export const runtime = "edge";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { error } = await guard("patients:read");
  if (error) return error;

  const patientId = Number((await ctx.params).id);
  if (!Number.isInteger(patientId)) return Response.json({ error: "شناسه بیمار نامعتبر است" }, { status: 400 });

  const db = getDB();
  const { results } = await db
    .prepare("SELECT id, image_url, image_type, created_at FROM patient_media WHERE patient_id = ? ORDER BY id DESC")
    .bind(patientId)
    .all();

  return Response.json(results);
}

export async function POST(request: Request, ctx: Ctx) {
  const { error } = await guard("photos:write");
  if (error) return error;

  const patientId = Number((await ctx.params).id);
  if (!Number.isInteger(patientId)) return Response.json({ error: "شناسه بیمار نامعتبر است" }, { status: 400 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const image_type = normText(formData.get("image_type"));

    if (!file) return Response.json({ error: "انتخاب فایل تصویر الزامی است" }, { status: 400 });
    if (image_type !== "before" && image_type !== "after")
      return Response.json({ error: "نوع تصویر نامعتبر است" }, { status: 400 });

    // تبدیل فایل به Base64 جهت ذخیره مستقیم و سریع در دیتابیس یا فضای ابری
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = `data:${file.type};base64,${buffer.toString("base64")}`;

    const db = getDB();
    const patient = await db.prepare("SELECT id FROM patients WHERE id = ?").bind(patientId).first();
    if (!patient) return Response.json({ error: "بیمار پیدا نشد" }, { status: 404 });

    await db
      .prepare("INSERT INTO patient_media (patient_id, image_url, image_type) VALUES (?, ?, ?)")
      .bind(patientId, base64Image, image_type)
      .run();

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: "خطا در پردازش تصویر" }, { status: 500 });
  }
}