"use client";
import { useState, useEffect } from "react";
import { Upload, Stethoscope, UserPlus } from "lucide-react";
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
  const [showCreatePatient, setShowCreatePatient] = useState(false);
  const [newPatient, setNewPatient] = useState({ first_name: "", last_name: "", phone: "" });
  const [duplicatePatients, setDuplicatePatients] = useState<Patient[]>([]);
  const [patientMsg, setPatientMsg] = useState("");

  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
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

  function toEnglishDigits(value: string) {
    return value
      .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
      .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
  }

  async function handleCreatePatient(force = false) {
    setPatientMsg("");
    setDuplicatePatients([]);

    const phone = toEnglishDigits(newPatient.phone).replace(/\D/g, "");
    if (!newPatient.first_name.trim() || !newPatient.last_name.trim()) {
      setPatientMsg("نام و نام خانوادگی را وارد کنید.");
      return;
    }
    if (!/^09\d{9}$/.test(phone)) {
      setPatientMsg("شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود.");
      return;
    }

    setLoading(true);
    try {
      if (!force) {
        const searchRes = await fetch(`/api/patients?q=${encodeURIComponent(phone)}`);
        if (searchRes.ok) {
          const matches = ((await searchRes.json()) as Patient[]).filter(
            (patient) => toEnglishDigits(patient.phone).replace(/\D/g, "") === phone,
          );
          if (matches.length) {
            setDuplicatePatients(matches);
            setPatientMsg("این شماره تماس در پرونده‌ای ثبت شده؛ همان بیمار را انتخاب کنید یا اگر بیمار دیگری است ثبت را ادامه دهید.");
            return;
          }
        }
      }

      const response = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newPatient, phone }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        patient?: { id: number; daily_number: number };
      };
      if (!response.ok || !data.patient) {
        setPatientMsg(data.error || "ثبت بیمار انجام نشد. دوباره تلاش کنید.");
        return;
      }

      const patient: Patient = {
        id: data.patient.id,
        daily_number: data.patient.daily_number,
        first_name: newPatient.first_name.trim(),
        last_name: newPatient.last_name.trim(),
        phone,
      };
      setSelectedPatient(patient);
      setSearch(`${patient.first_name} ${patient.last_name}`);
      setNewPatient({ first_name: "", last_name: "", phone: "" });
      setDuplicatePatients([]);
      setShowCreatePatient(false);
      setPatientMsg(`پرونده بیمار ثبت شد (شماره ${patient.daily_number}). فرم نوبت‌دهی برای او آماده است.`);
      setMsg("");
    } catch {
      setPatientMsg("ارتباط با سرور برقرار نشد. وضعیت اینترنت را بررسی و دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }

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
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_id: selectedPatient.id,
        type: "consultation",
        appointment_date: aptDate,
        appointment_time: aptTime,
        description: `[خدمت پرستاری: ${serviceLabel}]${notes ? ` ${notes}` : ""}`,
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
        <button
          type="button"
          onClick={() => {
            setShowCreatePatient((current) => !current);
            setPatientMsg("");
            setDuplicatePatients([]);
          }}
          className="w-full border border-emerald-200 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl p-3 text-sm font-bold flex items-center justify-center gap-2"
        >
          <UserPlus size={17} />
          {showCreatePatient ? "بستن ثبت بیمار جدید" : "ثبت بیمار جدید و نوبت‌دهی"}
        </button>
        {showCreatePatient && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleCreatePatient();
            }}
            className="space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4"
          >
            <p className="text-sm font-bold text-gray-800">اطلاعات اولیه بیمار</p>
            <input
              className={inputClass}
              placeholder="نام *"
              value={newPatient.first_name}
              onChange={(e) => setNewPatient({ ...newPatient, first_name: e.target.value })}
              required
            />
            <input
              className={inputClass}
              placeholder="نام خانوادگی *"
              value={newPatient.last_name}
              onChange={(e) => setNewPatient({ ...newPatient, last_name: e.target.value })}
              required
            />
            <input
              className={inputClass}
              type="tel"
              inputMode="tel"
              placeholder="شماره موبایل *"
              value={newPatient.phone}
              onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
              required
            />
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-brand-green p-3 text-sm font-bold text-white disabled:opacity-50">
              {loading ? "در حال ثبت..." : "ثبت بیمار و ادامه به نوبت‌دهی"}
            </button>
            {duplicatePatients.length > 0 && (
              <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                {duplicatePatients.map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => {
                      setSelectedPatient(patient);
                      setSearch(`${patient.first_name} ${patient.last_name}`);
                      setNewPatient({ first_name: "", last_name: "", phone: "" });
                      setShowCreatePatient(false);
                      setDuplicatePatients([]);
                      setPatientMsg("بیمار موجود انتخاب شد؛ حالا نوبت را ثبت کنید.");
                    }}
                    className="w-full rounded-lg bg-white p-2 text-right text-sm font-bold hover:bg-amber-100"
                  >
                    انتخاب {patient.first_name} {patient.last_name} — پرونده {patient.daily_number}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void handleCreatePatient(true)}
                  className="w-full text-xs font-bold text-amber-900 underline disabled:opacity-50"
                >
                  بیمار دیگری است؛ با همین شماره ثبت شود
                </button>
              </div>
            )}
            {patientMsg && <p role="status" className="text-xs font-bold text-gray-700">{patientMsg}</p>}
          </form>
        )}
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
          {patients.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">
              {search.trim()
                ? "بیماری با این نام یا شماره پرونده پیدا نشد."
                : "برای جستجوی پرونده‌های قدیمی، نام یا شماره پرونده را وارد کنید."}
            </p>
          )}
        </div>
      </div>

      {/* پنل تخصصی پرستار */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm space-y-6">
        <h2 className="text-lg font-black text-gray-900">نوبت خدمات پرستاری و مدیریت پرونده بیمار</h2>

        {selectedPatient ? (
          <div className="bg-emerald-50 p-4 rounded-2xl text-sm font-bold text-emerald-900 flex justify-between items-center border border-emerald-100">
            <span>
              بیمار انتخاب‌شده: {selectedPatient.first_name} {selectedPatient.last_name} — {selectedPatient.phone}
            </span>
            <button
              type="button"
              onClick={() => setSelectedPatient(null)}
              className="text-xs text-red-600 hover:text-red-700 underline font-medium"
            >
              تغییر بیمار
            </button>
          </div>
        ) : (
          <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-xl">
            برای ثبت نوبت، ابتدا بیمار را در بخش «انتخاب بیمار» جستجو و انتخاب کنید.
          </p>
        )}

        {patientMsg && !showCreatePatient && (
          <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-900">{patientMsg}</p>
        )}

        <form onSubmit={handleBookNurseService} className="space-y-4 bg-gray-50 p-5 rounded-2xl border border-gray-100">
          <p className="font-bold text-sm text-gray-800">ثبت نوبت خدمت پرستاری</p>

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
            disabled={loading || !selectedPatient}
            className="w-full bg-brand-green text-white font-bold p-3 rounded-xl shadow-md hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            ثبت نوبت خدمت پرستاری
          </button>
        </form>

        {selectedPatient ? (
          <div className="space-y-6">
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
                    <button
                      type="button"
                      onClick={() => setExpandedImage(m.image_url)}
                      aria-label="نمایش بزرگ تصویر پرونده"
                      className="block w-full"
                    >
                      <img
                        src={m.image_url}
                        alt="مدیا پرونده"
                        className="w-full h-20 object-cover rounded-lg"
                      />
                    </button>
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
      {expandedImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="نمایش تصویر بیمار"
          onClick={() => setExpandedImage(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
        >
          <div className="relative max-h-full max-w-full" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setExpandedImage(null)}
              aria-label="بستن تصویر"
              className="absolute -top-3 -right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-2xl font-bold text-gray-900 shadow"
            >
              ×
            </button>
            <img src={expandedImage} alt="تصویر بزرگ بیمار" className="max-h-[90vh] max-w-[92vw] rounded-xl object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
