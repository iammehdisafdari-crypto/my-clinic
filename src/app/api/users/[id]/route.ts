import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { hashPassword } from "@/lib/crypto";
import { canManageRole } from "@/lib/roles";

export const runtime = "edge";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireRole(["manager", "doctor"]);
    const { id } = await params;
    const body = await req.json();
    const { username, display_name, role, new_password } = body;

    const db = getDB();

    const targetUser = (await db
      .prepare("SELECT id, username, role FROM users WHERE id = ?1")
      .bind(id)
      .first()) as { id: number; username: string; role: string } | null;

    if (!targetUser) {
      return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
    }

    if (String(targetUser.id) === String(currentUser.id)) {
      return NextResponse.json({ error: "امکان ویرایش حساب کاربری خودتان را ندارید" }, { status: 403 });
    }

    // پزشک حق ویرایش اکانت خود را تحت هیچ شرایطی ندارد
    if (
      currentUser?.role === "doctor" &&
      (targetUser.username === currentUser.username || String(targetUser.id) === String(currentUser.id))
    ) {
      return NextResponse.json({ error: "پزشک اجازه ویرایش حساب کاربری خود را ندارد" }, { status: 403 });
    }

    if (!currentUser || !canManageRole(currentUser.role, targetUser.role)) {
      return NextResponse.json({ error: "شما اجازه ویرایش این کاربر را ندارید" }, { status: 403 });
    }

    if (!canManageRole(currentUser.role, role)) {
      return NextResponse.json({ error: "نمی‌توانید نقشی هم‌سطح یا بالاتر از خودتان اعطا کنید" }, { status: 403 });
    }

    // بررسی تکراری نبودن نام کاربری در صورت تغییر
    const finalUsername = username ? username.trim() : targetUser.username;
    if (finalUsername !== targetUser.username) {
      const duplicate = await db
        .prepare("SELECT id FROM users WHERE username = ?1 AND id != ?2")
        .bind(finalUsername, id)
        .first();

      if (duplicate) {
        return NextResponse.json({ error: "این نام کاربری قبلاً برای کاربر دیگری ثبت شده است" }, { status: 400 });
      }
    }

    // بررسی و هش کردن رمز عبور جدید در صورت ارسال
    let passwordHash: string | null = null;
    if (new_password) {
      if (typeof new_password !== "string" || new_password.trim().length < 6) {
        return NextResponse.json({ error: "رمز عبور جدید باید حداقل ۶ کاراکتر باشد" }, { status: 400 });
      }
      passwordHash = await hashPassword(new_password.trim());
    }

    // اجرای کوئری به‌روزرسانی با شرط تغییر یا عدم تغییر رمز عبور
    if (passwordHash) {
      await db
        .prepare(
          "UPDATE users SET username = ?1, full_name = ?2, role = ?3, password_hash = ?4 WHERE id = ?5"
        )
        .bind(finalUsername, display_name, role, passwordHash, id)
        .run();
    } else {
      await db
        .prepare(
          "UPDATE users SET username = ?1, full_name = ?2, role = ?3 WHERE id = ?4"
        )
        .bind(finalUsername, display_name, role, id)
        .run();
    }

    return NextResponse.json({ success: true, message: "کاربر با موفقیت ویرایش شد" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطا در ویرایش" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireRole(["manager", "doctor"]);
    const { id } = await params;

    const db = getDB();

    const targetUser = (await db
      .prepare("SELECT id, username, role FROM users WHERE id = ?1")
      .bind(id)
      .first()) as { id: number; username: string; role: string } | null;

    if (!targetUser) {
      return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
    }

    if (String(targetUser.id) === String(currentUser.id)) {
      return NextResponse.json({ error: "امکان حذف حساب کاربری خودتان را ندارید" }, { status: 403 });
    }

    // پزشک حق حذف اکانت خود را تحت هیچ شرایطی ندارد
    if (
      currentUser?.role === "doctor" &&
      (targetUser.username === currentUser.username || String(targetUser.id) === String(currentUser.id))
    ) {
      return NextResponse.json({ error: "پزشک اجازه حذف حساب کاربری خود را ندارد" }, { status: 403 });
    }

    if (!currentUser || !canManageRole(currentUser.role, targetUser.role)) {
      return NextResponse.json({ error: "شما اجازه حذف این کاربر را ندارید" }, { status: 403 });
    }

    await db.prepare("DELETE FROM users WHERE id = ?1").bind(id).run();

    return NextResponse.json({ success: true, message: "کاربر با موفقیت حذف شد" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "خطا در حذف" }, { status: 500 });
  }
}

