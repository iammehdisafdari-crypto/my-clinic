export const ROLE_HIERARCHY: Record<string, number> = {
  admin: 1,
  manager: 1,
  doctor: 2,
  scheduler: 3,
  nurse: 4,
  photographer: 5,
  marketer: 6,
  uploader: 7,
  visitor: 8,
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "مدیر / ادمین",
  manager: "مدیر / ادمین",
  doctor: "پزشک",
  scheduler: "منشی / پذیرش",
  nurse: "پرستار",
  photographer: "عکاس",
  marketer: "بازاریاب",
  uploader: "آپلودر",
  visitor: "ویزیتور",
};

export function canManageRole(currentRole: string, targetRole: string): boolean {
  const currentRank = ROLE_HIERARCHY[currentRole];
  const targetRank = ROLE_HIERARCHY[targetRole];
  return typeof currentRank === "number" && typeof targetRank === "number" && currentRank < targetRank;
}

