import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { requireRole } from "@/lib/permissions";

export const runtime = "edge";

const ROLE_HIERARCHY: Record<string, number> = {
  manager: 1,      // ادمین
  doctor: 2,       // پزشک
  scheduler: 3,    // منشی
  nurse: 4,        // پرستار
  photographer: 5, // عکاس
  marketer: 6,     // بازاریاب
};

function canManageRole(currentUserRole: string, targetUserRole: string): boolean {
  const currentRank = ROLE_HIERARCHY[currentUserRole] ?? 99;
  const targetRank = ROLE_HIERARCHY[targetUserRole] ?? 99;
  return currentRank < targetRank;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireRole(["manager", "doctor"]);
    const { id } = await params;
    const body = await req.json();
    const { display_name, role } = body;

    const db = getDB();

    const targetUser = await db
      .prepare("SELECT id, username, role FROM users WHERE id = ?1")
      .bind(id)
      .first<{ id: number; username: string; role: string }>();

    if (!targetUser) {
      return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
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

    const currentRank = ROLE_HIERARCHY[currentUser.role] ?? 99;
    const newRoleRank = ROLE_HIERARCHY[role] ?? 99;
    if (newRoleRank <= currentRank) {
      return NextResponse.json({ error: "نمی‌توانید نقشی هم‌سطح یا بالاتر از خودتان اعطا کنید" }, { status: 403 });
    }

    await db
      .prepare("UPDATE users SET display_name = ?1, role = ?2 WHERE id = ?3")
      .bind(display_name, role, id)
      .run();

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

    const targetUser = await db
      .prepare("SELECT id, username, role FROM users WHERE id = ?1")
      .bind(id)
      .first<{ id: number; username: string; role: string }>();

    if (!targetUser) {
      return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
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