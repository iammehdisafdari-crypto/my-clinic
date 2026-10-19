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
    .prepare("SELECT id, image_url, image_type, created_at, photography_referral_id FROM patient_media WHERE patient_id = ? ORDER BY id DESC")
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
    const referralIdValue = formData.get("photography_referral_id");
    const referralId = referralIdValue === null ? null : Number(referralIdValue);

    if (!file) return Response.json({ error: "انتخاب فایل تصویر الزامی است" }, { status: 400 });
    if (image_type !== "before" && image_type !== "after" && image_type !== "current")
      return Response.json({ error: "نوع تصویر نامعتبر است" }, { status: 400 });
    if (referralId !== null && (!Number.isInteger(referralId) || referralId <= 0))
      return Response.json({ error: "ارجاع عکاسی نامعتبر است" }, { status: 400 });
    if (image_type === "current" && referralId !== null)
      return Response.json({ error: "عکس وضعیت فعلی را نمی‌توان برای ارجاع عکاسی ثبت کرد" }, { status: 400 });

    // تبدیل فایل به Base64 جهت ذخیره مستقیم و سریع در دیتابیس یا فضای ابری
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = `data:${file.type};base64,${buffer.toString("base64")}`;

    const db = getDB();
    const patient = await db.prepare("SELECT id FROM patients WHERE id = ?").bind(patientId).first();
    if (!patient) return Response.json({ error: "بیمار پیدا نشد" }, { status: 404 });

    if (referralId !== null) {
      const referral = await db
        .prepare("SELECT id FROM photography_referrals WHERE id = ? AND patient_id = ? AND status = 'pending'")
        .bind(referralId, patientId)
        .first();
      if (!referral) return Response.json({ error: "این ارجاع عکاسی فعال نیست یا به بیمار دیگری مربوط است" }, { status: 409 });
    }

    await db
      .prepare("INSERT INTO patient_media (patient_id, image_url, image_type, photography_referral_id) VALUES (?, ?, ?, ?)")
      .bind(patientId, base64Image, image_type, referralId)
      .run();

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: "خطا در پردازش تصویر" }, { status: 500 });
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  const { error } = await guard("photos:delete");
  if (error) return error;

  const patientId = Number((await ctx.params).id);
  const mediaId = Number(new URL(request.url).searchParams.get("media_id"));
  if (!Number.isInteger(patientId) || patientId <= 0 || !Number.isInteger(mediaId) || mediaId <= 0)
    return Response.json({ error: "شناسه تصویر یا بیمار نامعتبر است" }, { status: 400 });

  try {
    const result = await getDB()
      .prepare("DELETE FROM patient_media WHERE id = ? AND patient_id = ?")
      .bind(mediaId, patientId)
      .run();
    if (!result.meta.changes) return Response.json({ error: "تصویر پیدا نشد" }, { status: 404 });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("PATIENT_MEDIA_DELETE_ERROR:", err);
    return Response.json({ error: "حذف تصویر انجام نشد. دوباره تلاش کنید" }, { status: 500 });
  }
}
