const FA = "۰۱۲۳۴۵۶۷۸۹";
const AR = "٠١٢٣٤٥٦٧٨٩";

// ارقام فارسی و عربی را به انگلیسی تبدیل می‌کند
export function toEnDigits(s: string) {
  return s
    .replace(/[۰-۹]/g, (d) => String(FA.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR.indexOf(d)));
}

// «ي» و «ك» عربی را فارسی می‌کند و فاصله‌های اضافه را حذف می‌کند
export function normText(s: unknown) {
  return String(s ?? "")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\s+/g, " ")
    .trim();
}