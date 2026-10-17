"use client";
import { useCallback, useEffect, useState } from "react";

type Patient = {
  id: number;
  daily_number: number;
  admission_date: string;
  first_name: string;
  last_name: string;
  phone: string;
  age: number | null;
  job: string | null;
  surgery_type: string | null;
};

const EMPTY = {
  first_name: "",
  last_name: "",
  phone: "",
  landline: "",
  father_name: "",
  age: "",
  job: "",
  marital_status: "",
  residence_area: "",
  surgery_type: "",
  referral_source: "",
  notes: "",
};

function toEn(s: string) {
  return s
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

  export default function PatientsClient({
  canWrite,
  canRefer,
  initialQ,
}: {
  canWrite: boolean;
  canRefer: boolean;
  initialQ: string;
}) {
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState("");
  const [dupes, setDupes] = useState<Patient[]>([]);
  const [q, setQ] = useState(initialQ);
  const [list, setList] = useState<Patient[]>([]);
  const [saving, setSaving] = useState(false);
  const [referMsg, setReferMsg] = useState("");

  async function refer(p: Patient) {
    setReferMsg("");
    const r = await fetch("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_id: p.id }),
    });
    const data = (await r.json()) as { error?: string };
    setReferMsg(r.ok ? `${p.first_name} ${p.last_name} به دکتر ارجاع شد` : data.error || "خطا");
  }

  const load = useCallback(async (query: string) => {
    const r = await fetch("/api/patients?q=" + encodeURIComponent(query));
    if (r.ok) setList(await r.json());
  }, []);

  // جستجو هنگام تایپ (با ۰.۳ ثانیه تاخیر)
  useEffect(() => {
    const t = setTimeout(() => load(q), 300);
    return () => clearTimeout(t);
  }, [q, load]);

  async function save(force: boolean) {
    setMsg("");

    // اگر این شماره موبایل قبلاً ثبت شده، اول هشدار می‌دهیم
    if (!force) {
      const phone = toEn(form.phone).replace(/\D/g, "");
      if (phone) {
        const r = await fetch("/api/patients?q=" + encodeURIComponent(phone));
        if (r.ok) {
          const found = ((await r.json()) as Patient[]).filter((p) => p.phone === phone);
          if (found.length) {
            setDupes(found);
            return;
          }
        }
      }
    }

    setSaving(true);
    const r = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = (await r.json()) as { error?: string; patient?: { daily_number: number } };
    setSaving(false);

    if (r.ok && data.patient) {
      setForm(EMPTY);
      setDupes([]);
      setMsg(`بیمار ثبت شد. شماره پرونده امروز: ${data.patient.daily_number}`);
      load(q);
    } else {
      setMsg(data.error || "خطا");
    }
  }

  const input = "border border-gray-200 rounded-xl p-3 w-full";
  const f = (k: keyof typeof EMPTY) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [k]: e.target.value }),
  });

  return (
    <div className="space-y-8">
      {canWrite && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save(false);
          }}
          className="bg-white p-6 rounded-[2rem] shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <h2 className="md:col-span-3 text-lg font-black">ثبت بیمار جدید</h2>
          <input className={input} placeholder="نام *" {...f("first_name")} />
          <input className={input} placeholder="نام خانوادگی *" {...f("last_name")} />
          <input className={input} placeholder="شماره موبایل *" {...f("phone")} />
          <input className={input} placeholder="شماره ثابت" {...f("landline")} />
          <input className={input} placeholder="نام پدر" {...f("father_name")} />
          <input className={input} placeholder="سن" {...f("age")} />
          <input className={input} placeholder="شغل" {...f("job")} />
          <select className={input} {...f("marital_status")}>
            <option value="">وضعیت تاهل</option>
            <option value="مجرد">مجرد</option>
            <option value="متاهل">متاهل</option>
          </select>
          <input className={input} placeholder="محدوده محل سکونت" {...f("residence_area")} />
          <input className={input} placeholder="نوع جراحی" {...f("surgery_type")} />
          <input className={input} placeholder="نحوه آشنایی" {...f("referral_source")} />
          <textarea className={input + " md:col-span-3"} rows={2} placeholder="توضیحات" {...f("notes")} />

          {dupes.length > 0 && (
            <div className="md:col-span-3 bg-yellow-50 border border-yellow-200 rounded-2xl p-4 space-y-3">
              <p className="font-bold text-sm">این شماره موبایل قبلاً ثبت شده:</p>
              {dupes.map((p) => (
                <p key={p.id} className="text-sm">
                  {p.first_name} {p.last_name} (پرونده شماره {p.daily_number}، تاریخ {p.admission_date})
                </p>
              ))}
              <div className="flex gap-3">
                <button type="button" onClick={() => save(true)} className="bg-brand-green text-white rounded-xl px-4 py-2 text-sm font-bold">
                  بیمار جدید است، ثبت کن
                </button>
                <button type="button" onClick={() => setDupes([])} className="border border-gray-300 rounded-xl px-4 py-2 text-sm">
                  انصراف
                </button>
              </div>
            </div>
          )}

          <button disabled={saving} className="bg-brand-green text-white rounded-xl p-3 font-bold md:col-span-1">
            {saving ? "در حال ثبت..." : "ثبت بیمار"}
          </button>
          {msg && <p className="md:col-span-3 text-sm text-gray-600">{msg}</p>}
                           {referMsg && <p className="text-sm text-gray-700">{referMsg}</p>}
        </form>
      )}

      <div className="bg-white rounded-[2rem] shadow-sm p-6 space-y-4">
        <input
          className={input}
          placeholder="جستجو با نام، نام خانوادگی یا شماره تلفن (خالی = بیماران امروز)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <p className="text-sm text-gray-400">{q ? "نتایج جستجو" : "بیماران امروز"}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="text-gray-400 text-sm">
                <th className="p-3">شماره پرونده</th>
                <th className="p-3">تاریخ پذیرش</th>
                <th className="p-3">نام</th>
                <th className="p-3">موبایل</th>
                <th className="p-3">سن</th>
                <th className="p-3">نوع جراحی</th>
                                {canRefer && <th className="p-3"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map((p) => (
                <tr key={p.id}>
                  <td className="p-3 font-bold">{p.daily_number}</td>
                  <td className="p-3 text-sm font-mono">{p.admission_date}</td>
                  <td className="p-3 font-bold">{p.first_name} {p.last_name}</td>
                  <td className="p-3 text-sm font-mono">{p.phone}</td>
                  <td className="p-3 text-sm">{p.age ?? "-"}</td>
                  <td className="p-3 text-sm">{p.surgery_type || "-"}</td>
                                    {canRefer && (
                    <td className="p-3">
                      <button onClick={() => refer(p)} className="text-sm underline">
                        ارجاع به دکتر
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-sm text-gray-400">موردی پیدا نشد</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}