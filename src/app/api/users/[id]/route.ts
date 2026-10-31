import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { guard } from "@/lib/permissions";
import { hashPassword } from "@/lib/crypto";
import { canManageRole, isDbRole, ROLE_HIERARCHY } from "@/lib/roles";

export const runtime = "edge";

type RouteParams = { params: Promise<{ id: string }> | { id: string } };

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { user: currentUser, error } = await guard("users:manage", req);
    if (error) return error;

    if (!currentUser || !["admin", "manager"].includes(currentUser.role)) {
      return NextResponse.json({ error: "ط¯ط³طھط±ط³غŒ ظ†ط¯ط§ط±غŒط¯" }, { status: 403 });
    }

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;
    if (!id || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) {
      return NextResponse.json({ error: "ط´ظ†ط§ط³ظ‡ ع©ط§ط±ط¨ط± ظ†ط§ظ…ط¹طھط¨ط± ط§ط³طھ" }, { status: 400 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "ظپط±ظ…طھ ط¯ط±ط®ظˆط§ط³طھ ظ†ط§ظ…ط¹طھط¨ط± ط§ط³طھ" }, { status: 400 });
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "ط¯ط§ط¯ظ‡â€Œظ‡ط§غŒ ظˆط±ظˆط¯غŒ ظ†ط§ظ…ط¹طھط¨ط± ط§ط³طھ" }, { status: 400 });
    }

    const { username, display_name, full_name, role, new_password } = body;

    // ط§ط¹طھط¨ط§ط±ط³ظ†ط¬غŒ ظ†ط§ظ… ع©ط§ط±ط¨ط±غŒ
    if (typeof username !== "string" || !username.trim()) {
      return NextResponse.json({ error: "ظ†ط§ظ… ع©ط§ط±ط¨ط±غŒ ظ†ط§ظ…ط¹طھط¨ط± ط§ط³طھ" }, { status: 400 });
    }
    const finalUsername = username.trim();

    // ط§ط¹طھط¨ط§ط±ط³ظ†ط¬غŒ ظ†ط§ظ… ظ†ظ…ط§غŒط´غŒ
    const rawDisplayName = display_name ?? full_name;
    if (typeof rawDisplayName !== "string" || !rawDisplayName.trim()) {
      return NextResponse.json({ error: "ظ†ط§ظ… ظˆ ظ†ط§ظ… ط®ط§ظ†ظˆط§ط¯ع¯غŒ ظ†ط§ظ…ط¹طھط¨ط± ط§ط³طھ" }, { status: 400 });
    }
    const finalDisplayName = rawDisplayName.trim();

    const db = getDB();

    const targetUser = (await db
      .prepare("SELECT id, username, role FROM users WHERE id = ?1")
      .bind(id)
      .first()) as { id: number; username: string; role: string } | null;

    if (!targetUser) {
      return NextResponse.json({ error: "ع©ط§ط±ط¨ط± غŒط§ظپطھ ظ†ط´ط¯" }, { status: 404 });
    }

    // طھط؛غŒغŒط± غŒط§ ظˆغŒط±ط§غŒط´ ط­ط³ط§ط¨ ع©ط§ط±ط¨ط±غŒ ط®ظˆط¯ ظ…ظ…ظ†ظˆط¹ ط§ط³طھ
    if (String(targetUser.id) === String(currentUser.id) || targetUser.username === currentUser.username) {
      return NextResponse.json(
        { error: "ط§ظ…ع©ط§ظ† طھط؛غŒغŒط± غŒط§ ظˆغŒط±ط§غŒط´ ط­ط³ط§ط¨ ع©ط§ط±ط¨ط±غŒ ط®ظˆط¯طھط§ظ† ط±ط§ ظ†ط¯ط§ط±غŒط¯" },
        { status: 403 }
      );
    }

    // ع©ط§ط±ط¨ط± ظپظ‚ط· ظ…غŒâ€Œطھظˆط§ظ†ط¯ ط­ط³ط§ط¨â€Œظ‡ط§غŒ ط¨ط§ ط³ط·ط­ ظ¾ط§غŒغŒظ†â€Œطھط± ط§ط² ط®ظˆط¯ ط±ط§ ظˆغŒط±ط§غŒط´ ع©ظ†ط¯ (طھط؛غŒغŒط± ط­ط³ط§ط¨ ظ‡ظ…â€Œط³ط·ط­ غŒط§ ط¨ط§ظ„ط§طھط± ظ…ظ…ظ†ظˆط¹ ط§ط³طھ)
    if (!canManageRole(currentUser.role, targetUser.role)) {
      return NextResponse.json(
        { error: "ط´ظ…ط§ ط§ط¬ط§ط²ظ‡ ظˆغŒط±ط§غŒط´ ط§غŒظ† ع©ط§ط±ط¨ط± ط±ط§ ظ†ط¯ط§ط±غŒط¯" },
        { status: 403 }
      );
    }

    // ط§ط¹طھط¨ط§ط±ط³ظ†ط¬غŒ ظ†ظ‚ط´ ط§ط±ط§ط¦ظ‡â€Œط´ط¯ظ‡
    if (
      typeof role !== "string" ||
      !Object.prototype.hasOwnProperty.call(ROLE_HIERARCHY, role)
    ) {
      return NextResponse.json({ error: "ظ†ظ‚ط´ ط§ط±ط§ط¦ظ‡â€Œط´ط¯ظ‡ ظ†ط§ظ…ط¹طھط¨ط± ط§ط³طھ" }, { status: 400 });
    }

    // ط§ع¯ط± ظ†ظ‚ط´ ط¯ط± ط­ط§ظ„ طھط؛غŒغŒط± ط§ط³طھطŒ ط¨ط§غŒط¯ ط¯ط± ط¯غŒطھط§ط¨غŒط³ ظ…ط¬ط§ط² ط¨ط§ط´ط¯ ظˆ ط±طھط¨ظ‡ ط¢ظ† ظ¾ط§غŒغŒظ†â€Œطھط± ط§ط² ع©ط§ط±ط¨ط± ط¬ط§ط±غŒ ط¨ط§ط´ط¯
    if (role !== targetUser.role) {
      if (!isDbRole(role)) {
        return NextResponse.json(
          { error: "ظ†ظ‚ط´ ط¬ط¯غŒط¯ ط§ط±ط§ط¦ظ‡â€Œط´ط¯ظ‡ ط¯ط± ط¯غŒطھط§ط¨غŒط³ ظ…ط¬ط§ط² ظ†غŒط³طھ" },
          { status: 400 }
        );
      }
      if (!canManageRole(currentUser.role, role)) {
        return NextResponse.json(
          { error: "ظ†ظ…غŒâ€Œطھظˆط§ظ†غŒط¯ ظ†ظ‚ط´غŒ ظ‡ظ…â€Œط³ط·ط­ غŒط§ ط¨ط§ظ„ط§طھط± ط§ط² ط®ظˆط¯طھط§ظ† ط§ط¹ط·ط§ ع©ظ†غŒط¯" },
          { status: 403 }
        );
      }
    }

    // ط§ط¹طھط¨ط§ط±ط³ظ†ط¬غŒ ط±ظ…ط² ط¹ط¨ظˆط± ط¬ط¯غŒط¯ ط¯ط± طµظˆط±طھ ط§ط±ط³ط§ظ„: ط­ط¯ط§ظ‚ظ„ غ¸ ع©ط§ط±ط§ع©طھط±طŒ ط¨ط¯ظˆظ† trim (ظپط§طµظ„ظ‡ ظ…ط¬ط§ط² ط§ط³طھ)
    let passwordHash: string | null = null;
    if (new_password !== undefined && new_password !== null && new_password !== "") {
      if (typeof new_password !== "string" || new_password.length < 8) {
        return NextResponse.json(
          { error: "ط±ظ…ط² ط¹ط¨ظˆط± ط¬ط¯غŒط¯ ط¨ط§غŒط¯ ط­ط¯ط§ظ‚ظ„ غ¸ ع©ط§ط±ط§ع©طھط± ط¨ط§ط´ط¯" },
          { status: 400 }
        );
      }
      passwordHash = await hashPassword(new_password);
    }

    // ط¨ط±ط±ط³غŒ طھع©ط±ط§ط±غŒ ظ†ط¨ظˆط¯ظ† ظ†ط§ظ… ع©ط§ط±ط¨ط±غŒ ط¯ط± طµظˆط±طھ طھط؛غŒغŒط±
    if (finalUsername !== targetUser.username) {
      const duplicate = await db
        .prepare("SELECT id FROM users WHERE username = ?1 AND id != ?2")
        .bind(finalUsername, id)
        .first();

      if (duplicate) {
        return NextResponse.json(
          { error: "ط§غŒظ† ظ†ط§ظ… ع©ط§ط±ط¨ط±غŒ ظ‚ط¨ظ„ط§ظ‹ ط¨ط±ط§غŒ ع©ط§ط±ط¨ط± ط¯غŒع¯ط±غŒ ط«ط¨طھ ط´ط¯ظ‡ ط§ط³طھ" },
          { status: 400 }
        );
      }
    }

    // ط§ط¬ط±ط§غŒ ع©ظˆط¦ط±غŒ ط¨ظ‡â€Œط±ظˆط²ط±ط³ط§ظ†غŒ (ط­ظپط¸ ظ†ظ‚ط´ ظپط¹ظ„غŒ ط¯ط± طµظˆط±طھ ط¹ط¯ظ… طھط؛غŒغŒط±طŒ غŒط§ ط«ط¨طھ ظ†ظ‚ط´ ظ…ط¹طھط¨ط± ط¬ط¯غŒط¯)
    if (passwordHash) {
      await db
        .prepare(
          "UPDATE users SET username = ?1, full_name = ?2, role = ?3, password_hash = ?4 WHERE id = ?5"
        )
        .bind(finalUsername, finalDisplayName, role, passwordHash, id)
        .run();
    } else {
      await db
        .prepare(
          "UPDATE users SET username = ?1, full_name = ?2, role = ?3 WHERE id = ?4"
        )
        .bind(finalUsername, finalDisplayName, role, id)
        .run();
    }

    return NextResponse.json({ success: true, message: "ع©ط§ط±ط¨ط± ط¨ط§ ظ…ظˆظپظ‚غŒطھ ظˆغŒط±ط§غŒط´ ط´ط¯" });
  } catch (error: unknown) {
    console.error("USER_UPDATE_ERROR:", error);
    return NextResponse.json({ error: "ط®ط·ط§ ط¯ط± ظˆغŒط±ط§غŒط´ ع©ط§ط±ط¨ط±" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { user: currentUser, error } = await guard("users:manage", req);
    if (error) return error;

    if (!currentUser || !["admin", "manager"].includes(currentUser.role)) {
      return NextResponse.json({ error: "ط¯ط³طھط±ط³غŒ ظ†ط¯ط§ط±غŒط¯" }, { status: 403 });
    }

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;
    if (!id || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) {
      return NextResponse.json({ error: "ط´ظ†ط§ط³ظ‡ ع©ط§ط±ط¨ط± ظ†ط§ظ…ط¹طھط¨ط± ط§ط³طھ" }, { status: 400 });
    }

    const db = getDB();

    const targetUser = (await db
      .prepare("SELECT id, username, role FROM users WHERE id = ?1")
      .bind(id)
      .first()) as { id: number; username: string; role: string } | null;

    if (!targetUser) {
      return NextResponse.json({ error: "ع©ط§ط±ط¨ط± غŒط§ظپطھ ظ†ط´ط¯" }, { status: 404 });
    }

    // ط­ط°ظپ ط­ط³ط§ط¨ ط®ظˆط¯ ظ…ظ…ظ†ظˆط¹ ط§ط³طھ
    if (String(targetUser.id) === String(currentUser.id) || targetUser.username === currentUser.username) {
      return NextResponse.json(
        { error: "ط§ظ…ع©ط§ظ† ط­ط°ظپ ط­ط³ط§ط¨ ع©ط§ط±ط¨ط±غŒ ط®ظˆط¯طھط§ظ† ط±ط§ ظ†ط¯ط§ط±غŒط¯" },
        { status: 403 }
      );
    }

    // ع©ط§ط±ط¨ط± ظپظ‚ط· ظ…غŒâ€Œطھظˆط§ظ†ط¯ ط­ط³ط§ط¨â€Œظ‡ط§غŒ ط¨ط§ ط³ط·ط­ ظ¾ط§غŒغŒظ†â€Œطھط± ط§ط² ط®ظˆط¯ ط±ط§ ط­ط°ظپ ع©ظ†ط¯ (ط­ط°ظپ ط­ط³ط§ط¨ ظ‡ظ…â€Œط³ط·ط­ غŒط§ ط¨ط§ظ„ط§طھط± ظ…ظ…ظ†ظˆط¹ ط§ط³طھ)
    if (!canManageRole(currentUser.role, targetUser.role)) {
      return NextResponse.json(
        { error: "ط´ظ…ط§ ط§ط¬ط§ط²ظ‡ ط­ط°ظپ ط§غŒظ† ع©ط§ط±ط¨ط± ط±ط§ ظ†ط¯ط§ط±غŒط¯" },
        { status: 403 }
      );
    }

    await db.prepare("DELETE FROM users WHERE id = ?1").bind(id).run();

    return NextResponse.json({ success: true, message: "ع©ط§ط±ط¨ط± ط¨ط§ ظ…ظˆظپظ‚غŒطھ ط­ط°ظپ ط´ط¯" });
  } catch (error: unknown) {
    console.error("USER_DELETE_ERROR:", error);
    return NextResponse.json({ error: "ط®ط·ط§ ط¯ط± ط­ط°ظپ ع©ط§ط±ط¨ط±" }, { status: 500 });
  }
}

