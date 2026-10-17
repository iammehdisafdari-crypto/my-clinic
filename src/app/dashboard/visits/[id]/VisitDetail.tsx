"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HISTORY_QUESTIONS, WHEN_OPTIONS, NONE_LABEL, type HistoryKey } from "@/lib/visit-options";

type Entry = { none: boolean; items: string[]; when: string; note: string };
type History = Record<HistoryKey, Entry>;

type Visit = {
  id: number;
  status: "referred" | "completed";
  daily_number: number;
  first_name: string;
  last_name: string;
  phone: string;
  landline: string | null;
  father_name: string | null;
  age: number | null;
  job: string | null;
  marital_status: string | null;
  residence_area: string | null;
  surgery_type: string | null;
  referral_source: string | null;
  patient_notes: string | null;
  surgeon_name: string | null;
  surgery_cost: number | null;
  history: Partial<History> | null;
};

const emptyEntry = (): Entry => ({ none: false, items: [], when: "", note: "" });
const emptyHistory = () =>
  Object.fromEntries(HISTORY_QUESTIONS.map((q) => [q.key, emptyEntry()])) as History;

const FA = "۰۱۲۳۴۵۶۷۸۹";
function toEn(s: string) {
  return s
    .replace(/[۰-۹]/g, (d) => String(FA.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}
// نمایش مبلغ با جداکننده‌ی هزارگان، تا اشتباه در تعداد صفرها دیده شود
function money(v: string) {
  const n = Number(toEn(v).replace(/[,،\s]/g, ""));
  return v.trim() && Number.isFinite(n) ? n.toLocaleString("fa-IR") + " تومان" : "";
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`px-4 py-2 rounded-full text-sm border ${
        on ? "bg-brand-green text-white border-brand-green" : "bg-white text-gray-700 border-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

export default function VisitDetail({ id, canDoctor }: { id: number; canDoctor: boolean }) {
  const router = useRouter();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [surgeons, setSurgeons] = useState<string[]>([]);
  const [err, setErr] = useState("");

  const [history, setHistory] = useState<History>(emptyHistory());
  const [surgeon, setSurgeon] = useState("");
  const [surgeonOther, setSurgeonOther] = useState("");
  const [cost, setCost] = useState("");
  const [showMissing, setShowMissing] = useState(false);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await fetch(`/api/visits/${id}`);
      if (!r.ok) {
        setErr("ویزیت پیدا نشد یا دسترسی ندارید");
        return;
      }
      const d = (await r.json()) as { visit: Visit; surgeons: string[] };
      const v = d.visit;
      setVisit(v);
      setSurgeons(d.surgeons);
      if (v.history) setHistory({ ...emptyHistory(), ...v.history });
      if (v.surgeon_name) {
        if (d.surgeons.includes(v.surgeon_name)) setSurgeon(v.surgeon_name);
        else {
          setSurgeon("__other");
          setSurgeonOther(v.surgeon_name);
        }
      } else if (d.surgeons.length === 1) {
        setSurgeon(d.surgeons[0]);
      }
      if (v.surgery_cost != null) setCost(String(v.surgery_cost));
    })();
  }, [id]);

  function patch(key: HistoryKey, p: Partial<Entry>) {
    setHistory((h) => ({ ...h, [key]: { ...h[key], ...p } }));
  }
  function toggleItem(key: HistoryKey, item: string) {
    const e = history[key];
    const items = e.items.includes(item) ? e.items.filter((i) => i !== item) : [...e.items, item];
    patch(key, { items, none: false });
  }
  function toggleNone(key: HistoryKey) {
    patch(key, history[key].none ? { none: false } : { none: true, items: [], when: "", note: "" });
  }

  const missing = HISTORY_QUESTIONS.filter((q) => !history[q.key].none && history[q.key].items.length === 0);

  async function save() {
    setMsg("");
    if (missing.length) {
      setShowMissing(true);
      setMsg(`به ${missing.length} سؤال پاسخ داده نشده (با رنگ قرمز مشخص شده)`);
      return;
    }
    setSaving(true);
    const r = await fetch(`/api/visits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        part: "doctor",
        surgeon_name: surgeon === "__other" ? surgeonOther : surgeon,
        surgery_cost: cost,
        history,
      }),
    });
    const data = (await r.json()) as { error?: string };
    setSaving(false);
    if (r.ok) router.push("/dashboard/visits");
    else setMsg(data.error || "خطا");
  }

  if (err) return <p className="text-sm text-red-600">{err}</p>;
  if (!visit) return <p className="text-sm text-gray-400">در حال بارگذاری...</p>;

  const info: [string, string | number | null][] = [
    ["شماره پرونده امروز", visit.daily_number],
    ["موبایل", visit.phone],
    ["شماره ثابت", visit.landline],
    ["نام پدر", visit.father_name],
    ["سن", visit.age],
    ["شغل", visit.job],
    ["وضعیت تاهل", visit.marital_status],
    ["محدوده سکونت", visit.residence_area],
    ["نوع جراحی", visit.surgery_type],
    ["نحوه آشنایی", visit.referral_source],
  ];

  return (
    <div className="space-y-8">
            {/* مراحل */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {[
          { label: "۱. ارجاع منشی", state: "done" },
          { label: "۲. ویزیت دکتر", state: visit.status === "completed" ? "done" : "current" },
          { label: "۳. تکمیل منشی", state: visit.status === "completed" ? "current" : "todo" },
        ].map((s) => (
          <span
            key={s.label}
            className={`px-4 py-2 rounded-full font-bold ${
              s.state === "done"
                ? "bg-green-100 text-green-700"
                : s.state === "current"
                ? "bg-brand-green text-white"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            {s.state === "done" ? "✓ " : ""}
            {s.label}
          </span>
        ))}
      </div>
      {/* اطلاعات بیمار */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm space-y-4">
        <h2 className="text-xl font-black">
          {visit.first_name} {visit.last_name}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {info.map(([label, val]) => (
            <div key={label}>
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-sm font-bold">{val || "-"}</p>
            </div>
          ))}
        </div>
        {visit.patient_notes && <p className="text-sm text-gray-600">توضیحات: {visit.patient_notes}</p>}
      </div>

      {canDoctor ? (
        <div className="bg-white p-6 rounded-[2rem] shadow-sm space-y-8">
          {visit.status === "completed" && (
            <p className="text-sm bg-green-50 text-green-700 rounded-xl p-3">
              این ویزیت قبلاً تکمیل شده؛ در صورت نیاز می‌توانید اصلاح و دوباره ثبت کنید.
            </p>
          )}
          <p className="text-sm text-gray-500">
            برای هر سؤال یا «ندارد» را بزنید یا گزینه‌ها را انتخاب کنید. چیزی لازم نیست تایپ شود (به‌جز هزینه).
          </p>
          {/* جراح و هزینه */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="font-bold text-sm">نام جراح</p>
              <div className="flex flex-wrap gap-2">
                {surgeons.map((s) => (
                  <Pill key={s} on={surgeon === s} onClick={() => setSurgeon(s)}>
                    {s}
                  </Pill>
                ))}
                <Pill on={surgeon === "__other"} onClick={() => setSurgeon("__other")}>
                  سایر
                </Pill>
              </div>
              {surgeon === "__other" && (
                <input
                  className="border border-gray-200 rounded-xl p-3 w-full"
                  placeholder="نام جراح"
                  value={surgeonOther}
                  onChange={(e) => setSurgeonOther(e.target.value)}
                />
              )}
            </div>
            <div className="space-y-2">
              <p className="font-bold text-sm">هزینه جراحی (تومان)</p>
              <input
                className="border border-gray-200 rounded-xl p-3 w-full"
                inputMode="numeric"
                placeholder="مثلاً ۱۵۰۰۰۰۰۰"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
              <p className="text-sm text-gray-500 h-5">{money(cost)}</p>
            </div>
          </div>

          {/* سؤال‌های تاریخچه */}
          {HISTORY_QUESTIONS.map((q) => {
            const e = history[q.key];
            const bad = showMissing && !e.none && e.items.length === 0;
            return (
              <div key={q.key} className={`space-y-3 rounded-2xl p-4 border ${bad ? "border-red-400 bg-red-50" : "border-gray-100"}`}>
                <p className="font-bold text-sm">{q.title}</p>
                <div className="flex flex-wrap gap-2">
                  <Pill on={e.none} onClick={() => toggleNone(q.key)}>
                    {NONE_LABEL}
                  </Pill>
                  {q.items.map((item) => (
                    <Pill key={item} on={e.items.includes(item)} onClick={() => toggleItem(q.key, item)}>
                      {item}
                    </Pill>
                  ))}
                </div>
                {q.hasWhen && e.items.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">مربوط به چه زمانی؟</p>
                    <div className="flex flex-wrap gap-2">
                      {WHEN_OPTIONS.map((w) => (
                        <Pill key={w} on={e.when === w} onClick={() => patch(q.key, { when: e.when === w ? "" : w })}>
                          {w}
                        </Pill>
                      ))}
                    </div>
                  </div>
                )}
                {!e.none && (
                  <input
                    className="border border-gray-200 rounded-xl p-2 text-sm w-full md:w-64"
                    maxLength={30}
                    placeholder={q.noteLabel}
                    value={e.note}
                    onChange={(ev) => patch(q.key, { note: ev.target.value })}
                  />
                )}
              </div>
            );
          })}

          <div className="space-y-2">
            <button
              onClick={save}
              disabled={saving}
              className="bg-brand-green text-white rounded-xl px-8 py-3 font-bold"
            >
              {saving ? "در حال ثبت..." : "ثبت و برگشت به منشی"}
            </button>
            {msg && <p className="text-sm text-red-600">{msg}</p>}
          </div>
        </div>
      ) : visit.status === "referred" ? (
        <p className="bg-yellow-50 text-yellow-700 rounded-2xl p-4 text-sm font-bold">
          در انتظار دکتر. پس از تکمیل توسط دکتر، نتیجه اینجا نمایش داده می‌شود.
        </p>
      ) : (
        <div className="bg-white p-6 rounded-[2rem] shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400">نام جراح</p>
              <p className="text-sm font-bold">{visit.surgeon_name || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">هزینه جراحی</p>
              <p className="text-sm font-bold">
                {visit.surgery_cost != null ? visit.surgery_cost.toLocaleString("fa-IR") + " تومان" : "-"}
              </p>
            </div>
          </div>
          {HISTORY_QUESTIONS.map((q) => {
            const e = visit.history?.[q.key];
            return (
              <div key={q.key}>
                <p className="text-xs text-gray-400">{q.title}</p>
                <p className="text-sm font-bold">
                  {!e
                    ? "-"
                    : e.none
                    ? NONE_LABEL
                    : [e.items.join("، "), e.when, e.note].filter(Boolean).join(" | ")}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}