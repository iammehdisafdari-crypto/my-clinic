import { requireRole } from "@/lib/permissions";
import VisitorClient from "./VisitorClient";

export const runtime = "edge";

export default async function VisitorDashboard() {
  const user = await requireRole(["visitor", "manager", "doctor"]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">پنل بازاریاب و ثبت مشاوره</h1>
        <p className="text-sm text-gray-500 mt-1">
          ثبت‌نام بیماران جدید و رزرو نوبت مشاوره بر اساس تقویم و ساعت‌های آزاد.
        </p>
      </div>
      <VisitorClient />
    </div>
  );
}