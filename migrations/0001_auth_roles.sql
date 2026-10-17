-- مرحله ۱: جدول کاربران جدید با هش رمز و نقش‌های کامل
-- نقش‌ها: manager=مدیر، doctor=دکتر، scheduler=منشی، visitor=ویزیتور/بازاریاب، uploader=عکاس، nurse=پرستار
-- هشدار: جدول قدیمی users پاک می‌شود (رمزها متن ساده بودند و قابل نگه‌داشتن نیستند)
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('manager','doctor','scheduler','visitor','uploader','nurse')),
  active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
