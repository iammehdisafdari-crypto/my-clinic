-- Additive workflow support for in-app notifications and photography handoffs.
-- Existing appointments, visits, patients, and media are preserved.

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, id DESC);

CREATE TABLE IF NOT EXISTS photography_referrals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  notified_channel TEXT NOT NULL CHECK(notified_channel IN ('whatsapp', 'telegram')),
  notified_by INTEGER NOT NULL REFERENCES users(id),
  referred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed')),
  completed_by INTEGER REFERENCES users(id),
  completed_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_photography_referrals_status ON photography_referrals(status, referred_at);

-- Extend the base visits table without replacing existing patient history.
ALTER TABLE visits ADD COLUMN referred_by INTEGER REFERENCES users(id);
ALTER TABLE visits ADD COLUMN referred_at DATETIME;
ALTER TABLE visits ADD COLUMN surgery_cost INTEGER;
ALTER TABLE visits ADD COLUMN history TEXT;
ALTER TABLE visits ADD COLUMN completed_at DATETIME;
ALTER TABLE visits ADD COLUMN surgery_date TEXT;
ALTER TABLE visits ADD COLUMN reservation_fee INTEGER;
ALTER TABLE visits ADD COLUMN photography_fee INTEGER;
ALTER TABLE visits ADD COLUMN updated_by INTEGER REFERENCES users(id);
ALTER TABLE visits ADD COLUMN updated_at DATETIME;

CREATE INDEX IF NOT EXISTS idx_visits_date_status ON visits(visit_date, status);
CREATE INDEX IF NOT EXISTS idx_visits_patient ON visits(patient_id);

-- Preserve every existing image and ID while allowing nurse current photos
-- and associating newly captured photos with a specific referral.
CREATE TABLE patient_media_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER,
  image_url TEXT NOT NULL,
  image_type TEXT CHECK(image_type IN ('before', 'after', 'current')) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  photography_referral_id INTEGER REFERENCES photography_referrals(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

INSERT INTO patient_media_new (id, patient_id, image_url, image_type, created_at)
SELECT id, patient_id, image_url, image_type, created_at FROM patient_media;

DROP TABLE patient_media;
ALTER TABLE patient_media_new RENAME TO patient_media;

CREATE INDEX IF NOT EXISTS idx_patient_media_photography_referral ON patient_media(photography_referral_id);
