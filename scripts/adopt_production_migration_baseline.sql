-- Production D1 already contains its legacy application schema and patient data,
-- but its migration ledger is empty. Record those existing baseline migrations
-- so Wrangler never executes their destructive DROP/CREATE statements on live data.
-- Run only after reviewing the live schema and before applying migration 0005.
INSERT OR IGNORE INTO d1_migrations (name) VALUES
  ('0001_auth_roles.sql'),
  ('0002_patients.sql'),
  ('0003_visits.sql'),
  ('0004_appointments_schedule.sql');
