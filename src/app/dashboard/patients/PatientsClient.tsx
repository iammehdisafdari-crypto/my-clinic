"use client";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, Stethoscope, TriangleAlert, X } from "lucide-react";

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
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [referringId, setReferringId] = useState<number | null>(null);
  const [referFeedback, setReferFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function refer(p: Patient) {
    if (referringId !== null) return;
    setReferringId(p.id);
    setReferFeedback(null);
    try {
      const r = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: p.id }),
      });
      const data = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(data.error || "ارجاع بیمار انجام نشد. دوباره تلاش کنید.");
      setReferFeedback({ type: "success", text: `${p.first_name} ${p.last_name} به صف ویزیت امروز اضافه شد.` });
      setSelectedPatient(null);
    } catch (error) {
      setReferFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "ارتباط با سرور برقرار نشد. دوباره تلاش کنید.",
      });
    } finally {
      setReferringId(null);
    }
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
        {referFeedback && (
          <div
            role="status"
            className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
              referFeedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {referFeedback.type === "success" ? <CheckCircle2 size={20} className="mt-0.5 shrink-0" /> : <TriangleAlert size={20} className="mt-0.5 shrink-0" />}
            <span>{referFeedback.text}</span>
          </div>
        )}
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
                {canRefer && <th className="p-3 text-center">اقدام</th>}
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
                      <button
                        type="button"
                        onClick={() => {
                          setReferFeedback(null);
                          setSelectedPatient(p);
                        }}
                        disabled={referringId !== null}
                        aria-label={`ارجاع ${p.first_name} ${p.last_name} به پزشک`}
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800 transition-colors hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Stethoscope size={16} />
                        ارجاع به پزشک
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={canRefer ? 7 : 6} className="p-6 text-center text-sm text-gray-400">موردی پیدا نشد</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPatient && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && referringId === null) setSelectedPatient(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="referral-title"
            className="w-full max-w-md overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <Stethoscope size={22} />
                </span>
                <div>
                  <h2 id="referral-title" className="text-lg font-black text-gray-900">ارجاع به پزشک</h2>
                  <p className="mt-1 text-sm text-gray-500">بررسی بیمار پیش از ثبت در صف ویزیت</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="بستن پنجره"
                disabled={referringId !== null}
                onClick={() => setSelectedPatient(null)}
                className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-bold text-gray-500">بیمار انتخاب‌شده</p>
                <p className="mt-1 text-base font-black text-gray-900">
                  {selectedPatient.first_name} {selectedPatient.last_name}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">شماره پرونده امروز</p>
                    <p className="mt-1 font-bold text-gray-700">{selectedPatient.daily_number.toLocaleString("fa-IR")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">شماره تماس</p>
                    <p className="mt-1 font-bold text-gray-700" dir="ltr">{selectedPatient.phone || "-"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400">نوع جراحی</p>
                    <p className="mt-1 font-bold text-gray-700">{selectedPatient.surgery_type || "ثبت نشده"}</p>
                  </div>
                </div>
              </div>
              <p className="text-sm leading-6 text-gray-600">
                با تأیید، بیمار به صف ویزیت امروز اضافه می‌شود و برای پزشک قابل مشاهده خواهد بود.
              </p>
              {referFeedback?.type === "error" && (
                <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  <TriangleAlert size={18} className="mt-0.5 shrink-0" />
                  <span>{referFeedback.text}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50/70 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={referringId !== null}
                onClick={() => setSelectedPatient(null)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={referringId !== null}
                onClick={() => refer(selectedPatient)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-green/90 disabled:cursor-wait disabled:opacity-60"
              >
                {referringId === selectedPatient.id ? <LoaderCircle size={17} className="animate-spin" /> : <Stethoscope size={17} />}
                {referringId === selectedPatient.id ? "در حال ارجاع..." : "تأیید و ارجاع"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
