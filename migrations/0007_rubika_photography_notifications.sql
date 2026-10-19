-- Allow the secretary to record Rubika as the channel used to notify a patient.
-- Preserve existing referral IDs and media references while widening the check.

PRAGMA defer_foreign_keys = ON;

CREATE TABLE photography_referrals_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  notified_channel TEXT NOT NULL CHECK(notified_channel IN ('whatsapp', 'telegram', 'rubika')),
  notified_by INTEGER NOT NULL REFERENCES users(id),
  referred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed')),
  completed_by INTEGER REFERENCES users(id),
  completed_at DATETIME
);

INSERT INTO photography_referrals_new (
  id, appointment_id, patient_id, notified_channel, notified_by,
  referred_at, status, completed_by, completed_at
)
SELECT
  id, appointment_id, patient_id, notified_channel, notified_by,
  referred_at, status, completed_by, completed_at
FROM photography_referrals;

DROP TABLE photography_referrals;
ALTER TABLE photography_referrals_new RENAME TO photography_referrals;

CREATE INDEX idx_photography_referrals_status
  ON photography_referrals(status, referred_at);

PRAGMA defer_foreign_keys = OFF;
