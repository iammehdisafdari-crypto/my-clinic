import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { can, HOME_BY_ROLE } from "@/lib/permissions";
import LogoutButton from "./LogoutButton";
import ChangePasswordModal from "./ChangePasswordModal";
import Shell, { type NavLink } from "./Shell";

export const runtime = "edge";

const ROLE_LABELS: Record<string, string> = {
  manager: "مدیر",
  doctor: "دکتر",
  scheduler: "منشی",
  visitor: "بازاریاب",
  uploader: "عکاس",
  photographer: "عکاس",
  nurse: "پرستار",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");

  // تعریف تمام لینک‌های ممکن با ترتیب استاندارد سایدبار
  const allLinks: (NavLink & { show: boolean })[] = [
    { href: HOME_BY_ROLE[user.role] || "/dashboard", label: "صفحه اصلی", icon: "home", show: true },
    { href: "/dashboard/patients", label: "بیماران", icon: "patients", show: can(user.role, "patients:read") },
    { href: "/dashboard/visits", label: "ویزیت‌ها", icon: "visits", show: can(user.role, "visits:read") },
    { href: "/dashboard/scheduler/surgeries", label: "تقویم اتاق عمل", icon: "visits", show: user.role === "scheduler" || user.role === "manager" || user.role === "doctor" },
    { href: "/dashboard/nurse", label: "پنل پرستاری", icon: "visits", show: user.role === "nurse" || user.role === "manager" || user.role === "doctor" },
    { href: "/dashboard/uploader", label: "پنل عکاسی", icon: "patients", show: can(user.role, "photos:write") },
    { href: "/dashboard/users", label: "مدیریت کاربران", icon: "users", show: can(user.role, "users:manage") },
  ];

  // فیلتر کردن لینک‌های مجاز و حفظ ترتیب تعیین‌شده
  const uniqueLinks = Array.from(
    new Map(
      allLinks
        .filter((l) => l.show)
        .map((l) => [l.href, { href: l.href, label: l.label, icon: l.icon }])
    ).values()
  );

  const dateFa = new Date().toLocaleDateString("fa-IR", {
    timeZone: "Asia/Tehran",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Shell
      user={{ name: user.name, roleLabel: ROLE_LABELS[user.role] || user.role }}
      links={uniqueLinks}
      dateFa={dateFa}
      showSearch={can(user.role, "patients:read")}
      logout={
        <div className="grid grid-cols-2 gap-2 w-full">
          <ChangePasswordModal />
          <LogoutButton />
        </div>
      }
    >
      {children}
    </Shell>
  );
}
