export const ROLE_HIERARCHY: Record<string, number> = {
  manager: 1,      // ادمین (بالاترین سطح)
  doctor: 2,       // پزشک
  scheduler: 3,    // منشی / پذیرش
  nurse: 4,        // پرستار
  photographer: 5, // عکاس
  marketer: 6,     // بازاریاب
};

export const ROLE_LABELS: Record<string, string> = {
  manager: "مدیر / ادمین",
  doctor: "پزشک",
  scheduler: "منشی / پذیرش",
  nurse: "پرستار",
  photographer: "عکاس",
  marketer: "بازاریاب",
};

// کاربر جاری فقط می‌تواند نقش‌های با رتبه پایین‌تر از خود را ویرایش یا حذف کند
export function canManageRole(currentUserRole: string, targetUserRole: string): boolean {
  const currentRank = ROLE_HIERARCHY[currentUserRole] ?? 99;
  const targetRank = ROLE_HIERARCHY[targetUserRole] ?? 99;
  return currentRank < targetRank;
}