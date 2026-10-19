import { requireRole, can } from "@/lib/permissions";
import VisitsClient from "./VisitsClient";

export const runtime = "edge";

export default async function VisitsPage() {
  const user = await requireRole(["scheduler", "admission", "nurse", "manager", "doctor"]);
  const canDoctor = can(user.role, "visits:doctor");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">ویزیت‌های امروز</h1>
        <p className="text-sm text-gray-500 mt-1">
          {canDoctor
            ? "بیمارها به ترتیب نوبت ارجاع هستند. روی «شروع ویزیت» بزنید و فرم را تکمیل کنید."
            : user.role === "nurse"
            ? "مشاهدهٔ فهرست ارجاع‌ها و وضعیت ویزیت بیماران. جزئیات پرونده به‌صورت فقط‌خواندنی نمایش داده می‌شود."
            : "بیمارهایی که به دکتر ارجاع داده‌اید و وضعیت‌شان. وقتی «تکمیل‌شده» شد، پرونده را باز کنید."}
        </p>
      </div>
      <VisitsClient canDoctor={canDoctor} />
    </div>
  );
}
