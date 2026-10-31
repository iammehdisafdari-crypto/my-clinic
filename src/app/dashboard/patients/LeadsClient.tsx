"use client";

import { useCallback, useEffect, useState } from "react";

type Lead = {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  surgery_type: string | null;
  referral_source: string | null;
};

export default function LeadsClient() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/people?stage=lead&q=" + encodeURIComponent(query));
    if (response.ok) setLeads(await response.json());
  }, [query]);

  useEffect(() => { load(); }, [load]);

  async function convert(id: number) {
    if (!window.confirm("پس از پذیرش، برای این شخص پرونده پزشکی تشکیل شود؟")) return;
    setBusyId(id);
    setMessage("");
    const response = await fetch("/api/people/" + id + "/convert", { method: "POST" });
    const data = await response.json().catch(() => ({}));
    setBusyId(null);
    if (!response.ok) {
      setMessage(data.error || "تبدیل متقاضی انجام نشد.");
      return;
    }
    setMessage("پرونده بیمار تشکیل شد. شماره پرونده: " + data.patient.daily_number);
    await load();
  }

  return (
    <section className="bg-white rounded-[2rem] shadow-sm p-6 space-y-4">
      <div>
        <h2 className="text-lg font-black">متقاضیان در انتظار پذیرش</h2>
        <p className="text-xs text-gray-500 mt-1">با پذیرش حضوری، پروفایل موجود به بیمار تبدیل می‌شود؛ سوابق نوبت‌ها و شناسه شخص تغییر نمی‌کند.</p>
      </div>
      <input className="border border-gray-200 rounded-xl p-3 w-full text-sm"
        placeholder="جستجو با نام یا موبایل..." value={query} onChange={(event) => setQuery(event.target.value)} />
      {message && <p role="status" className="text-sm text-emerald-800 bg-emerald-50 rounded-xl p-3">{message}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-right">
          <thead><tr className="text-gray-400 text-xs">
            <th className="p-3">نام</th><th className="p-3">موبایل</th><th className="p-3">نوع درخواست</th>
            <th className="p-3">منبع</th><th className="p-3">اقدام</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td className="p-3 font-bold text-sm">{lead.first_name} {lead.last_name}</td>
                <td className="p-3 text-sm" dir="ltr">{lead.phone}</td>
                <td className="p-3 text-sm">{lead.surgery_type || "-"}</td>
                <td className="p-3 text-sm">{lead.referral_source || "-"}</td>
                <td className="p-3">
                  <button type="button" disabled={busyId !== null} onClick={() => convert(lead.id)}
                    className="bg-emerald-800 text-white rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50">
                    {busyId === lead.id ? "در حال تشکیل پرونده..." : "تبدیل به بیمار"}
                  </button>
                </td>
              </tr>
            ))}
            {leads.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-sm text-gray-400">متقاضی در انتظار پذیرش پیدا نشد.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
