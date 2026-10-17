"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { KeyRound, X, Check, Eye, EyeOff, Lock, AlertCircle } from "lucide-react";

export default function ChangePasswordModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    }
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function handleClose() {
    setIsOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setMessage(null);
    setShowPass(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));
      setLoading(false);

      if (res.ok) {
        setMessage({ text: data.message || "رمز عبور با موفقیت به‌روزرسانی شد", isError: false });
        setTimeout(() => {
          handleClose();
        }, 1200);
      } else {
        setMessage({ text: data.error || "خطا در تغییر کلمه عبور", isError: true });
      }
    } catch {
      setLoading(false);
      setMessage({ text: "ارتباط با سرور برقرار نشد", isError: true });
    }
  }

  const modalContent = isOpen ? (
    <div
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md transition-all duration-200 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 md:p-7 text-right font-sans relative overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* نوار رنگی بالای مودال */}
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

        {/* دکمه بستن گوشه بالا */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute left-4 top-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-95 rounded-xl transition-all cursor-pointer"
          title="بستن پنجره"
        >
          <X size={18} />
        </button>

        {/* هدر */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100/80 shadow-inner">
            <Lock size={22} className="stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              تغییر رمز عبور حساب
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              برای امنیت حساب کاربری، رمز جدید را تعیین کنید
            </p>
          </div>
        </div>

        {/* فرم تغییر رمز */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              رمز عبور فعلی
            </label>
            <input
              type="password"
              required
              autoFocus
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono tracking-wider focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all dir-ltr text-right"
              dir="ltr"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">رمز عبور جدید</label>
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="text-[11px] font-medium text-slate-500 hover:text-emerald-600 transition-colors flex items-center gap-1.5 cursor-pointer select-none"
              >
                {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{showPass ? "پنهان کردن" : "نمایش رمز"}</span>
              </button>
            </div>
            <input
              type={showPass ? "text" : "password"}
              required
              placeholder="حداقل ۶ کاراکتر"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono tracking-wider focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all dir-ltr text-right placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400"
              dir="ltr"
            />
          </div>

          {message && (
            <div
              className={`p-3 rounded-2xl text-xs font-medium flex items-center gap-2 border animate-in fade-in ${
                message.isError
                  ? "bg-rose-50 text-rose-700 border-rose-200/80"
                  : "bg-emerald-50 text-emerald-800 border-emerald-200/80"
              }`}
            >
              {message.isError ? (
                <AlertCircle size={16} className="text-rose-500 shrink-0" />
              ) : (
                <Check size={16} className="text-emerald-600 shrink-0" />
              )}
              <span className="leading-relaxed">{message.text}</span>
            </div>
          )}

          {/* دکمه‌های انصراف و ثبت */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-xl border border-slate-200 transition-all duration-150 cursor-pointer shadow-2xs"
            >
              انصراف
            </button>

            <button
              type="submit"
              disabled={loading}
              className="relative px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-md hover:shadow-lg hover:shadow-emerald-600/25 transition-all duration-150 cursor-pointer flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>در حال ثبت...</span>
                </>
              ) : (
                <>
                  <Check size={15} />
                  <span>ذخیره رمز جدید</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group flex items-center justify-center gap-1.5 w-full py-2 px-2.5 rounded-xl text-xs font-bold text-white bg-white/10 border border-white/20 transition-all duration-200 cursor-pointer select-none active:scale-95 hover:!bg-white hover:!border-white hover:shadow-lg"
        title="تغییر رمز عبور حساب"
      >
        <KeyRound
          size={14}
          className="shrink-0 text-white transition-colors duration-200 group-hover:!text-black"
        />
        <span className="whitespace-nowrap transition-colors duration-200 group-hover:!text-black">
          تغییر رمز
        </span>
      </button>

      {mounted && typeof document !== "undefined" && createPortal(modalContent, document.body)}
    </>
  );
}