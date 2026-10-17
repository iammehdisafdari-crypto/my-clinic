import * as jalaali from "jalaali-js";

export function toJalaliDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const cleanDate = dateStr.trim().split(" ")[0];
    const parts = cleanDate.split(/[-/]/);
    if (parts.length !== 3) return dateStr;

    let y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);

    if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;

    if (y >= 1300 && y <= 1600) {
      return `${y}/${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}`;
    }

    if (y < 100) y += 2000;

    const j = jalaali.toJalaali(y, m, d);
    const timePart = dateStr.includes(" ") ? " " + dateStr.split(" ")[1].substring(0, 5) : "";
    return `${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")}${timePart}`;
  } catch {
    return dateStr;
  }
}

export function toGregorianDate(jalaliDateStr: string): string {
  if (!jalaliDateStr) return "";
  try {
    const clean = jalaliDateStr.trim().replace(/-/g, "/");
    const parts = clean.split("/");
    if (parts.length !== 3) return jalaliDateStr;

    let jy = parseInt(parts[0], 10);
    const jm = parseInt(parts[1], 10);
    const jd = parseInt(parts[2], 10);

    if (isNaN(jy) || isNaN(jm) || isNaN(jd)) return jalaliDateStr;

    if (jy >= 1900 && jy <= 2100) {
      return `${jy}-${String(jm).padStart(2, "0")}-${String(jd).padStart(2, "0")}`;
    }

    const g = jalaali.toGregorian(jy, jm, jd);
    return `${g.gy}-${String(g.gm).padStart(2, "0")}-${String(g.gd).padStart(2, "0")}`;
  } catch {
    return jalaliDateStr;
  }
}

export function getTodayJalali(): string {
  const formatter = new Intl.DateTimeFormat("fa-IR-u-nu-latn", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date()).replace(/-/g, "/");
}

export const getTodayJalaliInput = getTodayJalali;

export function getTodayGregorian(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });
}