import { requireRole } from "@/lib/permissions";
import { getDB } from "@/lib/db";
import StatCard from "../StatCard";

export const runtime = "edge";

const fa = (n: unknown) => Number(n ?? 0).toLocaleString("fa-IR");

export default async function ManagerDashboard() {
  await requireRole(["manager", "doctor", "admin"]);

  const now = new Date();
  const today = now.toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });
  const dateFa = now.toLocaleDateString("fa-IR", {
    timeZone: "Asia/Tehran",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let s = { patients_today: 0, waiting: 0, done: 0 };

  try {
    const db = getDB();
    if (db && typeof db.prepare === "function") {
      const res = await db
        .prepare(
          `SELECT
             (SELECT COUNT(*) FROM patients WHERE admission_date = ?1) AS patients_today,
             (SELECT COUNT(*) FROM visits WHERE visit_date = ?1 AND status = 'referred') AS waiting,
             (SELECT COUNT(*) FROM visits WHERE visit_date = ?1 AND status = 'completed') AS done`
        )
        .bind(today)
        .first();

      if (res) {
        s = res as { patients_today: number; waiting: number; done: number };
      }
    }
  } catch (err) {
    console.error("D1 Dashboard query error:", err);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">خلاصه‌ی امروز</h1>
        <p className="text-sm text-gray-500 mt-1">{dateFa}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          href="/dashboard/visits"
          title="در انتظار دکتر"
          value={fa(s?.waiting)}
          hint="بیمارهای ارجاع‌شده که هنوز ویزیت نشده‌اند. برای دیدن لیست بزنید."
          accent={(s?.waiting ?? 0) > 0}
        />
        <StatCard
          href="/dashboard/visits"
          title="ویزیت‌های تکمیل‌شده امروز"
          value={fa(s?.done)}
          hint="ویزیت‌هایی که دکتر فرم‌شان را ثبت کرده است."
        />
        <StatCard
          href="/dashboard/patients"
          title="بیماران ثبت‌شده امروز"
          value={fa(s?.patients_today)}
          hint="بیمارهایی که امروز ثبت شده‌اند. برای جستجو و ثبت بزنید."
        />
      </div>
    </div>
  );
}