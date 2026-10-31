import { guard } from "@/lib/permissions";

// In the clinic role model, doctors receive patient context through visits:doctor.
// Keep the general patient-read permission for admission, scheduler, nursing and visitor roles.
export async function guardPatientRead() {
  const patientAccess = await guard("patients:read");
  if (!patientAccess.error) return patientAccess;

  const doctorAccess = await guard("visits:doctor");
  if (!doctorAccess.error) return doctorAccess;

  return patientAccess;
}
