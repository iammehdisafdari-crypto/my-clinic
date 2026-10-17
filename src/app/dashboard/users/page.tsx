import { requireRole } from "@/lib/permissions";
import { getDB } from "@/lib/db";
import UserManagementClient from "./UserManagementClient";

export const runtime = "edge";

export default async function UsersPage() {
  const currentUser = await requireRole(["manager", "doctor"]);

  const db = getDB();

  const { results: rawUsers } = await db
    .prepare(
      `SELECT 
         id, 
         username, 
         COALESCE(NULLIF(display_name, ''), username) AS display_name, 
         role, 
         1 AS is_active 
       FROM users 
       ORDER BY id DESC`
    )
    .all();

  let users = (rawUsers || []) as any[];

  // اگر کاربر جاری دکتر باشد:
  // هیچ کاربری با نقش "مدیر" (manager) یا "پزشک" (doctor) را نباید ببیند
  if (currentUser?.role === "doctor") {
    users = users.filter((u) => u.role !== "manager" && u.role !== "doctor");
  }

  return (
    <UserManagementClient 
      initialUsers={users} 
      currentUserRole={currentUser?.role || "doctor"} 
    />
  );
}