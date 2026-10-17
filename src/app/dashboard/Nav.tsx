"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav({ links }: { links: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav className="flex flex-wrap gap-2">
      {links.map((l, i) => {
        // لینک اول «صفحه اصلی» است و فقط با آدرس دقیقش روشن می‌شود
        const active = i === 0 ? path === l.href : path === l.href || path.startsWith(l.href + "/");
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
              active ? "bg-brand-green text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}