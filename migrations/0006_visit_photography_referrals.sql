-- Add a separate photography handoff for completed doctor visits.
-- Keep appointment-based referrals intact and preserve all existing media.

CREATE TABLE IF NOT EXISTS visit_photography_referrals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visit_id INTEGER NOT NULL UNIQUE REFERENCES visits(id) ON DELETE CASCADE,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  referred_by INTEGER NOT NULL REFERENCES users(id),
  referred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed')),
  completed_by INTEGER REFERENCES users(id),
  completed_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_visit_photography_referrals_status
  ON visit_photography_referrals(status, referred_at);

ALTER TABLE patient_media
  ADD COLUMN visit_photography_referral_id INTEGER REFERENCES visit_photography_referrals(id);

CREATE INDEX IF NOT EXISTS idx_patient_media_visit_photography_referral
  ON patient_media(visit_photography_referral_id);
