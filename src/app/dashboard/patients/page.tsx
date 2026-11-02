import { requireRole, can } from "@/lib/permissions";
import PatientsClient from "./PatientsClient";
import VisitorRegistrationForm from "../visitor/VisitorRegistrationForm";

export const runtime = "edge";

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireRole(["manager", "doctor", "scheduler", "visitor", "nurse", "uploader", "photographer"]);
  const { q } = await searchParams;
  const isVisitor = user.role === "visitor";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">بیماران</h1>
      {isVisitor && <VisitorRegistrationForm />}
      <PatientsClient
        key={q ?? ""}
        initialQ={q ?? ""}
        canWrite={!isVisitor && can(user.role, "patients:write")}
        canRefer={can(user.role, "visits:refer")}
      />
    </div>
  );
}
