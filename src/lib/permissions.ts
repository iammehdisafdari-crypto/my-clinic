import { redirect } from "next/navigation";
import { getSession } from "./session";
import type { SessionUser } from "./session";

export type Role = "admin" | "manager" | "doctor" | "surgery_tech" | "nurse" | "photographer" | "admission" | "accounting";

export const HOME_BY_ROLE: Record<string, string> = {
  admin: "/dashboard/manager",
  manager: "/dashboard/manager",
  doctor: "/dashboard/visits",
  surgery_tech: "/dashboard/surgery",
  nurse: "/dashboard/nurse",
  photographer: "/dashboard/photo",
  admission: "/dashboard/patients",
  accounting: "/dashboard/accounting",
};

// API permissions. Keep legacy role names during the role migration so existing
// accounts continue to work with the same access they had before.
const ACTION_ROLES: Record<string, string[]> = {
  "patients:read": ["admission", "nurse", "scheduler", "visitor", "uploader"],
  "patients:write": ["admission", "scheduler", "visitor"],
  "appointments:write": ["admission", "scheduler", "visitor"],
  "visits:refer": ["admission", "scheduler"],
  "visits:read": ["admission", "nurse", "scheduler"],
  "visits:doctor": ["doctor"],
  "surgeries:write": ["admission", "surgery_tech", "scheduler"],
  "photos:write": ["photographer", "uploader"],
  "photos:read": ["photographer", "uploader", "nurse"],
  "followups:write": ["nurse"],
  "users:manage": ["doctor"],
};

export function can(role: string, targetPath: string): boolean {
  if (["admin", "manager", "doctor"].includes(role)) return true;

  const actionRoles = ACTION_ROLES[targetPath];
  if (actionRoles) return actionRoles.includes(role);

  if (targetPath.startsWith("/dashboard/manager") || targetPath.startsWith("/dashboard/users")) {
    return role === "admin" || role === "manager";
  }
  if (targetPath.startsWith("/dashboard/visits")) {
    return ["admin", "manager", "doctor", "admission", "nurse"].includes(role);
  }
  if (targetPath.startsWith("/dashboard/surgery")) {
    return ["admin", "manager", "surgery_tech", "doctor"].includes(role);
  }
  if (targetPath.startsWith("/dashboard/nurse")) {
    return ["admin", "manager", "nurse", "doctor"].includes(role);
  }
  if (targetPath.startsWith("/dashboard/photo")) {
    return ["admin", "manager", "photographer"].includes(role);
  }
  if (targetPath.startsWith("/dashboard/patients")) {
    return ["admin", "manager", "admission", "nurse", "doctor"].includes(role);
  }
  if (targetPath.startsWith("/dashboard/accounting")) {
    return ["admin", "manager", "accounting"].includes(role);
  }
  return true;
}

export async function guard(
  action: string
): Promise<{ user: SessionUser; error?: undefined } | { user?: undefined; error: Response }> {
  const user = await getSession();
  if (!user) {
    return { error: Response.json({ error: "ابتدا وارد شوید" }, { status: 401 }) };
  }
  if (!can(user.role, action)) {
    return { error: Response.json({ error: "دسترسی ندارید" }, { status: 403 }) };
  }
  return { user };
}

export async function requireRole(allowedRoles: string[]) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (session.role === "admin" || session.role === "manager") {
    return session;
  }
  if (!allowedRoles.includes(session.role)) {
    const home = HOME_BY_ROLE[session.role] || "/dashboard";
    redirect(home);
  }
  return session;
}

