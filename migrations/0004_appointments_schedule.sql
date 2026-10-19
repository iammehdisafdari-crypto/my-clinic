-- مرحله ۴: جدول پیشرفته نوبت‌دهی (مشاوره و جراحی)
DROP TABLE IF EXISTS appointments;

CREATE TABLE appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  type TEXT CHECK(type IN ('consultation', 'surgery')) NOT NULL, -- مشاوره (بازاریاب) یا جراحی (منشی)
  appointment_date TEXT NOT NULL,                               -- تاریخ YYYY-MM-DD
  appointment_time TEXT NOT NULL,                               -- ساعت HH:MM (مثلاً 10:30)
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  description TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  hospital_name TEXT,
  hospital_address TEXT,
  UNIQUE(appointment_date, appointment_time, type)              -- جلوگیری از تداخل زمان برای یک نوع نوبت
);

CREATE INDEX idx_appointments_date ON appointments(appointment_date, type);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
