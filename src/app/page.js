export const runtime = "edge";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f4f4f5] flex flex-col">
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#10b981] rounded-xl shadow-lg shadow-emerald-200 flex items-center justify-center">
              <span className="text-white font-black text-xl">M</span>
            </div>
            <span className="text-[#0a0a0a] font-black text-xl tracking-tight">پنل مدیریت پزشکی</span>
          </div>
          <Link href="/login" className="bg-[#0a0a0a] text-white px-8 py-2.5 rounded-full font-bold hover:bg-[#10b981] transition-all transform hover:scale-105 active:scale-95 shadow-md">
            ورود اعضا
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center">
        <section className="py-20 px-6 text-center max-w-4xl">
          <h1 className="text-5xl md:text-7xl font-black text-[#0a0a0a] leading-[1.2] mb-8">
            مدیریت هوشمند <br/>
            <span className="text-[#10b981]">نوبت‌دهی و اتاق عمل</span>
          </h1>
          <p className="text-gray-500 text-lg md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto">
            یکپارچه‌سازی کامل برنامه‌های جراحی، مشاوره‌های آنلاین و پرونده بیماران با امنیت فوق‌العاده در بستر Cloudflare.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login" className="bg-[#10b981] text-white px-10 py-5 rounded-[2rem] font-black text-lg shadow-2xl shadow-emerald-200 hover:brightness-110 transition-all">
              شروع به کار (ورود به پنل)
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full px-6 pb-20">
          {[
            { t: "نوبت‌دهی جراحی", d: "برنامه‌ریزی دقیق اتاق عمل و لیست انتظار", i: "🏥" },
            { t: "مشاوره آنلاین", d: "مدیریت زمان‌های مشاوره و ویزیت", i: "💬" },
            { t: "آرشیو تصاویر", d: "ذخیره‌سازی ایمن عکس‌های قبل و بعد", i: "📸" }
          ].map((item, index) => (
            <div key={index} className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all group">
              <div className="text-4xl mb-6 group-hover:scale-110 transition-transform">{item.i}</div>
              <h3 className="text-xl font-bold text-[#0a0a0a] mb-3">{item.t}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{item.d}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="py-10 text-center text-gray-400 text-xs border-t border-gray-200 bg-white">
        © ۲۰۲۶ مدیریت مطب | امنیت تضمین شده توسط لایه‌های دفاعی Cloudflare
      </footer>
    </div>
  );
}