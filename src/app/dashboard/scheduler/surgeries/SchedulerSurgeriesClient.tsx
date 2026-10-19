"use client";
import { useState, useEffect } from "react";
import { toJalaliDate, getTodayGregorian } from "@/lib/jalali";
import JalaliDatePicker from "../../JalaliDatePicker";

type Patient = {
  id: number;
  daily_number: number;
  first_name: string;
  last_name: string;
  phone: string;
};

type SurgeryAppointment = {
  id: number;
  patient_id: number;
  daily_number: number;
  appointment_date: string;
  appointment_time: string;
  hospital_name: string;
  hospital_address: string;
  status: string;
  first_name: string;
  last_name: string;
  phone: string;
  surgery_type: string | null;
  photography_referral_id: number | null;
  photography_status: "pending" | "completed" | null;
  photography_channel: "whatsapp" | "telegram" | null;
  patientMessageText: string;
  whatsappUrl: string;
  telegramUrl: string;
};

const SURGERY_SLOTS = ["08:00", "09:30", "11:00", "13:00", "14:30", "16:00"];

const HOSPITALS = [
  { name: "بیمارستان صاحب الزمان", address: "تهران" },
  { name: "بیمارستان سپهر سلامت", address: "تهران" },
  { name: "بیمارستان البرز", address: "تهران" },
  { name: "بیمارستان پاسارگاد", address: "تهران" }
];

