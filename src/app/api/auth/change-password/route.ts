import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { verifyOrigin } from "@/lib/security";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const originCheck = verifyOrigin(req);
  if (!originCheck.ok && originCheck.errorResponse) {
    return originCheck.errorResponse;
  }

  try {
    const session = await getSession();
    if (!session || !session.uid) {
      return NextResponse.json({ error: "ابتدا وارد حساب کاربری خود شوید" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { current_password, new_password } = body;

    if (!current_password || !new_password) {
      return NextResponse.json({ error: "رمز عبور فعلی و رمز عبور جدید الزامی هستند" }, { status: 400 });
    }

    if (typeof new_password !== "string" || new_password.length < 8) {
      return NextResponse.json({ error: "رمز عبور جدید باید حداقل ۸ کاراکتر باشد" }, { status: 400 });
    }

    const db = getDB();
    const user = (await db
      .prepare("SELECT id, password_hash FROM users WHERE id = ?1")
      .bind(session.uid)
      .first()) as { id: number; password_hash: string } | null;

    if (!user) {
      return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
    }

    // بررسی صحت رمز عبور فعلی
    const isValid = await verifyPassword(current_password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: "رمز عبور فعلی نادرست است" }, { status: 400 });
    }

    // تولید هش رمز عبور جدید و ذخیره در دیتابیس (بدون trim برای حفظ فواصل)
    const newHash = await hashPassword(new_password);
    await db
      .prepare("UPDATE users SET password_hash = ?1 WHERE id = ?2")
      .bind(newHash, session.uid)
      .run();

    return NextResponse.json({ success: true, message: "رمز عبور شما با موفقیت تغییر یافت" });
  } catch (error: unknown) {
    console.error("CHANGE_PASSWORD_ERROR:", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ error: "خطا در تغییر رمز عبور" }, { status: 500 });
  }
}
