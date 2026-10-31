"use client";
import { useEffect, useState } from "react";
import { toJalaali, toGregorian, jalaaliMonthLength } from "jalaali-js";

type Appointment = {
  id: number;
  patient_id: number;
  appointment_date: string;
  appointment_time: string;
  status: string;
  first_name: string;
  last_name: string;
  phone: string;
};

const TIMES = ["09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00"];
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });
const input = "w-full rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/10";
const JALALI_MONTHS = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
const faNumber = (n: number) => n.toLocaleString("fa-IR");
function isoToJalali(value: string) {
  const [gy, gm, gd] = value.split("-").map(Number);
  return toJalaali(gy, gm, gd);
}
function jalaliToIso(jy: number, jm: number, jd: number) {
  const g = toGregorian(jy, jm, jd);
  return `${g.gy}-${String(g.gm).padStart(2,"0")}-${String(g.gd).padStart(2,"0")}`;
}
function formatJalaliDate(value: string) {
  if (!value) return "—";
  const j = isoToJalali(value);
  return `${faNumber(j.jy)}/${faNumber(j.jm).padStart(2,"۰")}/${faNumber(j.jd).padStart(2,"۰")}`;
}
function JalaliDateField({ value, onChange, minDate }: { value: string; onChange: (value: string) => void; minDate?: string }) {
  const initial = isoToJalali(value || today());
  const [parts, setParts] = useState({ jy: initial.jy, jm: initial.jm, jd: initial.jd });
  useEffect(() => {
    const j = isoToJalali(value || today());
    setParts({ jy: j.jy, jm: j.jm, jd: j.jd });
  }, [value]);
  const currentYear = isoToJalali(today()).jy;
  const days = jalaaliMonthLength(parts.jy, parts.jm);
  function update(next: { jy: number; jm: number; jd: number }) {
    const safe = { ...next, jd: Math.min(next.jd, jalaaliMonthLength(next.jy, next.jm)) };
    setParts(safe);
    const iso = jalaliToIso(safe.jy, safe.jm, safe.jd);
    if (!minDate || iso >= minDate) onChange(iso);
  }
  const selectClass = input + " min-w-0";
  return <div className="grid grid-cols-3 gap-2" dir="rtl">
    <select aria-label="روز" className={selectClass} value={parts.jd} onChange={e => update({ ...parts, jd: Number(e.target.value) })}>
      {Array.from({ length: days }, (_, i) => i + 1).map(day => <option key={day} value={day}>{faNumber(day)}</option>)}
    </select>
    <select aria-label="ماه" className={selectClass} value={parts.jm} onChange={e => update({ ...parts, jm: Number(e.target.value) })}>
      {JALALI_MONTHS.map((month, i) => <option key={month} value={i + 1}>{month}</option>)}
    </select>
    <select aria-label="سال" className={selectClass} value={parts.jy} onChange={e => update({ ...parts, jy: Number(e.target.value) })}>
      {Array.from({ length: 5 }, (_, i) => currentYear - 1 + i).map(year => <option key={year} value={year}>{faNumber(year)}</option>)}
    </select>
  </div>;
}


