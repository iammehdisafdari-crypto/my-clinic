"use client";
import { useState, useEffect } from "react";
import { Upload } from "lucide-react";

type Patient = {
  id: number;
  daily_number: number;
  first_name: string;
  last_name: string;
  phone: string;
  surgery_type: string | null;
};

type MediaItem = {
  id: number;
  image_url: string;
  image_type: "before" | "after";
  created_at: string;
};

export default function UploaderClient() {
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [deletingMediaId, setDeletingMediaId] = useState<number | null>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [imageType, setImageType] = useState<"before" | "after">("before");
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
      return;
    }
    const fetchMedia = async () => {
      const res = await fetch(`/api/patients/${selectedPatient.id}/media`);
      if (res.ok) setMediaList(await res.json());
    };
    fetchMedia();
  }, [selectedPatient]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient || !file) {
      setMsg("لطفاً بیمار و فایل تصویر را انتخاب کنید.");
      return;
    }

    setLoading(true);
    setMsg("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("image_type", imageType);

    const res = await fetch(`/api/patients/${selectedPatient.id}/media`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setMsg("تصویر با موفقیت به پرونده بیمار اضافه شد.");
      setFile(null);
      const mRes = await fetch(`/api/patients/${selectedPatient.id}/media`);
      if (mRes.ok) setMediaList(await mRes.json());
    } else {
      setMsg(data.error || "خطا در ثبت تصویر");
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

  const inputClass = "border border-gray-200 rounded-xl p-3 w-full text-sm outline-none focus:border-brand-green bg-white";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* جستجو و انتخاب بیمار */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm space-y-4">
        <h2 className="text-lg font-black">انتخاب بیمار جهت عکاسی</h2>
        <input
          className={inputClass}
          placeholder="جستجوی بیمار با نام یا شماره..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="max-h-96 overflow-y-auto space-y-2">
          {patients.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedPatient(p)}
              className={`p-3.5 rounded-2xl cursor-pointer text-sm flex justify-between items-center transition-all ${
                selectedPatient?.id === p.id ? "bg-brand-green text-white font-bold shadow-md" : "bg-gray-50 hover:bg-gray-100"
              }`}
            >
              <div>
                <p className="font-bold">{p.first_name} {p.last_name}</p>
                <p className="text-xs opacity-80">تلفن: {p.phone} | جراحی: {p.surgery_type || "-"}</p>
              </div>
              <span className="text-xs font-mono">پرونده: {p.daily_number}</span>
            </div>
          ))}
        </div>
      </div>

      {/* فرم آپلود فایل و گالری */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm space-y-6">
        <h2 className="text-lg font-black">مدیریت تصاویر پرونده</h2>

        {selectedPatient ? (
          <div className="space-y-6">
            <div className="bg-emerald-50 p-4 rounded-2xl text-sm font-bold text-emerald-900 flex justify-between items-center">
              <span>بیمار: {selectedPatient.first_name} {selectedPatient.last_name}</span>
              <button onClick={() => setSelectedPatient(null)} className="text-xs text-red-600 underline">تغییر</button>
            </div>

            {/* فرم انتخاب فایل حرفه‌ای با آیکون و ظاهر مدرن */}
            <form onSubmit={handleUpload} className="space-y-4 bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <p className="font-bold text-sm">بارگذاری عکس از گالری یا دستگاه</p>
              
              <label className="border-2 border-dashed border-gray-300 hover:border-brand-green rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-white transition-all group">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-brand-green flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-sm">
                  <Upload size={22} />
                </div>
                <span className="text-sm font-bold text-gray-700 text-center">
                  {file ? file.name : "برای انتخاب تصویر کلیک کنید یا عکس را اینجا رها کنید"}
                </span>
                <span className="text-xs text-gray-400 mt-1">پشتیبانی از فرمت‌های رایج تصویر</span>
                
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                  required
                />
              </label>

              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                  <input
                    type="radio"
                    name="imageType"
                    checked={imageType === "before"}
                    onChange={() => setImageType("before")}
                  />
                  قبل از عمل
                </label>
                <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                  <input
                    type="radio"
                    name="imageType"
                    checked={imageType === "after"}
                    onChange={() => setImageType("after")}
                  />
                  بعد از عمل
                </label>
              </div>

              <button
                disabled={loading}
                className="w-full bg-brand-green text-white font-bold p-3.5 rounded-xl shadow-md transition-transform active:scale-95"
              >
                {loading ? "در حال آپلود و ثبت..." : "ثبت و افزودن به پرونده"}
              </button>
              {msg && <p className="text-xs font-bold text-center text-gray-700">{msg}</p>}
            </form>

            {/* گالری تصاویر */}
            <div className="space-y-3">
              <p className="font-bold text-sm">گالری تصاویر ثبت‌شده</p>
              <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                {mediaList.map((m) => (
                  <div key={m.id} className="border border-gray-200 rounded-xl p-2 space-y-2 bg-white">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-block ${m.image_type === 'before' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {m.image_type === 'before' ? 'قبل از عمل' : 'بعد از عمل'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setExpandedImage(m.image_url)}
                      aria-label="نمایش بزرگ تصویر پزشکی"
                      className="block w-full"
                    >
                      <img src={m.image_url} alt="پزشکی" className="w-full h-24 object-cover rounded-lg border border-gray-100" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteMedia(m)}
                      disabled={deletingMediaId === m.id}
                      className="w-full rounded-lg bg-red-50 px-2 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      {deletingMediaId === m.id ? "در حال حذف..." : "حذف مستند"}
                    </button>
                  </div>
                ))}
                {mediaList.length === 0 && (
                  <p className="col-span-2 text-xs text-gray-400 text-center py-4">هنوز عکسی برای این بیمار ثبت نشده است.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-20">لطفاً ابتدا یک بیمار را از لیست سمت چپ انتخاب کنید.</p>
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
