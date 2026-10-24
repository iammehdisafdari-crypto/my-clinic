"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, ClipboardList, UserCog, Search, Menu, Stethoscope } from "lucide-react";
import NotificationBell from "./NotificationBell";

const ICONS = {
  home: LayoutDashboard,
  patients: Users,
  visits: ClipboardList,
  users: UserCog,
};

export type NavLink = { href: string; label: string; icon: keyof typeof ICONS };

export default function Shell({
  user,
  links,
  dateFa,
  showSearch,
  logout,
  children,
}: {
  user: { name: string; roleLabel: string };
  links: NavLink[];
  dateFa: string;
  showSearch: boolean;
  logout: React.ReactNode;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [activeHash, setActiveHash] = useState("");

  useEffect(() => {
    const syncHash = () => setActiveHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  // Keep the home item inactive while a dashboard section shortcut is selected.
  const isActive = (l: NavLink, i: number) => {
    const [hrefPath, hrefHash] = l.href.split("#");
    if (hrefHash) return path === hrefPath && activeHash === `#${hrefHash}`;
    if (i === 0) return path === l.href && activeHash === "";
    return path === l.href || path.startsWith(l.href + "/");
  };

  function search(e: React.FormEvent) {
    e.preventDefault();
    const t = q.trim();
    router.push("/dashboard/patients" + (t ? `?q=${encodeURIComponent(t)}` : ""));
    setQ("");
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-forest text-white">
      <div className="flex items-center gap-3 px-6 py-6">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-green">
          <Stethoscope size={22} />
        </span>
        <div className="leading-tight">
          <p className="font-extrabold">مدیریت مطب</p>
          <p className="text-xs text-white/60">نوبت و جراحی</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {links.map((l, i) => {
          const Icon = ICONS[l.icon] || ClipboardList;
          const on = isActive(l, i);
          return (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => {
                setOpen(false);
                setActiveHash(l.href.includes("#") ? `#${l.href.split("#")[1]}` : "");
              }}
              className={`relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
                on ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              {on && <span className="absolute inset-y-2 start-0 w-1 rounded-full bg-brand-green" />}
              <Icon size={20} />
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-white/15 font-bold">
            {user.name.trim().charAt(0) || "؟"}
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold">{user.name}</p>
            <p className="text-xs text-white/60">{user.roleLabel}</p>
          </div>
        </div>
        <div className="[&_button]:w-full [&_button]:rounded-xl [&_button]:border [&_button]:border-white/20 [&_button]:px-4 [&_button]:py-2 [&_button]:text-sm [&_button]:text-white/80 [&_button]:hover:bg-white/10">
          {logout}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas">
      {open && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setOpen(false)} />}
      <aside
        className={`fixed inset-y-0 start-0 z-50 w-64 transition-transform duration-200 md:translate-x-0 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {sidebar}
      </aside>

      <div className="md:ms-64">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-canvas/80 px-4 py-3 backdrop-blur md:px-8">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="باز کردن منو"
            className="rounded-lg p-2 hover:bg-white md:hidden"
          >
            <Menu size={22} />
          </button>
          {showSearch && (
            <form onSubmit={search} className="relative max-w-md flex-1">
              <Search size={18} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="جستجوی بیمار با نام یا شماره..."
                className="w-full rounded-xl border border-line bg-white py-2.5 ps-10 pe-4 text-sm outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
              />
            </form>
          )}
          <div className="ms-auto flex items-center gap-4">
            <NotificationBell />
            <p className="hidden text-sm text-gray-500 sm:block">{dateFa}</p>
          </div>
        </header>
        <main className="px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}