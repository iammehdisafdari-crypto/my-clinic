"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Row = {
  id: number;
  patient_id: number;
  status: "referred" | "completed";
  referred_at: string;
  first_name: string;
  last_name: string;
  age: number | null;
  surgery_type: string | null;
  daily_number: number;
};

// ساعت ارجاع به وقت تهران
function timeOf(s: string) {
  return new Date(s.replace(" ", "T") + "Z").toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tehran",
  });
}

export default function VisitsClient({ canDoctor }: { canDoctor: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/visits");
    if (r.ok) {
      setRows(await r.json());
      setErr("");
    } else {
      setErr("خطا در دریافت لیست");
    }
  }, []);

  // هر ۱۰ ثانیه لیست خودکار به‌روز می‌شود
  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  const waitingRows = rows.filter((r) => r.status === "referred");
  const queueNo = new Map(waitingRows.map((r, i) => [r.id, i + 1]));
  const next = waitingRows[0];

  return (
    <div className="bg-white rounded-[2rem] shadow-sm p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-6">
        <p className="text-sm">
          در انتظار دکتر: <b className="text-lg">{waitingRows.length.toLocaleString("fa-IR")}</b> نفر
        </p>
        {next && (
          <p className="text-sm">
            نفر بعدی: <b>{next.first_name} {next.last_name}</b>
          </p>
        )}
        <p className="text-xs text-gray-400">این لیست هر ۱۰ ثانیه خودکار به‌روز می‌شود.</p>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-right">
          <thead>
            <tr className="text-gray-400 text-sm">
              <th className="p-3">نوبت</th>
              <th className="p-3">ساعت ارجاع</th>
              <th className="p-3">شماره پرونده</th>
              <th className="p-3">نام</th>
              <th className="p-3">سن</th>
              <th className="p-3">نوع جراحی</th>
              <th className="p-3">وضعیت</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((r) => (
              <tr key={r.id} className={queueNo.get(r.id) === 1 ? "bg-yellow-50" : ""}>
                <td className="p-3 font-black">{queueNo.get(r.id)?.toLocaleString("fa-IR") ?? "-"}</td>
                <td className="p-3 text-sm">{timeOf(r.referred_at)}</td>
                <td className="p-3 font-bold">{r.daily_number}</td>
                <td className="p-3 font-bold">{r.first_name} {r.last_name}</td>
                <td className="p-3 text-sm">{r.age ?? "-"}</td>
                <td className="p-3 text-sm">{r.surgery_type || "-"}</td>
                <td className="p-3">
                  {r.status === "referred" ? (
                    <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold">در انتظار دکتر</span>
                  ) : (
                    <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-xs font-bold">تکمیل‌شده</span>
                  )}
                </td>
                <td className="p-3">
                  <Link
                    href={`/dashboard/visits/${r.id}`}
                    className={
                      r.status === "referred" && canDoctor
                        ? "bg-brand-green text-white px-4 py-2 rounded-full text-sm font-bold"
                        : "border border-gray-200 px-4 py-2 rounded-full text-sm"
                    }
                  >
                    {r.status === "referred"
                      ? canDoctor
                        ? "شروع ویزیت"
                        : "مشاهده"
                      : canDoctor
                      ? "مشاهده / ویرایش"
                      : "مشاهده پرونده"}
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-sm text-gray-400">
                  امروز هنوز ارجاعی ثبت نشده. منشی از صفحه‌ی «بیماران» جلوی اسم بیمار «ارجاع به دکتر» را می‌زند.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}