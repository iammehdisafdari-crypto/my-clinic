import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-brand-muted font-sans" dir="rtl">
      {/* Header */}
      <header className="p-6 flex justify-between items-center bg-white shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-green rounded-lg shadow-lg shadow-brand-green/20"></div>
          <span className="text-xl font-black text-brand-dark tracking-tight">پنل مدیریت پزشکی</span>
        </div>
        <Link 
          href="/login" 
          className="bg-brand-dark text-white px-6 py-2 rounded-full font-bold hover:bg-brand-green transition-all"
        >
          ورود اعضا
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        {/* Hero Section */}
        <div className="max-w-2xl">
          <h1 className="text-5xl md:text-6xl font-black text-brand-dark leading-tight mb-6">
            مدیریت هوشمند <span className="text-brand-green">نوبت‌دهی</span> و اتاق عمل
          </h1>
          <p className="text-zinc-600 text-lg leading-relaxed mb-10">
            سیستم یکپارچه مدیریت بیماران، برنامه‌ریزی جراحی‌ها و مشاوره آنلاین. 
            طراحی شده برای دقت بالا و امنیت حداکثری اطلاعات پزشکی.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-brand-dark px-10 text-white font-bold transition-all hover:bg-brand-green hover:scale-105 active:scale-95 shadow-xl shadow-brand-dark/10"
            >
              ورود به پنل ویزیتورها
            </Link>
            <div className="flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-brand-dark/10 bg-white px-10 text-brand-dark font-bold">
              نسخه ۱.۰.۰
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 w-full max-w-5xl">
          {[
            { title: "نوبت‌دهی جراحی", desc: "مدیریت زمان‌بندی اتاق عمل", icon: "🏥" },
            { title: "مشاوره آنلاین", desc: "تعریف و مدیریت تایم‌های مشاوره", icon: "💬" },
            { title: "آرشیو تصاویر", desc: "بارگذاری ایمن عکس‌های قبل و بعد", icon: "📸" },
          ].map((item, index) => (
            <div key={index} className="bg-white p-8 rounded-3xl border border-zinc-100 text-right hover:border-brand-green transition-colors">
              <div className="text-3xl mb-4">{item.icon}</div>
              <h3 className="text-xl font-bold text-brand-dark mb-2">{item.title}</h3>
              <p className="text-zinc-500 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="p-8 text-center text-zinc-400 text-xs">
        © ۲۰۲۴ تمامی حقوق برای مدیریت مطب محفوظ است | امنیت تضمین شده توسط Cloudflare
      </footer>
    </div>
  );
}