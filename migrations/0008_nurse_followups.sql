-- Track the surgery appointment that led to a nurse follow-up and its attendance.
ALTER TABLE appointments
  ADD COLUMN related_surgery_appointment_id INTEGER REFERENCES appointments(id);

ALTER TABLE appointments
  ADD COLUMN attendance_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (attendance_status IN ('pending', 'attended', 'no_show'));

CREATE INDEX idx_appointments_related_surgery
  ON appointments(related_surgery_appointment_id);

CREATE INDEX idx_appointments_nurse_followups
  ON appointments(created_by, related_surgery_appointment_id, appointment_date);

-- Prevent concurrent staff members from assigning duplicate follow-ups for one surgery.
CREATE UNIQUE INDEX idx_unique_nurse_followup_per_surgery
  ON appointments(related_surgery_appointment_id)
  WHERE related_surgery_appointment_id IS NOT NULL
    AND type = 'consultation'
    AND status <> 'cancelled';
