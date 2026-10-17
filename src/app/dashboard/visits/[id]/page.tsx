import Link from "next/link";
import { requireRole, can } from "@/lib/permissions";
import VisitDetail from "./VisitDetail";

export const runtime = "edge";

export default async function VisitPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["scheduler", "manager", "doctor"]);
  const { id } = await params;
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-black">پرونده ویزیت</h1>
        <Link href="/dashboard/visits" className="text-sm underline text-gray-500">
          بازگشت به لیست
        </Link>
      </div>
      <VisitDetail id={Number(id)} canDoctor={can(user.role, "visits:doctor")} />
    </div>
  );
}