"use client";

import { useEffect, useState } from "react";

type Person = {
  id: number;
  lifecycle_stage: "lead" | "patient";
  first_name: string;
  last_name: string;
  phone: string;
  age?: number | null;
  surgery_type?: string | null;
  referral_source?: string | null;
  notes?: string | null;
  daily_number?: number | null;
  can_edit?: boolean;
};
type Appointment = {
  id: number;
  patient_id: number;
  appointment_date: string;
  appointment_time: string;
  status: string;
  attendance_status: string;
  type: string;
  first_name: string;
  last_name: string;
};
type AppointmentEvent = {
  id: number;
  event_type: string;
  old_date: string | null;
  old_time: string | null;
  new_date: string | null;
  new_time: string | null;
  reason: string | null;
};
const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00"
];
const EMPTY_FORM = { first_name: "", last_name: "", phone: "", surgery_type: "", referral_source: "", notes: "" };

function statusLabel(a: Appointment) {
  if (a.status === "cancelled") return "لغوشده";
  if (a.attendance_status === "no_show") return "عدم مراجعه";
  if (a.attendance_status === "attended" || a.status === "completed") return "انجام‌شده";
  if (a.status === "confirmed") return "تأییدشده";
  return "در انتظار تأیید";
}

export default function VisitorClient() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [duplicates, setDuplicates] = useState<Person[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [date, setDate] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" }));
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
  const [history, setHistory] = useState<Appointment[]>([]);
  const [historyEvents, setHistoryEvents] = useState<AppointmentEvent[]>([]);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: "", last_name: "", phone: "", age: "", surgery_type: "", referral_source: "", notes: "" });
  const [rescheduleId, setRescheduleId] = useState<number | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState(date);
  const [rescheduleTime, setRescheduleTime] = useState("");

  async function loadPeople(query = searchQuery) {
    const response = await fetch("/api/people?q=" + encodeURIComponent(query));
    if (response.ok) setPeople(await response.json());
  }
  async function loadMine() {
    const response = await fetch("/api/appointments?mine=1");
    if (response.ok) setMyAppointments(await response.json());
  }
  async function loadBooked() {
    const response = await fetch("/api/appointments?date=" + encodeURIComponent(date) + "&type=consultation");
    if (response.ok) {
      const rows = await response.json();
      // The legacy unique slot constraint still reserves cancelled slots; mirror it in the picker.
      setBookedTimes(rows.map((item: { appointment_time: string }) => item.appointment_time));
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => loadPeople(), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  useEffect(() => { loadBooked(); }, [date]);
  useEffect(() => { loadMine(); }, []);

  useEffect(() => {
    if (!selectedPerson) {
      setHistory([]);
      setHistoryEvents([]);
      setEditing(false);
      return;
    }
    fetch("/api/people/" + selectedPerson.id)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        setHistory(data?.appointments ?? []);
        setHistoryEvents(data?.appointment_events ?? []);
      })
      .catch(() => setHistory([]));
    setEditForm({
      first_name: selectedPerson.first_name,
      last_name: selectedPerson.last_name,
      phone: selectedPerson.phone,
      age: selectedPerson.age == null ? "" : String(selectedPerson.age),
      surgery_type: selectedPerson.surgery_type ?? "",
      referral_source: selectedPerson.referral_source ?? "",
      notes: selectedPerson.notes ?? ""
    });
    setEditing(false);
  }, [selectedPerson?.id]);

  async function createLead(confirmDuplicate = false) {
    setMessage("");
    setLoading(true);
    const response = await fetch("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, confirm_duplicate: confirmDuplicate })
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);
    if (response.status === 409 && Array.isArray(data.duplicates)) {
      setDuplicates(data.duplicates);
      setMessage(data.error || "شماره تماس قبلاً ثبت شده است.");
      return;
    }
    if (!response.ok || !data.person) {
      setMessage(data.error || "ثبت متقاضی انجام نشد.");
      return;
    }
    setSelectedPerson(data.person);
    setDuplicates([]);
    setForm(EMPTY_FORM);
    setMessage("پروفایل متقاضی ثبت شد. هنوز پرونده پزشکی تشکیل نشده است.");
    await loadPeople("");
  }

  async function bookAppointment() {
    if (!selectedPerson || !date || !selectedTime) {
      setMessage("لطفاً شخص، تاریخ و ساعت مشاوره را انتخاب کنید.");
      return;
    }
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: selectedPerson.id, type: "consultation",
        appointment_date: date, appointment_time: selectedTime,
        description: "ثبت‌شده توسط ویزیتور"
      })
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error || "ثبت نوبت انجام نشد.");
      return;
    }
    setMessage("نوبت مشاوره ثبت شد.");
    setSelectedTime("");
    await Promise.all([loadBooked(), loadMine()]);
  }

  async function updateAppointment(id: number, action: string, extra: Record<string, string> = {}) {
    const response = await fetch("/api/appointments/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error || "تغییر نوبت انجام نشد.");
      return;
    }
    setMessage("تغییر نوبت ثبت شد و در تاریخچه باقی ماند.");
    setRescheduleId(null);
    await Promise.all([loadMine(), loadBooked()]);
    if (selectedPerson) {
      const profile = await fetch("/api/people/" + selectedPerson.id);
      if (profile.ok) {
        const data = await profile.json();
        setHistory(data.appointments ?? []);
        setHistoryEvents(data.appointment_events ?? []);
      }
    }
  }

  async function savePerson() {
    if (!selectedPerson) return;
    const response = await fetch("/api/people/" + selectedPerson.id, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error || "ویرایش اطلاعات انجام نشد.");
      return;
    }
    const updated = { ...selectedPerson, ...editForm, age: editForm.age ? Number(editForm.age) : null };
    setSelectedPerson(updated);
    setEditing(false);
    setMessage("اطلاعات پروفایل به‌روزرسانی شد.");
    await loadPeople();
  }

  const inputClass = "border border-gray-200 rounded-xl p-3 w-full text-sm outline-none focus:border-emerald-600";
  const field = (key: keyof typeof EMPTY_FORM, label: string, required = false) => (
    <input className={inputClass} placeholder={label} value={form[key]} required={required}
      onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="bg-white p-6 rounded-[2rem] shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-black">۱. ثبت متقاضی جدید</h2>
            <p className="text-xs text-gray-500 mt-1">در این مرحله فقط پروفایل شخص ساخته می‌شود؛ پرونده پزشکی بعد از پذیرش تشکیل خواهد شد.</p>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); createLead(); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {field("first_name", "نام *", true)}
              {field("last_name", "نام خانوادگی *", true)}
            </div>
            {field("phone", "شماره موبایل (۰۹...) *", true)}
            {field("surgery_type", "نوع درخواست / جراحی")}
            {field("referral_source", "منبع آشنایی")}
            <textarea className={inputClass} rows={2} placeholder="یادداشت اولیه متقاضی" value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            <button disabled={loading} className="w-full bg-emerald-800 text-white font-bold p-3 rounded-xl disabled:opacity-50">
              {loading ? "در حال ثبت..." : "ثبت پروفایل متقاضی"}
            </button>
          </form>

          {duplicates.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <p className="text-sm font-bold text-amber-900">پروفایل‌هایی با این شماره پیدا شدند. شخص درست را انتخاب کنید یا ثبت شخص جدید با همین شماره را تأیید کنید.</p>
              {duplicates.map((person) => (
                <button key={person.id} type="button" onClick={() => { setSelectedPerson(person); setDuplicates([]); }}
                  className="w-full text-right rounded-xl bg-white p-3 text-sm">
                  {person.first_name} {person.last_name} — {person.lifecycle_stage === "patient" ? "بیمار" : "متقاضی"}
                </button>
              ))}
              <button type="button" disabled={loading} onClick={() => createLead(true)} className="text-sm font-bold text-amber-900 underline">
                ثبت به‌عنوان شخص جدید با همین شماره
              </button>
            </div>
          )}

          <div className="border-t border-gray-100 pt-4 space-y-3">
            <h3 className="font-bold text-sm">جستجو و انتخاب پروفایل موجود</h3>
            <input className={inputClass} placeholder="نام یا شماره موبایل..." value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)} />
            <div className="max-h-64 overflow-y-auto space-y-2">
              {people.map((person) => (
                <button key={person.id} type="button" onClick={() => setSelectedPerson(person)}
                  className={"w-full p-3 rounded-xl text-right text-sm flex justify-between gap-2 items-center " +
                    (selectedPerson?.id === person.id ? "bg-emerald-800 text-white" : "bg-gray-50 hover:bg-gray-100")}>
                  <span>{person.first_name} {person.last_name} · {person.phone}</span>
                  <span className="text-xs shrink-0">{person.lifecycle_stage === "patient" ? "بیمار" : "متقاضی"}</span>
                </button>
              ))}
              {people.length === 0 && <p className="text-xs text-gray-400 text-center p-3">موردی پیدا نشد.</p>}
            </div>
          </div>
        </section>

        <section className="bg-white p-6 rounded-[2rem] shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-black">۲. رزرو نوبت مشاوره</h2>
            <p className="text-xs text-gray-500 mt-1">هر شخص می‌تواند چند نوبت مستقل داشته باشد.</p>
          </div>
          {selectedPerson ? (
            <div className="bg-emerald-50 text-emerald-900 p-4 rounded-2xl space-y-2">
              <div className="flex justify-between gap-3 items-center">
                <div>
                  <p className="font-bold">{selectedPerson.first_name} {selectedPerson.last_name}</p>
                  <p className="text-xs">{selectedPerson.phone} · {selectedPerson.lifecycle_stage === "patient" ? "بیمار" : "متقاضی"}</p>
                </div>
                <button type="button" onClick={() => setSelectedPerson(null)} className="text-xs underline">تغییر شخص</button>
              </div>
              {selectedPerson.can_edit && (
                <button type="button" onClick={() => setEditing(!editing)} className="text-xs underline font-bold">ویرایش اطلاعات پروفایل</button>
              )}
              {editing && selectedPerson.can_edit && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  <input className={inputClass} value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} placeholder="نام" />
                  <input className={inputClass} value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} placeholder="نام خانوادگی" />
                  <input className={inputClass} value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="موبایل" />
                  <input className={inputClass} value={editForm.age} onChange={(e) => setEditForm({ ...editForm, age: e.target.value })} placeholder="سن" />
                  <input className={inputClass} value={editForm.surgery_type} onChange={(e) => setEditForm({ ...editForm, surgery_type: e.target.value })} placeholder="نوع درخواست" />
                  <input className={inputClass} value={editForm.referral_source} onChange={(e) => setEditForm({ ...editForm, referral_source: e.target.value })} placeholder="منبع آشنایی" />
                  <textarea className={inputClass + " sm:col-span-2"} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="یادداشت" />
                  <button type="button" onClick={savePerson} className="sm:col-span-2 bg-emerald-800 text-white rounded-xl p-2 font-bold">ذخیره تغییرات</button>
                </div>
              )}
              {selectedPerson.lifecycle_stage === "patient" && <p className="text-xs">شماره پرونده: {selectedPerson.daily_number ?? "در پرونده بیمار"}</p>}
            </div>
          ) : (
            <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-xl">ابتدا یک متقاضی یا بیمار را ثبت یا انتخاب کنید.</p>
          )}

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">تاریخ مشاوره</label>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">ساعت مشاوره</label>
            <div className="grid grid-cols-4 gap-2">
              {TIME_SLOTS.map((time) => {
                const booked = bookedTimes.includes(time);
                const selected = selectedTime === time;
                return (
                  <button key={time} type="button" disabled={booked} onClick={() => setSelectedTime(time)}
                    className={"py-2.5 rounded-xl text-sm font-mono font-bold " +
                      (booked ? "bg-gray-100 text-gray-300 line-through cursor-not-allowed" :
                        selected ? "bg-emerald-800 text-white" : "bg-gray-50 text-gray-700 border border-gray-200")}>
                    {time}
                  </button>
                );
              })}
            </div>
          </div>
          <button disabled={!selectedPerson || !selectedTime || loading} onClick={bookAppointment}
            className="w-full bg-[#0e3b34] text-white font-bold p-3.5 rounded-xl disabled:opacity-50">
            {loading ? "در حال ثبت..." : "ثبت نوبت مشاوره"}
          </button>
          {history.length > 0 && (
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <h3 className="font-bold text-sm">تاریخچه نوبت‌های این شخص</h3>
              {history.slice(0, 5).map((appointment) => (
                <div key={appointment.id} className="text-xs flex justify-between gap-2 bg-gray-50 rounded-lg p-2">
                  <span>{appointment.appointment_date} · {appointment.appointment_time}</span>
                  <span>{statusLabel(appointment)}</span>
                </div>
              ))}
              {historyEvents.slice(0, 8).map((event) => (
                <div key={event.id} className="text-[11px] text-gray-500 border-r-2 border-emerald-200 pr-2 py-1">
                  {event.event_type === "rescheduled"
                    ? "تغییر زمان: " + (event.old_date || "—") + " " + (event.old_time || "") + " ← " + (event.new_date || "—") + " " + (event.new_time || "")
                    : event.event_type === "status_changed" ? "تغییر وضعیت نوبت" :
                      event.event_type === "attendance_changed" ? "ثبت وضعیت مراجعه" :
                        event.event_type === "created" ? "ثبت نوبت" : "رویداد نوبت"}
                  {event.reason ? " · " + event.reason : ""}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="bg-white p-6 rounded-[2rem] shadow-sm space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div>
            <h2 className="text-lg font-black">۳. نوبت‌های ثبت‌شده توسط شما</h2>
            <p className="text-xs text-gray-500 mt-1">لغو، عدم مراجعه و تغییر زمان حذف نمی‌شوند و در تاریخچه باقی می‌مانند.</p>
          </div>
          <button type="button" onClick={loadMine} className="text-xs underline">به‌روزرسانی</button>
        </div>
        <div className="space-y-3">
          {myAppointments.map((appointment) => (
            <div key={appointment.id} className="border border-gray-100 rounded-2xl p-3 space-y-3">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-bold text-sm">{appointment.first_name} {appointment.last_name}</p>
                  <p className="text-xs text-gray-500">{appointment.appointment_date} · {appointment.appointment_time}</p>
                </div>
                <span className="text-xs bg-gray-100 rounded-full px-3 py-1 h-fit">{statusLabel(appointment)}</span>
              </div>
              {appointment.status !== "cancelled" && appointment.attendance_status !== "no_show" && appointment.status !== "completed" && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => updateAppointment(appointment.id, "confirm")} className="text-xs rounded-lg bg-emerald-50 text-emerald-800 px-3 py-2">تأیید</button>
                  <button type="button" onClick={() => updateAppointment(appointment.id, "cancel", { reason: "لغو توسط ویزیتور" })} className="text-xs rounded-lg bg-red-50 text-red-700 px-3 py-2">لغو</button>
                  <button type="button" onClick={() => updateAppointment(appointment.id, "no_show", { reason: "عدم مراجعه" })} className="text-xs rounded-lg bg-amber-50 text-amber-800 px-3 py-2">عدم مراجعه</button>
                  <button type="button" onClick={() => updateAppointment(appointment.id, "attended", { reason: "مراجعه انجام شد" })} className="text-xs rounded-lg bg-blue-50 text-blue-800 px-3 py-2">مراجعه انجام شد</button>
                  <button type="button" onClick={() => { setRescheduleId(rescheduleId === appointment.id ? null : appointment.id); setRescheduleDate(appointment.appointment_date); setRescheduleTime(appointment.appointment_time); }} className="text-xs rounded-lg border px-3 py-2">تغییر زمان</button>
                </div>
              )}
              {rescheduleId === appointment.id && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input type="date" className={inputClass} value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} />
                  <input type="time" className={inputClass} value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} />
                  <button type="button" onClick={() => updateAppointment(appointment.id, "reschedule", {
                    appointment_date: rescheduleDate, appointment_time: rescheduleTime, reason: "تغییر زمان توسط ویزیتور"
                  })} className="bg-emerald-800 text-white rounded-xl p-2 text-sm font-bold">ثبت زمان جدید</button>
                </div>
              )}
            </div>
          ))}
          {myAppointments.length === 0 && <p className="text-sm text-gray-400 text-center py-5">هنوز نوبتی توسط شما ثبت نشده است.</p>}
        </div>
      </section>

      {message && <p role="status" className="text-sm text-center font-bold text-gray-700 bg-gray-50 p-3 rounded-xl">{message}</p>}
    </div>
  );
}
