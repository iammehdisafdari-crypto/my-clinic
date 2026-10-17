"use client";
import { useState, useEffect } from "react";
import { Upload, Stethoscope } from "lucide-react";
import { toJalaliDate, getTodayGregorian } from "@/lib/jalali";
import JalaliDatePicker from "@/app/dashboard/JalaliDatePicker";

type Patient = {
  id: number;
  daily_number: number;
  first_name: string;
  last_name: string;
  phone: string;
};

type MediaItem = {
  id: number;
  image_url: string;
  image_type: "before" | "after" | "current";
  created_at: string;
};

type VitalItem = {
  id: number;
  blood_pressure: string | null;
  heart_rate: string | null;
  temperature: string | null;
  notes: string | null;
  nurse_name: string | null;
  created_at: string;
};

const NURSE_SERVICES = [
  { id: "taping", label: "نوبت چسب" },
  { id: "splint", label: "آتل" },
  { id: "stitches", label: "بخیه" },
  { id: "examination", label: "معاینه" },
  { id: "dissatisfaction", label: "نارضایتی بیمار" },
  { id: "cortisone", label: "نوبت کورتن" },
  { id: "post_op_consult", label: "مشاوره بعد از عمل" },
  { id: "minor_surgery", label: "عمل سرپایی در مطب" },
  { id: "surgery_assist", label: "دستیاری جراحی" },
];

