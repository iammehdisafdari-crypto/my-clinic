-- Store nurse vital-sign entries in a managed, indexed D1 table.
CREATE TABLE IF NOT EXISTS vitals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  nurse_id INTEGER NOT NULL REFERENCES users(id),
  blood_pressure TEXT,
  heart_rate TEXT,
  temperature TEXT,
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vitals_patient_created
  ON vitals(patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vitals_nurse_created
  ON vitals(nurse_id, created_at DESC);
