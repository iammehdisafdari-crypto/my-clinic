import { requireRole, can } from "@/lib/permissions";
import PatientsClient from "./PatientsClient";
import LeadsClient from "./LeadsClient";

export const runtime = "edge";

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireRole(["manager", "doctor", "scheduler", "visitor", "nurse", "uploader", "photographer", "admission"]);
  const { q } = await searchParams;
  const canConvert = ["admin", "manager", "admission", "scheduler"].includes(user.role);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">بیماران و متقاضیان</h1>
      {canConvert && <LeadsClient />}
      <PatientsClient
        key={q ?? ""}
        initialQ={q ?? ""}
        canWrite={can(user.role, "patients:write")}
        canRefer={can(user.role, "visits:refer")}
      />
    </div>
  );
}
