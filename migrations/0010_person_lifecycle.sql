-- Additive person lifecycle and immutable appointment history.
-- Existing patient IDs, appointments, visits, media, and foreign keys remain intact.
ALTER TABLE patients ADD COLUMN lifecycle_stage TEXT NOT NULL DEFAULT 'patient'
  CHECK (lifecycle_stage IN ('lead', 'patient'));
ALTER TABLE patients ADD COLUMN profile_created_at DATETIME;
ALTER TABLE patients ADD COLUMN converted_at DATETIME;
ALTER TABLE patients ADD COLUMN updated_at DATETIME;
ALTER TABLE patients ADD COLUMN updated_by INTEGER REFERENCES users(id);

UPDATE patients
SET profile_created_at = COALESCE(profile_created_at, created_at, CURRENT_TIMESTAMP),
    converted_at = CASE WHEN lifecycle_stage = 'patient'
      THEN COALESCE(converted_at, created_at, CURRENT_TIMESTAMP) ELSE converted_at END;

CREATE INDEX IF NOT EXISTS idx_patients_lifecycle_stage ON patients(lifecycle_stage, id DESC);
CREATE INDEX IF NOT EXISTS idx_patients_profile_phone ON patients(phone);

CREATE TABLE IF NOT EXISTS patient_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL UNIQUE REFERENCES patients(id) ON DELETE RESTRICT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id)
);
INSERT OR IGNORE INTO patient_records (patient_id, created_at, created_by)
SELECT id, COALESCE(created_at, CURRENT_TIMESTAMP), created_by
FROM patients WHERE lifecycle_stage = 'patient';

CREATE TABLE IF NOT EXISTS person_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  changed_fields TEXT,
  performed_by INTEGER REFERENCES users(id),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_person_events_person ON person_events(person_id, id DESC);

CREATE TABLE IF NOT EXISTS appointment_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  old_date TEXT, old_time TEXT, new_date TEXT, new_time TEXT,
  old_status TEXT, new_status TEXT,
  old_attendance_status TEXT, new_attendance_status TEXT,
  reason TEXT,
  performed_by INTEGER REFERENCES users(id),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_appointment_events_appointment ON appointment_events(appointment_id, id DESC);

ALTER TABLE appointments ADD COLUMN updated_by INTEGER REFERENCES users(id);
ALTER TABLE appointments ADD COLUMN updated_at DATETIME;
ALTER TABLE appointments ADD COLUMN last_change_reason TEXT;

INSERT INTO appointment_events (
  appointment_id, event_type, new_date, new_time, new_status,
  new_attendance_status, performed_by, reason
)
SELECT a.id, 'legacy_imported', a.appointment_date, a.appointment_time,
       a.status, COALESCE(a.attendance_status, 'pending'), a.created_by,
       'Imported from existing appointment history'
FROM appointments a
WHERE NOT EXISTS (SELECT 1 FROM appointment_events e WHERE e.appointment_id = a.id);

CREATE TRIGGER IF NOT EXISTS trg_patients_insert_patient_record
AFTER INSERT ON patients WHEN NEW.lifecycle_stage = 'patient'
BEGIN
  INSERT OR IGNORE INTO patient_records (patient_id, created_at, created_by)
  VALUES (NEW.id, COALESCE(NEW.created_at, CURRENT_TIMESTAMP), NEW.created_by);
  INSERT INTO person_events (person_id, event_type, changed_fields, performed_by)
  VALUES (NEW.id, 'patient_profile_created', '', NEW.created_by);
END;

CREATE TRIGGER IF NOT EXISTS trg_patients_insert_lead_event
AFTER INSERT ON patients WHEN NEW.lifecycle_stage = 'lead'
BEGIN
  INSERT INTO person_events (person_id, event_type, changed_fields, performed_by)
  VALUES (NEW.id, 'lead_created', '', NEW.created_by);
END;

CREATE TRIGGER IF NOT EXISTS trg_patients_convert_to_patient
AFTER UPDATE OF lifecycle_stage ON patients
WHEN OLD.lifecycle_stage = 'lead' AND NEW.lifecycle_stage = 'patient'
BEGIN
  INSERT OR IGNORE INTO patient_records (patient_id, created_at, created_by)
  VALUES (NEW.id, CURRENT_TIMESTAMP, NEW.updated_by);
  INSERT INTO person_events (person_id, event_type, changed_fields, performed_by)
  VALUES (NEW.id, 'converted_to_patient', '', NEW.updated_by);
