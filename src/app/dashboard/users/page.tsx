import { requireRole } from "@/lib/permissions";
import { getDB } from "@/lib/db";
import { canManageRole } from "@/lib/roles";
import UserManagementClient from "./UserManagementClient";

export const runtime = "edge";

export default async function UsersPage() {
  const currentUser = await requireRole(["manager"]);

  const db = getDB();

  const { results: rawUsers } = await db
    .prepare(
      `SELECT
         id,
         username,
         COALESCE(NULLIF(full_name, ''), username) AS display_name,
         role,
         1 AS is_active
       FROM users
       ORDER BY id DESC`
    )
    .all();

  const users = ((rawUsers || []) as any[]).filter((u) =>
    canManageRole(currentUser?.role || "", u.role)
  );

  return (
    <UserManagementClient
      initialUsers={users}
      currentUserRole={currentUser?.role || "manager"}
    />
  );
}
