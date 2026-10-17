"use client";

export default function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    location.href = "/login";
  }
  return (
    <button onClick={logout} className="text-sm border px-4 py-1 rounded-full">
      خروج
    </button>
  );
}