END;

CREATE TRIGGER IF NOT EXISTS trg_patients_profile_updated
AFTER UPDATE OF first_name, last_name, phone, landline, father_name, age, job,
  marital_status, residence_area, surgery_type, referral_source, notes ON patients
WHEN OLD.first_name IS NOT NEW.first_name OR OLD.last_name IS NOT NEW.last_name
  OR OLD.phone IS NOT NEW.phone OR OLD.landline IS NOT NEW.landline
  OR OLD.father_name IS NOT NEW.father_name OR OLD.age IS NOT NEW.age
  OR OLD.job IS NOT NEW.job OR OLD.marital_status IS NOT NEW.marital_status
  OR OLD.residence_area IS NOT NEW.residence_area OR OLD.surgery_type IS NOT NEW.surgery_type
  OR OLD.referral_source IS NOT NEW.referral_source OR OLD.notes IS NOT NEW.notes
BEGIN
  INSERT INTO person_events (person_id, event_type, changed_fields, performed_by)
  VALUES (
    NEW.id, 'profile_updated',
    rtrim(
      CASE WHEN OLD.first_name IS NOT NEW.first_name THEN 'first_name,' ELSE '' END ||
      CASE WHEN OLD.last_name IS NOT NEW.last_name THEN 'last_name,' ELSE '' END ||
      CASE WHEN OLD.phone IS NOT NEW.phone THEN 'phone,' ELSE '' END ||
      CASE WHEN OLD.landline IS NOT NEW.landline THEN 'landline,' ELSE '' END ||
      CASE WHEN OLD.father_name IS NOT NEW.father_name THEN 'father_name,' ELSE '' END ||
      CASE WHEN OLD.age IS NOT NEW.age THEN 'age,' ELSE '' END ||
      CASE WHEN OLD.job IS NOT NEW.job THEN 'job,' ELSE '' END ||
      CASE WHEN OLD.marital_status IS NOT NEW.marital_status THEN 'marital_status,' ELSE '' END ||
      CASE WHEN OLD.residence_area IS NOT NEW.residence_area THEN 'residence_area,' ELSE '' END ||
      CASE WHEN OLD.surgery_type IS NOT NEW.surgery_type THEN 'surgery_type,' ELSE '' END ||
      CASE WHEN OLD.referral_source IS NOT NEW.referral_source THEN 'referral_source,' ELSE '' END ||
      CASE WHEN OLD.notes IS NOT NEW.notes THEN 'notes,' ELSE '' END, ','
    ),
    NEW.updated_by
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_appointments_insert_event
AFTER INSERT ON appointments
BEGIN
  INSERT INTO appointment_events (
    appointment_id, event_type, new_date, new_time, new_status,
    new_attendance_status, performed_by
  )
  VALUES (NEW.id, 'created', NEW.appointment_date, NEW.appointment_time, NEW.status,
    COALESCE(NEW.attendance_status, 'pending'), NEW.created_by);
END;

CREATE TRIGGER IF NOT EXISTS trg_appointments_update_event
AFTER UPDATE ON appointments
WHEN OLD.appointment_date IS NOT NEW.appointment_date
  OR OLD.appointment_time IS NOT NEW.appointment_time
  OR OLD.status IS NOT NEW.status
  OR OLD.attendance_status IS NOT NEW.attendance_status
  OR OLD.description IS NOT NEW.description
BEGIN
  INSERT INTO appointment_events (
    appointment_id, event_type, old_date, old_time, new_date, new_time,
    old_status, new_status, old_attendance_status, new_attendance_status,
    reason, performed_by
  )
  VALUES (
    NEW.id,
    CASE
      WHEN OLD.appointment_date IS NOT NEW.appointment_date OR OLD.appointment_time IS NOT NEW.appointment_time THEN 'rescheduled'
      WHEN OLD.status IS NOT NEW.status THEN 'status_changed'
      WHEN OLD.attendance_status IS NOT NEW.attendance_status THEN 'attendance_changed'
      ELSE 'details_updated'
    END,
    OLD.appointment_date, OLD.appointment_time, NEW.appointment_date, NEW.appointment_time,
    OLD.status, NEW.status, OLD.attendance_status, NEW.attendance_status,
    NEW.last_change_reason, NEW.updated_by
  );
END;
