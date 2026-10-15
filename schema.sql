-- ۱. جدول کاربران (برای ورود ۴ نقشی که گفتید)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- در آینده هش می‌شود
    role TEXT CHECK(role IN ('visitor', 'scheduler', 'manager', 'uploader')) NOT NULL
);

-- ۲. جدول اطلاعات بیماران (دقیقاً فیلدهایی که خواستید)
CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    national_id TEXT UNIQUE NOT NULL,
    father_name TEXT,
    marital_status TEXT, -- تاهل
    gender TEXT,
    age INTEGER,
    referrer TEXT, -- نام معرف
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ۳. جدول نوبت‌ها (مشاوره و عمل جراحی)
CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER,
    type TEXT CHECK(type IN ('consultation', 'surgery')) NOT NULL,
    appointment_date DATETIME NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, confirmed, cancelled
    description TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- ۴. جدول تصاویر (برای نفر چهارم که عکس آپلود می‌کند)
CREATE TABLE IF NOT EXISTS patient_media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER,
    image_url TEXT NOT NULL,
    image_type TEXT CHECK(image_type IN ('before', 'after')) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id)
);