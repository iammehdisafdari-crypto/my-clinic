import { requireRole } from "@/lib/permissions";
import SchedulerSurgeriesClient from "./SchedulerSurgeriesClient";

export const runtime = "edge";

export default async function SchedulerSurgeriesPage() {
  await requireRole(["scheduler", "manager", "doctor"]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">تقویم و نوبت‌دهی اتاق عمل</h1>
        <p className="text-sm text-gray-500 mt-1">
          مدیریت زمان‌های جراحی، ثبت قطعی نوبت عمل و کنترل تداخل ساعات اتاق عمل.
        </p>
      </div>
      <SchedulerSurgeriesClient />
    </div>
  );
}