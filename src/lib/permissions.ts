import { redirect } from "next/navigation";
import { getSession, SessionUser } from "./session";

// manager = مدیر | doctor = دکتر | scheduler = منشی | visitor = ویزیتور/بازاریاب
// uploader = عکاس | nurse = پرستار
// مدیر و دکتر به همه‌چیز دسترسی دارند؛ بقیه فقط به آنچه اینجا نوشته شده.
const MAP: Record<string, string[]> = {
  "patients:read": ["scheduler", "visitor", "nurse", "uploader"],
  "patients:write": ["scheduler", "visitor"],
  "appointments:write": ["scheduler", "visitor"],
  "visits:refer": ["scheduler"],
  "visits:read": ["scheduler"],
  "visits:doctor": [], // فقط دکتر/مدیر
  "surgeries:write": ["scheduler"],
  "photos:write": ["uploader"],
  "photos:read": ["uploader", "nurse"],
  "followups:write": ["nurse"],
  "users:manage": [], // پروفایل کارمندان: فقط دکتر/مدیر
};

export function can(role: string, action: string) {
  if (role === "manager" || role === "doctor") return true;
  return (MAP[action] || []).includes(role);
}

// استفاده در API:
//   const { user, error } = await guard("patients:write");
//   if (error) return error;
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

// استفاده در صفحه‌ها (server component): اگر نقش مجاز نبود به لاگین می‌فرستد
export async function requireRole(roles: string[]) {
  const user = await getSession();
  if (!user || !roles.includes(user.role)) redirect("/login");
  return user;
}

// صفحه اصلی هر نقش بعد از ورود
export const HOME_BY_ROLE: Record<string, string> = {
  manager: "/dashboard/manager",
  doctor: "/dashboard/manager",
  scheduler: "/dashboard/scheduler",
  visitor: "/dashboard/visitor",
  uploader: "/dashboard/uploader",
  nurse: "/dashboard/nurse",
};
