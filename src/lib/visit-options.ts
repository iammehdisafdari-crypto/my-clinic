// گزینه‌های فرم دکتر. برای اضافه یا کم کردن گزینه فقط همین فایل را ویرایش کنید.

export const NONE_LABEL = "ندارد";

export const WHEN_OPTIONS = ["کمتر از ۶ ماه", "۶ تا ۱۲ ماه", "۱ تا ۵ سال", "بیش از ۵ سال"];

export type HistoryKey = "diseases" | "meds" | "surgeries" | "injections" | "tattoo" | "substances";

export type HistoryQuestion = {
  key: HistoryKey;
  title: string; // عنوان سؤال
  items: string[]; // گزینه‌های تیک‌خور
  hasWhen: boolean; // آیا «زمان» هم پرسیده شود
  noteLabel: string; // عنوان کادر یک‌کلمه‌ای
};

export const HISTORY_QUESTIONS: HistoryQuestion[] = [
  {
    key: "diseases",
    title: "سوابق بیماری‌ها و زمان آن",
    items: [
      "دیابت",
      "فشار خون",
      "بیماری قلبی",
      "بیماری کلیه",
      "بیماری کبد",
      "آسم یا بیماری ریوی",
      "اختلال انعقاد خون",
      "بیماری تیروئید",
      "صرع",
      "بیماری خودایمنی",
    ],
    hasWhen: true,
    noteLabel: "سایر (یک کلمه)",
  },
  {
    key: "meds",
    title: "سوابق مصرف دارو و زمان آن",
    items: [
      "مسکن و ضدالتهاب",
      "آسپرین یا رقیق‌کننده خون",
      "داروی فشار خون",
      "داروی دیابت",
      "داروی هورمونی",
      "داروی روان‌پزشکی",
      "ایزوترتینوئین (روآکوتان)",
      "کورتون",
    ],
    hasWhen: true,
    noteLabel: "سایر (یک کلمه)",
  },
  {
    key: "surgeries",
    title: "سوابق جراحی‌های قبلی و زمان آن",
    items: ["جراحی بینی", "جراحی پلک", "لیپوساکشن", "جراحی شکم", "جراحی سینه", "جراحی صورت", "سایر جراحی‌ها"],
    hasWhen: true,
    noteLabel: "نام جراحی (یک کلمه)",
  },
  {
    key: "injections",
    title: "سابقه تزریق ژل و آنزیم",
    items: ["ژل", "آنزیم"],
    hasWhen: true,
    noteLabel: "محل تزریق (یک کلمه)",
  },
  {
    key: "tattoo",
    title: "خالکوبی یا تتو",
    items: ["دارد"],
    hasWhen: false,
    noteLabel: "محل (یک کلمه)",
  },
  {
    key: "substances",
    title: "دخانیات / مشروبات الکلی / مواد مخدر",
    items: ["دخانیات (سیگار/قلیان)", "مشروبات الکلی", "مواد مخدر"],
    hasWhen: false,
    noteLabel: "شرح (یک کلمه)",
  },
];