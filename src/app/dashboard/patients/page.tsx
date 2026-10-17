import { requireRole, can } from "@/lib/permissions";
import PatientsClient from "./PatientsClient";

export const runtime = "edge";

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireRole(["manager", "doctor", "scheduler", "visitor", "nurse", "uploader"]);
  const { q } = await searchParams;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">بیماران</h1>
      <PatientsClient
        key={q ?? ""}
        initialQ={q ?? ""}
        canWrite={can(user.role, "patients:write")}
        canRefer={can(user.role, "visits:refer")}
      />
    </div>
  );
}