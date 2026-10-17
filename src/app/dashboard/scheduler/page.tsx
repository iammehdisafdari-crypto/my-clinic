import { requireRole } from "@/lib/permissions";
import { getDB } from "@/lib/db";
import StatCard from "../StatCard";
import { toJalaliDate, getTodayGregorian } from "@/lib/jalali";
import { Calendar } from "lucide-react";

export const runtime = "edge";

const fa = (n: unknown) => Number(n ?? 0).toLocaleString("fa-IR");

// تبدیل تاریخ روز به متن خوانای فارسی (مثال: ۲۶ مهر ۱۴۰۵)
function getFormattedJalaliHeader(gregorianDateStr: string): string {
  const parts = toJalaliDate(gregorianDateStr).split("/");
  if (parts.length !== 3) return toJalaliDate(gregorianDateStr);

  const months = [
    "فروردین", "اردیبهشت", "خرداد",
    "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر",
    "دی", "بهمن", "اسفند"
  ];

  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  return `${fa(day)} ${months[monthIdx] || ""} ${fa(year)}`;
}

const STEPS = [
  { n: "۱", title: "بیمار رسید", text: "اسمش را در «بیماران» جستجو کنید. اگر پرونده نداشت، ثبتش کنید." },
  { n: "۲", title: "نوبتش شد", text: "جلوی اسمش در «بیماران» روی «ارجاع به دکتر» بزنید." },
  {
    n: "۳",
    title: "دکتر ویزیت را تکمیل کرد",
    text: "از «ویزیت‌ها» پرونده را باز کنید و نتیجه را ببینید. (ثبت تاریخ جراحی و هزینه‌ها به‌زودی اضافه می‌شود.)",
  },
];

export default async function Page() {
  await requireRole(["scheduler", "manager", "doctor"]);

  const today = getTodayGregorian();
  const jalaliHeaderDate = getFormattedJalaliHeader(today);

  const s = (await getDB()
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM patients WHERE admission_date = ?1) AS patients_today,
         (SELECT COUNT(*) FROM visits WHERE visit_date = ?1 AND status = 'referred') AS waiting,
         (SELECT COUNT(*) FROM visits WHERE visit_date = ?1 AND status = 'completed') AS done`
    )
    .bind(today)
    .first()) as { patients_today: number; waiting: number; done: number } | null;

  return (
    <div className="space-y-8 font-sans">
      {/* هدر پنل منشی همراه با تاریخ شمسی */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-900">پنل منشی</h1>
          <p className="text-xs text-gray-400 mt-1">مدیریت مراجعات و پذیرش روزانه کلینیک</p>
        </div>

        <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-gray-100 shadow-sm self-start sm:self-auto">
          <Calendar size={18} className="text-brand-green" />
          <span className="text-sm font-bold text-gray-800">
            امروز: {jalaliHeaderDate}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard href="/dashboard/patients" title="بیماران ثبت‌شده امروز" value={fa(s?.patients_today)} hint="ثبت و جستجوی بیمار" />
        <StatCard
          href="/dashboard/visits"
          title="در انتظار دکتر"
          value={fa(s?.waiting)}
          hint="ارجاع‌شده‌هایی که هنوز ویزیت نشده‌اند"
          accent={(s?.waiting ?? 0) > 0}
        />
        <StatCard href="/dashboard/visits" title="تکمیل‌شده توسط دکتر" value={fa(s?.done)} hint="پرونده‌های آماده‌ی مشاهده" />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-black text-gray-900">روند کار شما</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((st) => (
            <div key={st.n} className="bg-white p-6 rounded-[2rem] shadow-sm">
              <p className="text-3xl font-black text-brand-green mb-2">{st.n}</p>
              <p className="font-bold mb-1 text-gray-900">{st.title}</p>
              <p className="text-sm text-gray-500 leading-relaxed">{st.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}