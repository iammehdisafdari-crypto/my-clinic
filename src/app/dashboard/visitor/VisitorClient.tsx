"use client";
import { useState, useEffect } from "react";

type Patient = {
  id: number;
  daily_number: number;
  first_name: string;
  last_name: string;
  phone: string;
};

const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00"
];

export default function VisitorClient() {
  // فرم بیمار
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [surgeryType, setSurgeryType] = useState("");
  const [notes, setNotes] = useState("");
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  // نوبت‌دهی
  const [date, setDate] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" }));
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // جستجوی پرونده‌های قبلی
  useEffect(() => {
    const fetchPatients = async () => {
      const res = await fetch(`/api/patients?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) setPatients(await res.json());
    };
    const t = setTimeout(fetchPatients, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  async function handleRegisterPatient(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/visitor-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          phone,
          surgery_type: surgeryType,
          notes,
          appointment_date: date,
          appointment_time: selectedTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "ثبت بیمار و نوبت انجام نشد.");
        return;
      }

      setMsg(`بیمار و نوبت مشاوره با موفقیت ثبت شدند. شماره پرونده: ${data.patient.daily_number} | تاریخ: ${date} | ساعت: ${selectedTime}`);
      setFirstName("");
      setLastName("");
      setPhone("");
      setSurgeryType("");
      setNotes("");
      setSelectedTime("");
      setDate(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" }));
      setBookedTimes((prev) => [...prev, selectedTime]);
    } catch {
      setMsg("ارتباط با سرور برقرار نشد. وضعیت ثبت را بررسی کنید و از ثبت تکراری خودداری کنید.");
    } finally {
      setLoading(false);
    }
  }

  async function handleBookAppointment() {
    if (!selectedPatient || !date || !selectedTime) {
      setMsg("لطفاً بیمار، تاریخ و ساعت مشاوره را انتخاب کنید.");
      return;
    }
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: selectedPatient.id,
          type: "consultation",
          appointment_date: date,
          appointment_time: selectedTime,
          description: "ثبت‌شده توسط ویزیتور",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "خطا در ثبت نوبت");
        return;
      }
      setMsg(`نوبت مشاوره برای ${selectedPatient.first_name} ${selectedPatient.last_name} در تاریخ ${date} ساعت ${selectedTime} ثبت شد.`);
      setSelectedTime("");
      setBookedTimes((prev) => [...prev, selectedTime]);
    } catch {
      setMsg("ارتباط با سرور برقرار نشد. وضعیت نوبت را بررسی کنید.");
    } finally {
      setLoading(false);
    }
  }

  // به‌روزرسانی اسلات‌های رزروشده برای تاریخ انتخابی
  useEffect(() => {
    let active = true;
    setBookedTimes([]);
    const fetchBooked = async () => {
      const res = await fetch(`/api/appointments?date=${date}&type=consultation`);
      if (res.ok) {
        const data = await res.json();
        if (active) setBookedTimes(data.map((item: any) => item.appointment_time));
      }
    };
    fetchBooked();
    return () => { active = false; };
  }, [date]);

  const inputClass = "border border-gray-200 rounded-xl p-3 w-full text-sm outline-none focus:border-brand-green";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white p-6 rounded-[2rem] shadow-sm space-y-4">
        <h2 className="text-lg font-black">ثبت مشخصات بیمار جدید و رزرو نوبت مشاوره</h2>
        <form onSubmit={handleRegisterPatient} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input className={inputClass} placeholder="نام *" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            <input className={inputClass} placeholder="نام خانوادگی *" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </div>
          <input className={inputClass} placeholder="شماره موبایل (۰۹...) *" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <input className={inputClass} placeholder="نوع جراحی پیشنهادی" value={surgeryType} onChange={(e) => setSurgeryType(e.target.value)} />
          <textarea className={inputClass} rows={2} placeholder="توضیحات بازاریابی یا منبع جذب" value={notes} onChange={(e) => setNotes(e.target.value)} />

          <div className="border-t border-gray-100 pt-4 space-y-3">
            <h3 className="font-bold text-sm">زمان نوبت مشاوره</h3>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">تاریخ مشاوره *</label>
              <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setSelectedTime(""); }} className={inputClass} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">ساعت مشاوره *</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {TIME_SLOTS.map((time) => {
                  const isBooked = bookedTimes.includes(time);
                  const isSelected = selectedTime === time;
                  return (
                    <button
                      key={time}
                      type="button"
                      disabled={isBooked}
                      onClick={() => setSelectedTime(time)}
                      className={`py-2.5 rounded-xl text-sm font-mono font-bold transition-all ${
                        isBooked ? "bg-gray-100 text-gray-300 cursor-not-allowed line-through"
                          : isSelected ? "bg-brand-green text-white shadow-md"
                          : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
                      }`}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
              {!selectedTime && <p className="text-xs text-gray-500">برای ثبت نهایی، یک ساعت آزاد انتخاب کنید.</p>}
            </div>
          </div>

          <button type="submit" disabled={loading || !selectedTime || !date} className="w-full bg-brand-green text-white font-bold p-3 rounded-xl transition-transform active:scale-95 disabled:opacity-50">
            {loading ? "در حال ثبت بیمار و نوبت..." : "ثبت بیمار و نوبت مشاوره"}
          </button>
        </form>

        {msg && <p role="status" className="text-sm text-center font-bold text-gray-700 bg-gray-50 p-3 rounded-xl">{msg}</p>}

        <div className="pt-4 border-t border-gray-100 space-y-3">
          <h3 className="font-bold text-sm">جستجوی پرونده‌های ثبت‌شده</h3>
          <input className={inputClass} placeholder="جستجو با نام یا شماره..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          <div className="max-h-40 overflow-y-auto space-y-2">
            {patients.map((p) => (
              <div key={p.id} onClick={() => setSelectedPatient(p)} className={`p-3 rounded-xl cursor-pointer text-sm flex justify-between items-center ${selectedPatient?.id === p.id ? "bg-brand-green text-white font-bold" : "bg-gray-50 hover:bg-gray-100"}`}>
                <span>{p.first_name} {p.last_name} ({p.phone})</span>
                <span className="text-xs">پرونده: {p.daily_number}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2rem] shadow-sm space-y-5">
        <h2 className="text-lg font-black">رزرو نوبت برای بیمار دارای پرونده</h2>
        {selectedPatient ? (
          <div className="bg-emerald-50 text-emerald-900 p-4 rounded-2xl text-sm font-bold flex justify-between items-center">
            <span>بیمار انتخاب‌شده: {selectedPatient.first_name} {selectedPatient.last_name}</span>
            <button type="button" onClick={() => setSelectedPatient(null)} className="text-xs text-red-600 underline">تغییر</button>
          </div>
        ) : (
          <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-xl">برای رزرو نوبت، ابتدا یک پرونده از فهرست پرونده‌های ثبت‌شده انتخاب کنید.</p>
        )}
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700">تاریخ مشاوره</label>
          <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setSelectedTime(""); }} className={inputClass} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700">ساعت مشاوره</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {TIME_SLOTS.map((time) => {
              const isBooked = bookedTimes.includes(time);
              const isSelected = selectedTime === time;
              return (
                <button key={time} type="button" disabled={isBooked} onClick={() => setSelectedTime(time)}
                  className={`py-2.5 rounded-xl text-sm font-mono font-bold transition-all ${isBooked ? "bg-gray-100 text-gray-300 cursor-not-allowed line-through" : isSelected ? "bg-brand-green text-white shadow-md" : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"}`}>
                  {time}
                </button>
              );
            })}
          </div>
        </div>
        <button type="button" disabled={!selectedPatient || !selectedTime || loading} onClick={handleBookAppointment}
          className="w-full bg-[#0e3b34] text-white font-bold p-3.5 rounded-xl disabled:opacity-50">
          {loading ? "در حال ثبت نوبت..." : "تأیید و ثبت نوبت مشاوره"}
        </button>
        {msg && <p role="status" className="text-sm text-center font-bold text-gray-700 bg-gray-50 p-3 rounded-xl">{msg}</p>}
      </div>
    </div>
  );
}