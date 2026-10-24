"use client";
import { useState, useEffect, useCallback } from "react";
import { Upload, Stethoscope, UserPlus } from "lucide-react";
import { toJalaliDate, getTodayGregorian } from "@/lib/jalali";
import { openRubikaAndCopyMessage } from "@/lib/rubika";
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

type NurseAppointment = {
  id: number;
  appointment_date: string;
  appointment_time: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  attendance_status: "pending" | "attended" | "no_show";
  related_surgery_appointment_id: number;
  surgery_date: string;
  description: string | null;
  daily_number: number;
  first_name: string;
  last_name: string;
  phone: string;
  nurse_name: string | null;
};

type FollowupCandidate = {
  surgery_appointment_id: number;
  surgery_date: string;
  surgery_time: string;
  hospital_name: string | null;
  patient_id: number;
  daily_number: number;
  first_name: string;
  last_name: string;
  phone: string;
};

const NURSE_SERVICES = [
  { id: "taping", label: "چسب" },
  { id: "splint_stitches", label: "آتل و بخیه" },
  { id: "tampon", label: "تامپون" },
  { id: "examination_evening", label: "معاینه عصر" },
  { id: "examination_morning", label: "معاینه صبح" },
  { id: "dissatisfaction", label: "ناراضی ها" },
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
  const [deletingMediaId, setDeletingMediaId] = useState<number | null>(null);
  const [vitalsList, setVitalsList] = useState<VitalItem[]>([]);
  const [myAppointments, setMyAppointments] = useState<NurseAppointment[]>([]);
  const [followupCandidates, setFollowupCandidates] = useState<FollowupCandidate[]>([]);
  const [selectedFollowupSurgery, setSelectedFollowupSurgery] = useState<FollowupCandidate | null>(null);
  const [followupSearch, setFollowupSearch] = useState("");
  const [attendanceUpdatingId, setAttendanceUpdatingId] = useState<number | null>(null);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState("");
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  const [serviceType, setServiceType] = useState(NURSE_SERVICES[0].id);
  const [aptDate, setAptDate] = useState(() => getTodayGregorian());
  const [aptTime, setAptTime] = useState("10:00");
  const [notes, setNotes] = useState("");

  const [bp, setBp] = useState("");
  const [hr, setHr] = useState("");
  const [temp, setTemp] = useState("");

  const [msg, setMsg] = useState("");
  const [appointmentMessage, setAppointmentMessage] = useState<{ text: string; whatsappUrl: string; rubikaNotice?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  function toEnglishDigits(value: string) {
    return value
      .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
      .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
  }

  const refreshMyAppointments = useCallback(async () => {
    try {
      const response = await fetch(`/api/nurses/followups?q=${encodeURIComponent(followupSearch)}`, { cache: "no-store" });
      if (!response.ok) {
        setAppointmentsError("دریافت فهرست نوبت‌های پیگیری ممکن نشد. اتصال یا به‌روزرسانی پایگاه‌داده را بررسی کنید.");
        return false;
      }
      const data = (await response.json()) as { candidates: FollowupCandidate[]; appointments: NurseAppointment[] };
      setAppointmentsError("");
      setFollowupCandidates(data.candidates);
      setMyAppointments(data.appointments);
      return true;
    } catch {
      setAppointmentsError("ارتباط با سرور برای دریافت گزارش نوبت‌ها برقرار نشد.");
      return false;
    } finally {
      setAppointmentsLoading(false);
    }
  }, [followupSearch]);

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
      setSelectedFollowupSurgery(null);
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
    void refreshMyAppointments();
    const interval = window.setInterval(() => void refreshMyAppointments(), 15000);
    return () => window.clearInterval(interval);
  }, [refreshMyAppointments]);

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

  async function handleDeleteMedia(media: MediaItem) {
    if (!selectedPatient || !window.confirm("این مستند برای همیشه از پرونده بیمار حذف شود؟")) return;
    setDeletingMediaId(media.id);
    setMsg("");
    try {
      const res = await fetch(
        `/api/patients/${selectedPatient.id}/media?media_id=${media.id}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error || "حذف مستند انجام نشد. دوباره تلاش کنید.");
        return;
      }
      setMediaList((items) => items.filter((item) => item.id !== media.id));
      if (expandedImage === media.image_url) setExpandedImage(null);
      setMsg("مستند از پرونده بیمار حذف شد.");
    } catch {
      setMsg("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setDeletingMediaId(null);
    }
  }

  async function handleBookNurseService(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient || !selectedFollowupSurgery) {
      setMsg("ابتدا بیمار را از فهرست «بدون نوبت پیگیری» انتخاب کنید.");
      return;
    }

    setLoading(true);
    setMsg("");
    setAppointmentMessage(null);
    const serviceLabel = NURSE_SERVICES.find((s) => s.id === serviceType)?.label || "خدمت پرستاری";
    try {
      const response = await fetch("/api/nurses/followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surgery_appointment_id: selectedFollowupSurgery.surgery_appointment_id,
          service_type: serviceType,
          appointment_date: aptDate,
          appointment_time: aptTime,
          notes,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        patient?: { first_name: string; last_name: string; phone: string };
        appointment_date?: string;
        appointment_time?: string;
        whatsappUrl?: string;
      };
      if (!response.ok || !data.patient || !data.appointment_date || !data.appointment_time) {
        setMsg(data.error || "ثبت نوبت پیگیری انجام نشد. دوباره تلاش کنید.");
        return;
      }

      await refreshMyAppointments();
      const phone = toEnglishDigits(data.patient.phone).replace(/\D/g, "").replace(/^0/, "98");
      const text = `سلام ${data.patient.first_name} عزیز، نوبت پیگیری ${serviceLabel} شما برای تاریخ ${toJalaliDate(data.appointment_date)} ساعت ${data.appointment_time} ثبت شد. لطفاً در زمان مقرر مراجعه کنید. با تشکر`;
      setAppointmentMessage({
        text,
        whatsappUrl: `${data.whatsappUrl || `https://wa.me/${phone}`}?text=${encodeURIComponent(text)}`,
      });
      setMsg("نوبت پیگیری پس از عمل ثبت شد و در گزارش شما قرار گرفت.");
      setNotes("");
      setSelectedFollowupSurgery(null);
    } catch {
      setMsg("ارتباط با سرور برقرار نشد. وضعیت نوبت را بررسی و دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }

  async function updateFollowupAttendance(appointmentId: number, attendanceStatus: "pending" | "attended" | "no_show") {
    setAttendanceUpdatingId(appointmentId);
    try {
      const response = await fetch("/api/nurses/followups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointment_id: appointmentId, attendance_status: attendanceStatus }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setMsg(data.error || "وضعیت مراجعه ذخیره نشد.");
        return;
      }
      await refreshMyAppointments();
      setMsg(attendanceStatus === "attended" ? "حضور بیمار ثبت شد." : attendanceStatus === "no_show" ? "عدم مراجعه بیمار ثبت شد." : "وضعیت نوبت به حالت در انتظار بازگشت.");
    } catch {
      setMsg("ارتباط با سرور برقرار نشد؛ وضعیت مراجعه ذخیره نشد.");
    } finally {
      setAttendanceUpdatingId(null);
    }
  }

  async function handleRubikaAppointmentNotice() {
    if (!appointmentMessage) return;
    const copied = await openRubikaAndCopyMessage(appointmentMessage.text);
    const notice = copied
      ? "روبیکا باز شد و متن پیام کپی شد؛ مخاطب را انتخاب و پیام را ارسال کنید."
      : "روبیکا باز شد؛ متن پیام را از کادر بالا کپی و در گفت‌وگوی بیمار ارسال کنید.";
    setAppointmentMessage((current) => current ? { ...current, rubikaNotice: notice } : current);
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
        <section id="followups" className="space-y-3 rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
          <div>
            <h2 className="font-black text-sm text-amber-950">بیماران پس از عمل بدون نوبت پیگیری</h2>
            <p className="mt-1 text-xs text-amber-800">عمل‌های گذشته‌ای که هنوز نوبت پرستاری برایشان ثبت نشده است.</p>
          </div>
          <input
            className={inputClass}
            placeholder="جستجوی نام یا شماره پرونده..."
            value={followupSearch}
            onChange={(event) => setFollowupSearch(event.target.value)}
          />
          <div className="max-h-52 space-y-2 overflow-y-auto">
            {followupCandidates.map((candidate) => (
              <button
                key={candidate.surgery_appointment_id}
                type="button"
                onClick={() => {
                  setSelectedFollowupSurgery(candidate);
                  setSelectedPatient({
                    id: candidate.patient_id,
                    daily_number: candidate.daily_number,
                    first_name: candidate.first_name,
                    last_name: candidate.last_name,
                    phone: candidate.phone,
                  });
                  setSearch(`${candidate.first_name} ${candidate.last_name}`);
                  setAppointmentMessage(null);
                }}
                className={`w-full rounded-xl border p-3 text-right text-xs transition-colors ${selectedFollowupSurgery?.surgery_appointment_id === candidate.surgery_appointment_id ? "border-amber-400 bg-amber-100" : "border-amber-100 bg-white hover:bg-amber-50"}`}
              >
                <span className="block font-bold text-gray-900">{candidate.first_name} {candidate.last_name} · پرونده {candidate.daily_number}</span>
                <span className="mt-1 block text-gray-600">تاریخ عمل: {toJalaliDate(candidate.surgery_date)} · ساعت {candidate.surgery_time}</span>
              </button>
            ))}
            {!appointmentsLoading && !appointmentsError && followupCandidates.length === 0 && (
              <p className="rounded-xl bg-white p-3 text-center text-xs text-gray-500">بیمارِ بدون نوبت پیگیری پیدا نشد.</p>
            )}
            {appointmentsLoading && <p className="rounded-xl bg-white p-3 text-center text-xs text-gray-500">در حال دریافت فهرست...</p>}
          </div>
        </section>

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
                      setSelectedFollowupSurgery(null);
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
              onClick={() => { setAppointmentMessage(null); setSelectedFollowupSurgery(null); setSelectedPatient(p); }}
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
                onClick={() => { setAppointmentMessage(null); setSelectedFollowupSurgery(null); setSelectedPatient(null); }}
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

        {selectedFollowupSurgery ? (
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs font-bold text-amber-900">
            نوبت پیگیری برای {selectedFollowupSurgery.first_name} {selectedFollowupSurgery.last_name} انتخاب شده است · عمل در {toJalaliDate(selectedFollowupSurgery.surgery_date)}
          </div>
        ) : (
          <p className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600">برای ثبت پیگیری، بیمار را از فهرست «بدون نوبت پیگیری» انتخاب کنید.</p>
        )}
        <form onSubmit={handleBookNurseService} className="space-y-4 bg-gray-50 p-5 rounded-2xl border border-gray-100">
          <p className="font-bold text-sm text-gray-800">ثبت نوبت پیگیری پس از عمل</p>

          <div className="grid grid-cols-2 gap-3">
            <select
              className={inputClass}
              value={serviceType}
              onChange={(e) => { setAppointmentMessage(null); setServiceType(e.target.value); }}
            >
              {NURSE_SERVICES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <JalaliDatePicker
              value={aptDate}
              onChange={(gDate) => { setAppointmentMessage(null); setAptDate(gDate); }}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="time"
              value={aptTime}
              onChange={(e) => { setAppointmentMessage(null); setAptTime(e.target.value); }}
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
            disabled={loading || !selectedPatient || !selectedFollowupSurgery}
            className="w-full bg-brand-green text-white font-bold p-3 rounded-xl shadow-md hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            ثبت نوبت خدمت پرستاری
          </button>
        </form>

        <section aria-live="polite" className="space-y-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-sm text-sky-950">گزارش نوبت‌های پیگیری شما</h3>
              <p className="mt-1 text-xs text-sky-800">گزارش هر ۱۵ ثانیه و پس از هر تغییر فوراً به‌روز می‌شود.</p>
            </div>
            <button type="button" onClick={() => void refreshMyAppointments()} className="shrink-0 rounded-lg bg-white px-3 py-2 text-xs font-bold text-sky-800 shadow-sm hover:bg-sky-100">
              به‌روزرسانی
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
            <div className="rounded-xl bg-white p-2"><span className="block text-lg font-black text-amber-700">{followupCandidates.length}</span>بدون نوبت</div>
            <div className="rounded-xl bg-white p-2"><span className="block text-lg font-black text-sky-900">{myAppointments.length}</span>نوبت‌گرفته</div>
            <div className="rounded-xl bg-white p-2"><span className="block text-lg font-black text-emerald-700">{myAppointments.filter((a) => a.attendance_status === "attended").length}</span>مراجعه‌کرده</div>
            <div className="rounded-xl bg-white p-2"><span className="block text-lg font-black text-red-700">{myAppointments.filter((a) => a.attendance_status === "no_show").length}</span>مراجعه‌نکرده</div>
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {myAppointments.map((appointment) => (
              <div key={appointment.id} className="space-y-2 rounded-xl border border-sky-100 bg-white p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-gray-900">{appointment.first_name} {appointment.last_name} · پرونده {appointment.daily_number}</p>
                    <p className="mt-1 text-gray-500">{appointment.description?.match(/\[خدمت پرستاری: ([^\]]+)\]/)?.[1] || "پیگیری پرستاری"} · عمل: {toJalaliDate(appointment.surgery_date)}</p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-800">{toJalaliDate(appointment.appointment_date)} — {appointment.appointment_time}</p>
                    <p className={`mt-1 font-bold ${appointment.attendance_status === "attended" ? "text-emerald-700" : appointment.attendance_status === "no_show" ? "text-red-600" : "text-amber-700"}`}>
                      {appointment.attendance_status === "attended" ? "مراجعه کرده" : appointment.attendance_status === "no_show" ? "مراجعه نکرده" : "در انتظار مراجعه"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-2">
                  <button type="button" disabled={attendanceUpdatingId === appointment.id} onClick={() => void updateFollowupAttendance(appointment.id, "attended")} className="rounded-lg bg-emerald-50 px-3 py-2 font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50">مراجعه کرد</button>
                  <button type="button" disabled={attendanceUpdatingId === appointment.id} onClick={() => void updateFollowupAttendance(appointment.id, "no_show")} className="rounded-lg bg-red-50 px-3 py-2 font-bold text-red-700 hover:bg-red-100 disabled:opacity-50">مراجعه نکرد</button>
                  {appointment.attendance_status !== "pending" && (
                    <button type="button" disabled={attendanceUpdatingId === appointment.id} onClick={() => void updateFollowupAttendance(appointment.id, "pending")} className="rounded-lg bg-gray-100 px-3 py-2 font-bold text-gray-700 hover:bg-gray-200 disabled:opacity-50">بازنشانی وضعیت</button>
                  )}
                  {attendanceUpdatingId === appointment.id && <span className="self-center text-gray-500">در حال ذخیره...</span>}
                </div>
              </div>
            ))}
            {!appointmentsLoading && !appointmentsError && myAppointments.length === 0 && <p className="rounded-xl bg-white p-3 text-center text-xs text-gray-500">هنوز نوبت پیگیری‌ای توسط شما ثبت نشده است.</p>}
            {appointmentsError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-center text-xs font-bold text-red-700">{appointmentsError}</p>}
            {appointmentsLoading && <p className="rounded-xl bg-white p-3 text-center text-xs text-gray-500">در حال دریافت گزارش نوبت‌ها...</p>}
          </div>
        </section>

        {appointmentMessage && (
          <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p role="status" className="text-sm font-bold text-emerald-900">پیام آماده‌ی اطلاع‌رسانی به بیمار:</p>
            <p className="rounded-xl bg-white p-3 text-xs leading-6 text-gray-700">{appointmentMessage.text}</p>
            <div className="flex gap-3">
              <a href={appointmentMessage.whatsappUrl} target="_blank" rel="noreferrer" className="flex-1 rounded-xl bg-green-600 px-3 py-2 text-center text-sm font-bold text-white hover:bg-green-700">ارسال با واتس‌اپ</a>
              <button type="button" onClick={handleRubikaAppointmentNotice} className="flex-1 rounded-xl bg-violet-700 px-3 py-2 text-center text-sm font-bold text-white hover:bg-violet-800">ارسال با روبیکا</button>
            </div>
            {appointmentMessage.rubikaNotice
              ? <p role="status" className="text-xs font-bold text-violet-800">{appointmentMessage.rubikaNotice}</p>
              : <p className="text-xs text-gray-600">برای روبیکا، دکمه را بزنید؛ متن کپی می‌شود تا در گفت‌وگوی بیمار ارسال کنید.</p>}
          </div>
        )}

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
                    <button
                      type="button"
                      onClick={() => handleDeleteMedia(m)}
                      disabled={deletingMediaId === m.id}
                      className="w-full rounded-lg bg-red-50 px-1.5 py-1 text-[10px] font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      {deletingMediaId === m.id ? "در حال حذف..." : "حذف"}
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
