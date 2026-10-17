-- مرحله ۳: ویزیت‌ها (ارجاع منشی، فرم دکتر، تکمیل منشی)
-- این فایل چیزی را پاک نمی‌کند، فقط یک جدول جدید می‌سازد

CREATE TABLE visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  visit_date TEXT NOT NULL,                -- تاریخ ویزیت، YYYY-MM-DD
  status TEXT NOT NULL DEFAULT 'referred'
    CHECK(status IN ('referred', 'completed')),

  -- ارجاع توسط منشی
  referred_by INTEGER REFERENCES users(id),
  referred_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- بخش دکتر
  doctor_id INTEGER REFERENCES users(id),
  surgeon_name TEXT,                       -- نام جراح
  surgery_cost INTEGER,                    -- هزینه جراحی (تومان)
  history TEXT,                            -- سوابق (JSON)
  completed_at DATETIME,

  -- بخش منشی بعد از دکتر
  surgery_date TEXT,                       -- تاریخ جراحی
  reservation_fee INTEGER,                 -- هزینه رزرو (تومان)
  photography_fee INTEGER,                 -- هزینه فتوگرافی پزشکی (تومان)
  updated_by INTEGER REFERENCES users(id),
  updated_at DATETIME
);

CREATE INDEX idx_visits_date_status ON visits(visit_date, status);
CREATE INDEX idx_visits_patient ON visits(patient_id);