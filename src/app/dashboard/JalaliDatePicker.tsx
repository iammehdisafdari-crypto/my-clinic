"use client";

import { useState, useRef, useEffect } from "react";
import * as jalaali from "jalaali-js";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { toGregorianDate, toJalaliDate, getTodayJalali } from "@/lib/jalali";

const PERSIAN_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد",
  "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر",
  "دی", "بهمن", "اسفند"
];

const WEEKDAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

function toFaDigits(str: string | number): string {
  const fa = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return String(str).replace(/[0-9]/g, (w) => fa[+w]);
}

export default function JalaliDatePicker({
  value,
  onChange,
  className,
}: {
  value: string; // تاریخ میلادی یا شمسی
  onChange: (gregorianDate: string) => void;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const getInitialJalali = () => {
    const raw = value ? toJalaliDate(value) : getTodayJalali();
    const parts = raw.split("/").map(Number);
    return {
      year: parts[0] > 1300 ? parts[0] : 1405,
      month: parts[1] || 1,
      day: parts[2] || 1,
    };
  };

  const initial = getInitialJalali();
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);
  const [selected, setSelected] = useState(initial);

  useEffect(() => {
    if (value) {
      const parts = toJalaliDate(value).split("/").map(Number);
      if (parts.length === 3 && parts[0] > 1300) {
        setSelected({ year: parts[0], month: parts[1], day: parts[2] });
        setViewYear(parts[0]);
        setViewMonth(parts[1]);
      }
    }
  }, [value]);

  // بستن پاپ‌آپ هنگام کلیک در فضای بیرون
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // محاسبات روزهای ماه جلالی
  const monthLength = jalaali.jalaaliMonthLength(viewYear, viewMonth);
  const firstDayGregorian = jalaali.toGregorian(viewYear, viewMonth, 1);
  const gDate = new Date(firstDayGregorian.gy, firstDayGregorian.gm - 1, firstDayGregorian.gd);
  const startingDayIndex = (gDate.getDay() + 1) % 7; // شروع از شنبه

  function prevMonth() {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function handleSelectDay(day: number) {
    const newSel = { year: viewYear, month: viewMonth, day };
    setSelected(newSel);
    const jalaliStr = `${newSel.year}/${String(newSel.month).padStart(2, "0")}/${String(day).padStart(2, "0")}`;
    const greg = toGregorianDate(jalaliStr);
    onChange(greg);
    setIsOpen(false);
  }

  const formattedDisplay = `${toFaDigits(selected.year)}/${toFaDigits(String(selected.month).padStart(2, "0"))}/${toFaDigits(String(selected.day).padStart(2, "0"))}`;

  return (
    <div ref={containerRef} className="relative w-full select-none">
      {/* دکمه / فیلد بازکننده تقویم */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={
          className ||
          "border border-gray-200 rounded-xl p-3 flex justify-between items-center w-full bg-white hover:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition-all text-right cursor-pointer"
        }
      >
        <span className="font-bold text-sm tracking-wide text-gray-800">
          {formattedDisplay}
        </span>
        <CalendarIcon size={18} className="text-emerald-700 shrink-0" />
      </button>

      {/* تقویم بازشونده */}
      {isOpen && (
        <div className="absolute z-50 top-full mt-2 right-0 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 animate-in fade-in zoom-in-95 duration-150">
          {/* هدر ماه و سال */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-gray-100">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
              title="ماه قبل"
            >
              <ChevronRight size={18} />
            </button>
            <span className="font-black text-sm text-gray-900">
              {PERSIAN_MONTHS[viewMonth - 1]} {toFaDigits(viewYear)}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
              title="ماه بعد"
            >
              <ChevronLeft size={18} />
            </button>
          </div>

          {/* روزهای هفته */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEKDAYS.map((w) => (
              <span key={w} className="text-[11px] font-bold text-gray-400 py-1">
                {w}
              </span>
            ))}
          </div>

          {/* ماتریس روزها */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startingDayIndex }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-8 w-8" />
            ))}

            {Array.from({ length: monthLength }).map((_, idx) => {
              const day = idx + 1;
              const isSelected =
                selected.year === viewYear &&
                selected.month === viewMonth &&
                selected.day === day;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 w-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                    isSelected
                      ? "bg-emerald-700 text-white shadow-md shadow-emerald-700/30 scale-105"
                      : "hover:bg-emerald-50 hover:text-emerald-800 text-gray-700 active:scale-95"
                  }`}
                >
                  {toFaDigits(day)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}