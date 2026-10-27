export const DB_ROLES = [
  "manager",
  "doctor",
  "scheduler",
  "nurse",
  "uploader",
  "visitor",
] as const;

export type DbRole = (typeof DB_ROLES)[number];

export const ROLE_HIERARCHY: Record<string, number> = {
  admin: 1,
  manager: 1,
  doctor: 2,
  scheduler: 3,
  nurse: 4,
  uploader: 5,
  photographer: 5, // نقش تاریخی معادل آپلودر برای سازگاری حساب‌های قدیمی
  visitor: 6,
  marketer: 6, // نقش تاریخی معادل ویزیتور برای سازگاری حساب‌های قدیمی
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "مدیر / ادمین",
  manager: "مدیر",
  doctor: "پزشک",
  scheduler: "منشی / پذیرش",
  nurse: "پرستار",
  uploader: "عکاس / آپلودر",
  visitor: "بازاریاب / ویزیتور",
  photographer: "عکاس",
  marketer: "بازاریاب",
};

export function isDbRole(role: string): role is DbRole {
  return (DB_ROLES as readonly string[]).includes(role);
}

export function canManageRole(currentRole: string, targetRole: string): boolean {
  const currentRank = ROLE_HIERARCHY[currentRole];
  const targetRank = ROLE_HIERARCHY[targetRole];
  return (
    typeof currentRank === "number" &&
    typeof targetRank === "number" &&
    currentRank < targetRank
  );
}
