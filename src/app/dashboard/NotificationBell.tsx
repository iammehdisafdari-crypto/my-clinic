"use client";
import { useState, useEffect, useCallback } from "react";
import { Bell } from "lucide-react";

type Notif = {
  id: number;
  title: string;
  message: string;
  is_read: number;
  created_at: string;
};

export default function NotificationBell() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);

  const fetchNotifs = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store", signal });
      if (!res.ok) return;
      const latest = (await res.json()) as Notif[];
      setNotifs((current) => {
        const unchanged =
          current.length === latest.length &&
          current.every((item, index) => {
            const nextItem = latest[index];
            return item.id === nextItem.id &&
              item.is_read === nextItem.is_read &&
              item.title === nextItem.title &&
              item.message === nextItem.message &&
              item.created_at === nextItem.created_at;
          });
        return unchanged ? current : latest;
      });
    } catch {
      // A failed background refresh should not disrupt the dashboard.
    }
  }, []);

  useEffect(() => {
    let controller: AbortController | null = null;
    const refreshWhenVisible = () => {
      if (document.visibilityState !== "visible") return;
      controller?.abort();
      controller = new AbortController();
      void fetchNotifs(controller.signal);
    };

    refreshWhenVisible();
    const timer = window.setInterval(refreshWhenVisible, 60000);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      controller?.abort();
    };
  }, [fetchNotifs]);

  async function markAsRead() {
    setOpen(!open);
    if (!open) {
      await fetch("/api/notifications", { method: "PATCH" });
      setNotifs(notifs.map(n => ({ ...n, is_read: 1 })));
    }
  }

  const unreadCount = notifs.filter(n => n.is_read === 0).length;

  return (
    <div className="relative">
      <button
        onClick={markAsRead}
        className="relative p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
        aria-label="اعلان‌ها"
      >
        <Bell size={20} className="text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-sm text-gray-800 flex justify-between items-center">
            <span>اعلان‌های سیستم</span>
            <span className="text-xs font-normal text-gray-500">{notifs.length} مورد</span>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
            {notifs.length === 0 ? (
              <p className="p-6 text-center text-xs text-gray-400">هیچ اعلانی وجود ندارد.</p>
            ) : (
              notifs.map(n => (
                <div key={n.id} className={`p-3.5 space-y-1 text-xs ${n.is_read === 0 ? "bg-emerald-50/50" : ""}`}>
                  <p className="font-bold text-gray-900">{n.title}</p>
                  <p className="text-gray-600 leading-relaxed">{n.message}</p>
                  <p className="text-[10px] text-gray-400 font-mono">{n.created_at}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}