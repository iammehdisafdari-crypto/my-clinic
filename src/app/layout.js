export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-brand-muted" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 bg-brand-dark text-white hidden md:flex flex-col p-6 fixed h-full">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 bg-brand-green rounded-lg"></div>
          <span className="font-black text-xl">مدیریت مطب</span>
        </div>
        
        <nav className="space-y-4 flex-1">
          <div className="p-3 bg-brand-green/10 text-brand-green rounded-xl cursor-pointer">داشبورد اصلی</div>
          <div className="p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-all">لیست بیماران</div>
          <div className="p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-all">برنامه عمل‌ها</div>
          <div className="p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-all">گزارشات</div>
        </nav>

        <div className="mt-auto pt-6 border-t border-white/10 text-xs text-gray-500">
          نسخه ۱.۰.۰ - آنلاین
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:mr-64 p-4 md:p-8">
        <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="text-sm font-bold">خوش آمدید، مدیر سیستم</div>
          <button className="bg-red-50 text-red-500 px-4 py-2 rounded-xl text-xs font-bold">خروج</button>
        </header>
        {children}
      </main>
    </div>
  );
}