export default function SchedulerSurgeriesClient() {
  const [date, setDate] = useState(() => getTodayGregorian());
  const [surgeries, setSurgeries] = useState<SurgeryAppointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  
  const [selectedHospitalIndex, setSelectedHospitalIndex] = useState(0);
  const [customHospital, setCustomHospital] = useState("");
  const [customAddress, setCustomAddress] = useState("");
  
  const [description, setDescription] = useState("");
  const [msg, setMsg] = useState("");
  const [openedChannel, setOpenedChannel] = useState<Record<number, "whatsapp" | "telegram">>({});
  const [referringAppointmentId, setReferringAppointmentId] = useState<number | null>(null);
  const [referralFeedback, setReferralFeedback] = useState<{ appointmentId: number; text: string; warning?: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPatients = async () => {
      const res = await fetch(`/api/patients?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) setPatients(await res.json());
    };
    const t = setTimeout(fetchPatients, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    const fetchSurgeries = async () => {
      const res = await fetch(`/api/surgeries?date=${date}`);
      if (res.ok) setSurgeries(await res.json());
    };
    fetchSurgeries();
  }, [date]);

  async function handleBookSurgery(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient || !date || !selectedTime) {
      setMsg("لطفاً بیمار، تاریخ و ساعت جراحی را انتخاب کنید.");
      return;
    }

    const hospitalName = selectedHospitalIndex === -1 ? customHospital : HOSPITALS[selectedHospitalIndex].name;
    const hospitalAddress = selectedHospitalIndex === -1 ? customAddress : HOSPITALS[selectedHospitalIndex].address;

    if (!hospitalName) {
      setMsg("لطفاً بیمارستان را انتخاب یا وارد کنید.");
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      const res = await fetch("/api/surgeries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: selectedPatient.id,
          appointment_date: date,
          appointment_time: selectedTime,
          hospital_name: hospitalName,
          hospital_address: hospitalAddress,
          description,
        }),
      });

      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) {
        setMsg(data.error || "خطا در ثبت نوبت جراحی");
        return;
      }

      setMsg("نوبت جراحی ثبت شد. پیام آماده را از کارت نوبت در فهرست کناری برای بیمار ارسال کنید.");
      setSelectedTime("");
      setDescription("");
      setSelectedPatient(null);
      const r = await fetch(`/api/surgeries?date=${date}`);
      if (r.ok) setSurgeries(await r.json());
    } catch {
      setMsg("ارتباط با سرور برقرار نشد. پیش از ثبت دوباره، فهرست نوبت‌های همین روز را بررسی کنید.");
    } finally {
      setLoading(false);
    }
  }

  async function referToPhotographer(appointment: SurgeryAppointment) {
    const channel = openedChannel[appointment.id];
    if (!channel || referringAppointmentId !== null) return;
    setReferringAppointmentId(appointment.id);
    setReferralFeedback(null);
    try {
      const response = await fetch("/api/photography-referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointment_id: appointment.id, channel, confirmed_sent: true }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string; already_exists?: boolean; notificationWarning?: string };
      if (!response.ok) throw new Error(data.error || "ارجاع به عکاس ثبت نشد. دوباره تلاش کنید.");
      setReferralFeedback({
        appointmentId: appointment.id,
        text: data.notificationWarning || (data.already_exists ? "این نوبت قبلاً به عکاس ارجاع شده است." : "بیمار به صف عکاسی ارجاع شد."),
        warning: Boolean(data.notificationWarning),
      });
      const refreshed = await fetch(`/api/surgeries?date=${date}`);
      if (refreshed.ok) setSurgeries(await refreshed.json());
    } catch (error) {
      setReferralFeedback({
        appointmentId: appointment.id,
        text: error instanceof Error ? error.message : "ارتباط با سرور برقرار نشد. دوباره تلاش کنید.",
        warning: true,
      });
    } finally {
      setReferringAppointmentId(null);
    }
  }

  const bookedTimes = surgeries.map((s) => s.appointment_time);
  const inputClass = "border border-gray-200 rounded-xl p-3 w-full text-sm outline-none focus:border-brand-green bg-white";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* فرم ثبت نوبت جراحی */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm space-y-4">
        <h2 className="text-lg font-black text-gray-900">تعیین وقت اتاق عمل و انتخاب بیمارستان</h2>
        
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700">انتخاب بیمار</label>
          <input 
            className={inputClass} 
            placeholder="جستجوی بیمار با نام یا شماره..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
          <div className="max-h-32 overflow-y-auto space-y-1">
            {patients.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedPatient(p)}
                className={`p-2 rounded-xl cursor-pointer text-sm flex justify-between items-center transition-all ${
                  selectedPatient?.id === p.id ? "bg-brand-green text-white font-bold" : "bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <span>{p.first_name} {p.last_name} ({p.phone})</span>
                <span className="text-xs">پرونده: {p.daily_number}</span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleBookSurgery} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">تاریخ جراحی (شمسی)</label>
              <JalaliDatePicker value={date} onChange={(gDate) => setDate(gDate)} className={inputClass} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">انتخاب بیمارستان</label>
              <select
                className={inputClass}
                value={selectedHospitalIndex}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSelectedHospitalIndex(val);
                }}
              >
                {HOSPITALS.map((h, idx) => (
                  <option key={h.name} value={idx}>{h.name}</option>
                ))}
                <option value={-1}>سایر (ورود دستی)</option>
              </select>
            </div>
          </div>

          {selectedHospitalIndex === -1 && (
            <div className="grid grid-cols-2 gap-4">
              <input className={inputClass} placeholder="نام بیمارستان" value={customHospital} onChange={(e) => setCustomHospital(e.target.value)} required />
              <input className={inputClass} placeholder="آدرس بیمارستان" value={customAddress} onChange={(e) => setCustomAddress(e.target.value)} required />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">ساعت اتاق عمل</label>
            <div className="grid grid-cols-3 gap-2">
              {SURGERY_SLOTS.map((time) => {
                const isBooked = bookedTimes.includes(time);
                const isSelected = selectedTime === time;
                return (
                  <button
                    key={time}
                    type="button"
                    disabled={isBooked}
                    onClick={() => setSelectedTime(time)}
                    className={`py-2 rounded-xl text-sm font-mono font-bold transition-all ${
                      isBooked
                        ? "bg-gray-100 text-gray-300 line-through cursor-not-allowed"
                        : isSelected
                        ? "bg-brand-green text-white shadow-md"
                        : "bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>

          <textarea className={inputClass} rows={2} placeholder="توضیحات تکمیلی" value={description} onChange={(e) => setDescription(e.target.value)} />

          <button
            disabled={!selectedPatient || !selectedTime || loading}
            className="w-full bg-[#0e3b34] text-white font-bold p-3.5 rounded-xl disabled:opacity-50 transition-all shadow-md hover:bg-[#0a2924]"
          >
            {loading ? "در حال ثبت و ارسال..." : "ثبت قطعی نوبت و ارسال اطلاع‌رسانی"}
          </button>
        </form>

        {msg && <p className="text-sm text-center font-bold text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">{msg}</p>}

      </div>

      {/* لیست جراحی‌ها */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm space-y-4">
        <h2 className="text-lg font-black text-gray-900">جراحی‌های روز ({toJalaliDate(date)})</h2>
        <div className="space-y-3">
          {surgeries.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">هیچ جراحی‌ای ثبت نشده است.</p>
          ) : (
            surgeries.map((s) => (
              <div key={s.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-base text-gray-900">{s.first_name} {s.last_name}</p>
                    <p className="text-xs text-gray-500">پرونده {s.daily_number.toLocaleString("fa-IR")} · {s.phone}</p>
                  </div>
                  <span className="font-mono font-black text-brand-green text-base">{s.appointment_time}</span>
                </div>
                <p className="text-xs text-gray-600"><b>بیمارستان:</b> {s.hospital_name} {s.hospital_address ? `(${s.hospital_address})` : ""}</p>
                {s.photography_status ? (
                  <p className={`rounded-xl px-3 py-2 text-xs font-bold ${s.photography_status === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                    {s.photography_status === "completed" ? "عکاسی تکمیل شده" : "در انتظار عکاس"}
                    {s.photography_channel ? ` · پیام بیمار از طریق ${s.photography_channel === "whatsapp" ? "واتس‌اپ" : "تلگرام"} ارسال شده` : ""}
                  </p>
                ) : (
                  <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-3">
                    <p className="text-xs font-bold text-gray-700">۱. پیام نوبت را برای بیمار ارسال کنید:</p>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={s.whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => setOpenedChannel((current) => ({ ...current, [s.id]: "whatsapp" }))}
                        className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700"
                      >ارسال با واتس‌اپ</a>
                      <a
                        href={s.telegramUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => setOpenedChannel((current) => ({ ...current, [s.id]: "telegram" }))}
                        className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white hover:bg-sky-700"
                      >ارسال با تلگرام</a>
                    </div>
                    <details className="text-xs text-gray-600">
                      <summary className="cursor-pointer font-bold">متن پیام</summary>
                      <p className="mt-2 whitespace-pre-wrap leading-6">{s.patientMessageText}</p>
                    </details>
                    {openedChannel[s.id] && (
                      <button
                        type="button"
                        disabled={referringAppointmentId !== null}
                        onClick={() => referToPhotographer(s)}
                        className="w-full rounded-lg bg-brand-green px-3 py-2.5 text-xs font-bold text-white hover:bg-brand-green/90 disabled:cursor-wait disabled:opacity-60"
                      >
                        {referringAppointmentId === s.id ? "در حال ارجاع..." : "۲. پیام را ارسال کردم؛ ارجاع به عکاس"}
                      </button>
                    )}
                  </div>
                )}
                {referralFeedback?.appointmentId === s.id && (
                  <p role={referralFeedback.warning ? "alert" : "status"} className={`text-xs font-bold ${referralFeedback.warning ? "text-amber-700" : "text-emerald-700"}`}>
                    {referralFeedback.text}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