export default function NurseClient() {
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [vitalsList, setVitalsList] = useState<VitalItem[]>([]);
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  const [serviceType, setServiceType] = useState(NURSE_SERVICES[0].id);
  const [aptDate, setAptDate] = useState(() => getTodayGregorian());
  const [aptTime, setAptTime] = useState("10:00");
  const [notes, setNotes] = useState("");

  const [bp, setBp] = useState("");
  const [hr, setHr] = useState("");
  const [temp, setTemp] = useState("");

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPatients = async () => {
      const res = await fetch(`/api/patients?q=${encodeURIComponent(search)}`);
      if (res.ok) setPatients(await res.json());
    };
    const t = setTimeout(fetchPatients, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!selectedPatient) {
      setMediaList([]);
      setVitalsList([]);
      return;
    }
    const fetchData = async () => {
      const mRes = await fetch(`/api/patients/${selectedPatient.id}/media`);
      if (mRes.ok) setMediaList(await mRes.json());

      const vRes = await fetch(`/api/nurses/vitals?patient_id=${selectedPatient.id}`);
      if (vRes.ok) setVitalsList(await vRes.json());
    };
    fetchData();
  }, [selectedPatient]);

  async function handleUploadCurrentPhoto(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient || !currentFile) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", currentFile);
    formData.append("image_type", "current");

    const res = await fetch(`/api/patients/${selectedPatient.id}/media`, {
      method: "POST",
      body: formData,
    });

    setLoading(false);
    if (res.ok) {
      setMsg("عکس وضعیت فعلی با موفقیت ثبت شد.");
      setCurrentFile(null);
      const mRes = await fetch(`/api/patients/${selectedPatient.id}/media`);
      if (mRes.ok) setMediaList(await mRes.json());
    } else {
      setMsg("خطا در ثبت عکس وضعیت فعلی");
    }
  }

  async function handleBookNurseService(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient) return;

    setLoading(true);
    const serviceLabel = NURSE_SERVICES.find((s) => s.id === serviceType)?.label;
    const res = await fetch("/api/surgeries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_id: selectedPatient.id,
        appointment_date: aptDate,
        appointment_time: aptTime,
        hospital_name: "مطب تخصصی",
        hospital_address: "کلینیک",
        description: `[خدمت پرستاری: ${serviceLabel}] ${notes}`.trim(),
      }),
    });

    setLoading(false);
    if (res.ok) {
      setMsg("نوبت و خدمت پرستاری با موفقیت ثبت شد.");
      setNotes("");
    } else {
      const data = await res.json().catch(() => ({}));
      setMsg(data.error || "خطا در ثبت نوبت");
    }
  }

  async function handleSaveVitals(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient) return;

    setLoading(true);
    const res = await fetch("/api/nurses/vitals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_id: selectedPatient.id,
        blood_pressure: bp,
        heart_rate: hr,
        temperature: temp,
        notes,
      }),
    });

    setLoading(false);
    if (res.ok) {
      setMsg("علائم حیاتی با موفقیت ثبت شد.");
      setBp("");
      setHr("");
      setTemp("");
      setNotes("");
      const r = await fetch(`/api/nurses/vitals?patient_id=${selectedPatient.id}`);
      if (r.ok) setVitalsList(await r.json());
    } else {
      const data = await res.json().catch(() => ({}));
      setMsg(data.error || "خطا در ثبت اطلاعات");
    }
  }

  const inputClass =
    "border border-gray-200 rounded-xl p-3 w-full text-sm outline-none focus:border-brand-green bg-white";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 font-sans">
      {/* انتخاب بیمار */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm space-y-4">
        <h2 className="text-lg font-black flex items-center gap-2 text-gray-900">
          <Stethoscope className="text-brand-green" size={20} />
          انتخاب بیمار
        </h2>
        <input
          className={inputClass}
          placeholder="جستجوی بیمار با نام یا شماره پرونده..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="max-h-[500px] overflow-y-auto space-y-2">
          {patients.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedPatient(p)}
              className={`p-3.5 rounded-2xl cursor-pointer text-sm flex justify-between items-center transition-all ${
                selectedPatient?.id === p.id
                  ? "bg-brand-green text-white font-bold shadow-md"
                  : "bg-gray-50 hover:bg-gray-100"
              }`}
            >
              <div>
                <p className="font-bold">
                  {p.first_name} {p.last_name}
                </p>
                <p className="text-xs opacity-80">تلفن: {p.phone}</p>
              </div>
              <span className="text-xs font-mono">پرونده: {p.daily_number}</span>
            </div>
          ))}
        </div>
      </div>

      {/* پنل تخصصی پرستار */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm space-y-6">
        <h2 className="text-lg font-black text-gray-900">مدیریت کلینیکال و پرونده بیمار</h2>

        {selectedPatient ? (
          <div className="space-y-6">
            <div className="bg-emerald-50 p-4 rounded-2xl text-sm font-bold text-emerald-900 flex justify-between items-center border border-emerald-100">
              <span>
                بیمار: {selectedPatient.first_name} {selectedPatient.last_name}
              </span>
              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="text-xs text-red-600 hover:text-red-700 underline font-medium"
              >
                تغییر بیمار
              </button>
            </div>

            {/* ثبت علائم حیاتی */}
            <form onSubmit={handleSaveVitals} className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <p className="font-bold text-sm text-gray-800">ثبت علائم حیاتی</p>
              <div className="grid grid-cols-3 gap-2">
                <input
                  className={inputClass}
                  placeholder="فشار خون"
                  value={bp}
                  onChange={(e) => setBp(e.target.value)}
                />
                <input
                  className={inputClass}
                  placeholder="ضربان قلب"
                  value={hr}
                  onChange={(e) => setHr(e.target.value)}
                />
                <input
                  className={inputClass}
                  placeholder="دمای بدن"
                  value={temp}
                  onChange={(e) => setTemp(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0e3b34] text-white font-bold py-2.5 rounded-xl text-xs hover:bg-[#0a2924] transition-colors"
              >
                ثبت علائم حیاتی
              </button>
            </form>

            {/* تاریخچه علائم حیاتی با تاریخ شمسی */}
            <div className="space-y-2">
              <p className="font-bold text-sm text-gray-800">تاریخچه علائم حیاتی</p>
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {vitalsList.map((v) => (
                  <div
                    key={v.id}
                    className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-xs flex justify-between items-center"
                  >
                    <span>
                      فشار: {v.blood_pressure || "-"} | ضربان: {v.heart_rate || "-"} | دما: {v.temperature || "-"}
                    </span>
                    <span className="text-gray-500 font-mono text-[11px]">{toJalaliDate(v.created_at)}</span>
                  </div>
                ))}
                {vitalsList.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">هنوز علائمی ثبت نشده است.</p>
                )}
              </div>
            </div>

            {/* نوبت‌دهی خدمات پرستاری با تقویم شمسی */}
            <form onSubmit={handleBookNurseService} className="space-y-4 bg-gray-50 p-5 rounded-2xl border border-gray-100">
              <p className="font-bold text-sm text-gray-800">ثبت نوبت / خدمت پرستاری</p>

              <div className="grid grid-cols-2 gap-3">
                <select
                  className={inputClass}
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                >
                  {NURSE_SERVICES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <JalaliDatePicker
                  value={aptDate}
                  onChange={(gDate) => setAptDate(gDate)}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="time"
                  value={aptTime}
                  onChange={(e) => setAptTime(e.target.value)}
                  className={inputClass}
                  required
                />
                <input
                  className={inputClass}
                  placeholder="توضیحات تکمیلی..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-green text-white font-bold p-3 rounded-xl shadow-md hover:bg-emerald-700 transition-colors"
              >
                ثبت خدمت / نوبت
              </button>
            </form>

            {/* ثبت عکس وضعیت فعلی */}
            <form onSubmit={handleUploadCurrentPhoto} className="space-y-3 bg-emerald-50/40 p-5 rounded-2xl border border-emerald-100">
              <p className="font-bold text-sm text-emerald-900">ثبت تصویر وضعیت فعلی بیمار</p>
              <label className="border-2 border-dashed border-emerald-300 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-white hover:bg-emerald-50/50 transition-colors">
                <Upload size={18} className="text-brand-green mb-1" />
                <span className="text-xs font-bold text-gray-700">
                  {currentFile ? currentFile.name : "انتخاب عکس از گالری یا دوربین"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCurrentFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              <button
                type="submit"
                disabled={loading || !currentFile}
                className="w-full bg-[#0e3b34] text-white font-bold py-2.5 rounded-xl text-xs disabled:opacity-50 hover:bg-[#0a2924] transition-colors"
              >
                بارگذاری و ثبت در پرونده
              </button>
            </form>

            {/* گالری تصاویر */}
            <div className="space-y-3">
              <p className="font-bold text-sm text-gray-800">گالری جامع تصاویر</p>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {mediaList.map((m) => (
                  <div key={m.id} className="border border-gray-200 rounded-xl p-1.5 space-y-1 bg-white">
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold block text-center ${
                        m.image_type === "before"
                          ? "bg-amber-100 text-amber-700"
                          : m.image_type === "after"
                          ? "bg-green-100 text-green-700"
                          : "bg-sky-100 text-sky-700"
                      }`}
                    >
                      {m.image_type === "before"
                        ? "قبل از عمل"
                        : m.image_type === "after"
                        ? "بعد از عمل"
                        : "وضعیت فعلی"}
                    </span>
                    <a href={m.image_url} target="_blank" rel="noreferrer">
                      <img
                        src={m.image_url}
                        alt="مدیا پرونده"
                        className="w-full h-20 object-cover rounded-lg"
                      />
                    </a>
                    <span className="text-[10px] text-gray-400 block text-center font-mono">
                      {toJalaliDate(m.created_at)}
                    </span>
                  </div>
                ))}
                {mediaList.length === 0 && (
                  <p className="col-span-3 text-xs text-gray-400 text-center py-4">هنوز تصویری ثبت نشده است.</p>
                )}
              </div>
            </div>

            {msg && <p className="text-xs font-bold text-center text-gray-700 bg-gray-50 p-2.5 rounded-xl border border-gray-100">{msg}</p>}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-20">لطفاً ابتدا یک بیمار را انتخاب کنید.</p>
        )}
      </div>
    </div>
  );
}