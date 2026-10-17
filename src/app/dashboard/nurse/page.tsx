import { requireRole } from "@/lib/permissions";
import NurseClient from "./NurseClient";

export const runtime = "edge";

export default async function NursePage() {
  await requireRole(["nurse", "manager", "doctor"]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">پنل پرستاری و علائم حیاتی</h1>
        <p className="text-sm text-gray-500 mt-1">
          ثبت و بررسی علائم حیاتی و دستورات مراقبتی بیماران بستری یا پس از عمل.
        </p>
      </div>
      <NurseClient />
    </div>
  );
}