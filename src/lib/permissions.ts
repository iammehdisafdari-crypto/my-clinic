import { redirect } from "next/navigation";
import { getSession } from "./session";

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

export function can(role: string, targetPath: string): boolean {
  if (role === "admin" || role === "manager") return true;

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