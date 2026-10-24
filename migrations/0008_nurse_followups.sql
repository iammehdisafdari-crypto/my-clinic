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
