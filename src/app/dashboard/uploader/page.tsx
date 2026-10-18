import { requireRole } from "@/lib/permissions";
import UploaderClient from "./UploaderClient";

export const runtime = "edge";

export default async function UploaderPage() {
  await requireRole(["uploader", "photographer", "manager", "doctor"]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">پنل عکاسی پزشکی</h1>
        <p className="text-sm text-gray-500 mt-1">
          بارگذاری و مدیریت تصاویر قبل و بعد از عمل بیماران.
        </p>
      </div>
      <UploaderClient />
    </div>
  );
}
