-- One-time, additive repair for the existing production D1 database.
-- Do NOT run `wrangler d1 migrations apply` for this repair: pending historical
-- migrations 0002/0004 drop and recreate tables.
-- This file assumes the inspected production tables are the legacy schemas and
-- that patients/appointments are empty, as confirmed before preparation.

ALTER TABLE patients ADD COLUMN daily_number INTEGER;
ALTER TABLE patients ADD COLUMN admission_date TEXT;
ALTER TABLE patients ADD COLUMN landline TEXT;
ALTER TABLE patients ADD COLUMN job TEXT;
ALTER TABLE patients ADD COLUMN residence_area TEXT;
ALTER TABLE patients ADD COLUMN surgery_type TEXT;
ALTER TABLE patients ADD COLUMN referral_source TEXT;
ALTER TABLE patients ADD COLUMN notes TEXT;
ALTER TABLE patients ADD COLUMN created_by INTEGER REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_daily_number
  ON patients(admission_date, daily_number);

ALTER TABLE appointments ADD COLUMN appointment_time TEXT;
ALTER TABLE appointments ADD COLUMN created_by INTEGER REFERENCES users(id);
ALTER TABLE appointments ADD COLUMN hospital_name TEXT;
ALTER TABLE appointments ADD COLUMN hospital_address TEXT;

CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date, type);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_time_type
  ON appointments(appointment_date, appointment_time, type);
