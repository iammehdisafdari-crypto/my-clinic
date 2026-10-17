"use client";

import { LogOut } from "lucide-react";

export default function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    location.href = "/login";
  }

  return (
    <button
      onClick={logout}
      className="group flex items-center justify-center gap-1.5 w-full py-2 px-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer select-none active:scale-95 !bg-white !text-black !border-white shadow-xs md:hover:!bg-rose-600 md:hover:!text-white md:hover:!border-rose-600 md:hover:shadow-lg md:hover:shadow-rose-600/25"
      title="خروج از حساب کاربری"
    >
      <LogOut
        size={14}
        className="shrink-0 text-black transition-colors duration-200 md:group-hover:!text-white"
      />
      <span className="whitespace-nowrap transition-colors duration-200 md:group-hover:!text-white">
        خروج
      </span>
    </button>
  );
}