export default function VisitorRegistrationForm() {
  const [form, setForm] = useState({
    first_name: "", last_name: "", father_name: "", age: "", phone: "",
    national_id: "", marital_status: "", referral_source: "",
    surgery_type: "", surgeon_name: "", appointment_date: today(), appointment_time: ""
  });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [booked, setBooked] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editBooked, setEditBooked] = useState<string[]>([]);

  async function loadAppointments() {
    const response = await fetch("/api/appointments?mine=1&type=consultation");
    if (response.ok) setAppointments(await response.json());
  }

  useEffect(() => { loadAppointments(); }, []);

  useEffect(() => {
    let active = true;
    if (!form.appointment_date) return;
    fetch(`/api/appointments?date=${form.appointment_date}&type=consultation`)
      .then(r => r.ok ? r.json() : [])
      .then((rows: Appointment[]) => { if (active) setBooked(rows.map(row => row.appointment_time)); })
      .catch(() => { if (active) setBooked([]); });
    return () => { active = false; };
  }, [form.appointment_date]);

  useEffect(() => {
    let active = true;
    if (!editDate) return;
    fetch(`/api/appointments?date=${editDate}&type=consultation`)
      .then(r => r.ok ? r.json() : [])
      .then((rows: Appointment[]) => {
        if (active) setEditBooked(rows.filter(row => row.id !== editing?.id).map(row => row.appointment_time));
      })
      .catch(() => { if (active) setEditBooked([]); });
    return () => { active = false; };
  }, [editDate, editing?.id]);

  function change(key: keyof typeof form, value: string) {
    setForm(current => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    if (booked.includes(form.appointment_time)) {
      setMessage("این ساعت قبلاً رزرو شده است؛ ساعت دیگری انتخاب کنید.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/visitor-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "ثبت اطلاعات انجام نشد");
      setMessage(`اطلاعات بیمار و نوبت مراجعه با موفقیت ثبت شد. شماره پرونده: ${data.patient?.daily_number ?? "ثبت شد"}`);
      setForm({
        first_name: "", last_name: "", father_name: "", age: "", phone: "",
        national_id: "", marital_status: "", referral_source: "",
        surgery_type: "", surgeon_name: "", appointment_date: today(), appointment_time: ""
      });
      await loadAppointments();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "خطا در ثبت اطلاعات");
    } finally {
      setLoading(false);
    }
  }

  async function saveReschedule() {
    if (!editing || !editDate || !editTime) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/appointments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id, appointment_date: editDate, appointment_time: editTime })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تغییر زمان مراجعه انجام نشد");
      setEditing(null);
      setMessage("تاریخ و ساعت مراجعه با موفقیت تغییر کرد.");
      await loadAppointments();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "خطا در تغییر زمان مراجعه");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6">
          <h2 className="text-xl font-black text-gray-900">ثبت بیمار و زمان مراجعه</h2>
          <p className="mt-1 text-sm text-gray-500">تمام اطلاعات و نوبت مراجعه در یک مرحله ثبت می‌شوند.</p>
        </div>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-bold">نام *
              <input className={input} value={form.first_name} onChange={e => change("first_name",e.target.value)} required />
            </label>
            <label className="space-y-1.5 text-sm font-bold">نام خانوادگی *
              <input className={input} value={form.last_name} onChange={e => change("last_name",e.target.value)} required />
            </label>
            <label className="space-y-1.5 text-sm font-bold">نام پدر
              <input className={input} value={form.father_name} onChange={e => change("father_name",e.target.value)} />
            </label>
            <label className="space-y-1.5 text-sm font-bold">سن
              <input className={input} type="number" min="1" max="120" value={form.age} onChange={e => change("age",e.target.value)} />
            </label>
            <label className="space-y-1.5 text-sm font-bold">شماره تماس *
              <input className={input} inputMode="numeric" dir="ltr" placeholder="09123456789" value={form.phone} onChange={e => change("phone",e.target.value)} required />
            </label>
            <label className="space-y-1.5 text-sm font-bold">کد ملی
              <input className={input} inputMode="numeric" dir="ltr" maxLength={10} value={form.national_id} onChange={e => change("national_id",e.target.value)} />
            </label>
            <label className="space-y-1.5 text-sm font-bold">وضعیت تأهل
              <select className={input} value={form.marital_status} onChange={e => change("marital_status",e.target.value)}>
                <option value="">انتخاب کنید</option><option value="مجرد">مجرد</option><option value="متأهل">متأهل</option><option value="سایر">سایر</option>
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-bold">نام معرف
              <input className={input} value={form.referral_source} onChange={e => change("referral_source",e.target.value)} />
            </label>
            <label className="space-y-1.5 text-sm font-bold">نوع جراحی
              <input className={input} value={form.surgery_type} onChange={e => change("surgery_type",e.target.value)} />
            </label>
            <label className="space-y-1.5 text-sm font-bold">نام جراح
              <input className={input} value={form.surgeon_name} onChange={e => change("surgeon_name",e.target.value)} />
            </label>
            <label className="space-y-1.5 text-sm font-bold">تاریخ مراجعه *
              <JalaliDateField value={form.appointment_date} minDate={today()} onChange={date => setForm(v => ({...v,appointment_date:date,appointment_time:""}))} />
            </label>
            <label className="space-y-1.5 text-sm font-bold">ساعت مراجعه *
              <select className={input} value={form.appointment_time} onChange={e => change("appointment_time",e.target.value)} required>
                <option value="">انتخاب ساعت</option>
                {TIMES.map(time => <option key={time} value={time} disabled={booked.includes(time)}>{time}{booked.includes(time) ? " — رزرو شده" : ""}</option>)}
              </select>
            </label>
          </div>
          <button type="submit" disabled={loading || !form.appointment_time} className="w-full rounded-xl bg-brand-green p-3.5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? "در حال ثبت..." : "ثبت نهایی بیمار و مراجعه"}
          </button>
        </form>
      </section>

      {message && <p role="status" className="rounded-xl border border-gray-200 bg-white p-4 text-center text-sm font-bold text-gray-700">{message}</p>}

      <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-4">
          <h2 className="text-lg font-black">مراجعه‌های ثبت‌شده توسط من</h2>
          <p className="mt-1 text-sm text-gray-500">در صورت تغییر برنامه بیمار، تاریخ و ساعت نوبت‌های در انتظار را ویرایش کنید.</p>
        </div>
        <div className="space-y-3">
          {appointments.map(item => (
            <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold">{item.first_name} {item.last_name}</p>
                <p className="mt-1 text-sm text-gray-500" dir="ltr">{item.phone}</p>
                <p className="mt-1 text-sm text-gray-600">{formatJalaliDate(item.appointment_date)} — {item.appointment_time}</p>
              </div>
              {(item.status === "pending" || item.status === "confirmed") && <button type="button" onClick={() => { setEditing(item); setEditDate(item.appointment_date); setEditTime(item.appointment_time); }} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold hover:bg-gray-50">تغییر تاریخ و ساعت</button>}
            </div>
          ))}
          {appointments.length === 0 && <p className="py-6 text-center text-sm text-gray-400">هنوز مراجعه‌ای ثبت نشده است.</p>}
        </div>
      </section>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <section className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-black">ویرایش زمان مراجعه</h3>
            <p className="text-sm text-gray-600">{editing.first_name} {editing.last_name}</p>
            <label className="block space-y-1 text-sm font-bold">تاریخ جدید
              <JalaliDateField value={editDate} minDate={today()} onChange={date => { setEditDate(date); setEditTime(""); }} />
            </label>
            <label className="block space-y-1 text-sm font-bold">ساعت جدید
              <select className={input} value={editTime} onChange={e => setEditTime(e.target.value)}>
                <option value="">انتخاب ساعت</option>
                {TIMES.map(time => <option key={time} value={time} disabled={editBooked.includes(time)}>{time}{editBooked.includes(time) ? " — رزرو شده" : ""}</option>)}
              </select>
            </label>
            <div className="flex gap-2">
              <button type="button" disabled={loading || !editDate || !editTime} onClick={saveReschedule} className="flex-1 rounded-xl bg-brand-green p-3 text-sm font-bold text-white disabled:opacity-50">ذخیره تغییرات</button>
              <button type="button" disabled={loading} onClick={() => setEditing(null)} className="rounded-xl border border-gray-200 px-4 text-sm font-bold">انصراف</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
