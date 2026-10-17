import Link from "next/link";

export default function StatCard({
  href,
  title,
  value,
  hint,
  accent,
}: {
  href: string;
  title: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block bg-white p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow ${
        accent ? "ring-2 ring-brand-green" : ""
      }`}
    >
      <p className="text-gray-500 text-sm mb-1">{title}</p>
      <p className="text-4xl font-black">{value}</p>
      <p className="text-xs text-gray-400 mt-2">{hint}</p>
    </Link>
  );
}