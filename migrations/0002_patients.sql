-- مرحله ۲: بازسازی جدول بیماران با فیلدهای جدید
-- هشدار: جدول‌های بیمار، نوبت و تصاویر پاک و دوباره ساخته می‌شوند (فقط چون خالی بودند)
-- جدول users دست نمی‌خورد

DROP TABLE IF EXISTS patient_media;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS patients;

CREATE TABLE patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  daily_number INTEGER NOT NULL,          -- شماره پرونده روز (هر روز از ۱ شروع می‌شود)
  admission_date TEXT NOT NULL,           -- تاریخ پذیرش، به شکل YYYY-MM-DD
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,                    -- موبایل (برای پیامک)
  landline TEXT,                          -- شماره ثابت
  father_name TEXT,
  age INTEGER,
  job TEXT,
  marital_status TEXT,
  residence_area TEXT,                    -- محدوده محل سکونت
  surgery_type TEXT,                      -- نوع جراحی
  referral_source TEXT,                   -- نحوه آشنایی
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (admission_date, daily_number)
);

CREATE INDEX idx_patients_name ON patients(last_name, first_name);
CREATE INDEX idx_patients_phone ON patients(phone);

CREATE TABLE appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER,
  type TEXT CHECK(type IN ('consultation', 'surgery')) NOT NULL,
  appointment_date DATETIME NOT NULL,
  status TEXT DEFAULT 'pending',
  description TEXT,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE TABLE patient_media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER,
  image_url TEXT NOT NULL,
  image_type TEXT CHECK(image_type IN ('before', 'after')) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);