-- مرحله ۳: پایهٔ ویزیت‌ها؛ ستون‌های تکمیلی گردش کار در مهاجرت 0005 افزوده می‌شوند.

CREATE TABLE visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  visit_date TEXT NOT NULL,                -- تاریخ ویزیت، YYYY-MM-DD
  status TEXT NOT NULL DEFAULT 'referred'
    CHECK(status IN ('referred', 'completed')),

  -- بخش دکتر
  doctor_id INTEGER REFERENCES users(id),
  surgeon_name TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_visits_date_status ON visits(visit_date, status);
CREATE INDEX idx_visits_patient ON visits(patient_id);
