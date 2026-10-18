import { redirect } from "next/navigation";
import { getSession, SessionUser } from "./session";

const MAP: Record<string, string[]> = {
  "patients:read": ["scheduler", "visitor", "nurse", "uploader"],
  "patients:write": ["scheduler", "visitor"],
  "appointments:write": ["scheduler", "visitor"],
  "visits:refer": ["scheduler"],
  "visits:read": ["scheduler"],
  "visits:doctor": [],
  "surgeries:write": ["scheduler"],
  "photos:write": ["uploader"],
  "photos:read": ["uploader", "nurse"],
  "followups:write": ["nurse"],
  "users:manage": [],
};

export function can(role: string, action: string) {
  if (role === "manager" || role === "admin" || role === "doctor") return true;
  return (MAP[action] || []).includes(role);
}

export async function guard(
  action: string
): Promise<{ user: SessionUser; error?: undefined } | { user?: undefined; error: Response }> {
  const user = await getSession();
  if (!user)
    return { error: Response.json({ error: "ابتدا وارد شوید" }, { status: 401 }) };
  if (!can(user.role, action))
    return { error: Response.json({ error: "دسترسی ندارید" }, { status: 403 }) };
  return { user };
}

export async function requireRole(roles: string[]) {
  const user = await getSession();
  if (!user || (!roles.includes(user.role) && user.role !== "admin" && user.role !== "manager")) {
    redirect("/login");
  }
  return user;
}

export const HOME_BY_ROLE: Record<string, string> = {
  admin: "/dashboard/manager",
  manager: "/dashboard/manager",
  doctor: "/dashboard/manager",
  scheduler: "/dashboard/scheduler",
  visitor: "/dashboard/visitor",
  uploader: "/dashboard/uploader",
  nurse: "/dashboard/nurse",
};