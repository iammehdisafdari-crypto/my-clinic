import { requireRole, can } from "@/lib/permissions";
import PatientsClient from "./PatientsClient";
import VisitorRegistrationForm from "../visitor/VisitorRegistrationForm";

export const runtime = "edge";

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireRole(["manager", "doctor", "scheduler", "visitor", "nurse", "admission", "uploader", "photographer"]);
  const { q } = await searchParams;
  const appointmentRoles = ["visitor", "admission", "scheduler", "nurse", "admin", "manager"];
  const usesAppointmentForm = appointmentRoles.includes(user.role);
  const canManageAllAppointments = user.role !== "visitor";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">بیماران</h1>
      {usesAppointmentForm && <VisitorRegistrationForm canManageAll={canManageAllAppointments} canDeleteAppointments={user.role === "admin" || user.role === "manager" || user.role === "visitor"} canShowDeleteOption={user.role === "admin" || user.role === "manager" || user.role === "visitor"} />}
      <PatientsClient
        key={q ?? ""}
        initialQ={q ?? ""}
        canWrite={!usesAppointmentForm && can(user.role, "patients:write")}
        canRefer={can(user.role, "visits:refer")}
        canViewRecord={["admin", "manager", "doctor", "admission"].includes(user.role)}
        canDeleteRecord={["admin", "manager"].includes(user.role)}
      />
    </div>
  );
}
