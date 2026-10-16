export default function ManagerDashboard() {
  const stats = [
    { title: "عمل‌های امروز", value: "۴", color: "brand-green" },
    { title: "مشاوره‌های در انتظار", value: "۱۲", color: "brand-dark" },
    { title: "بیماران جدید (ماه)", value: "۴۵", color: "brand-green" },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-50/50">
            <p className="text-gray-500 text-sm mb-1">{item.title}</p>
            <h3 className="text-3xl font-black">{item.value}</h3>
          </div>
        ))}
      </div>

      {/* Surgery Schedule Table */}
      <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-gray-100">
        <div className="p-8 border-b border-gray-50 flex justify-between items-center">
          <h2 className="text-xl font-black">برنامه عمل‌های جراحی</h2>
          <button className="bg-brand-green text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg shadow-brand-green/20">برنامه جدید</button>
        </div>
        
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="text-gray-400 text-sm">
                <th className="p-4 font-medium">بیمار</th>
                <th className="p-4 font-medium">نوع عمل</th>
                <th className="p-4 font-medium">ساعت</th>
                <th className="p-4 font-medium">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="p-4 font-bold">مهدی صفدری</td>
                <td className="p-4 text-sm">رینوپلاستی</td>
                <td className="p-4 text-sm font-mono">۰۸:۳۰</td>
                <td className="p-4"><span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-xs font-bold">تایید شده</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
