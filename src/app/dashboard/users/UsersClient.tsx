"use client";
import { useEffect, useState } from "react";

type U = {
  id: number;
  username: string;
  email: string | null;
  full_name: string;
  role: string;
  active: number;
};

const ROLE_LABELS: Record<string, string> = {
  scheduler: "منشی",
  visitor: "بازاریاب",
  uploader: "عکاس",
  nurse: "پرستار",
};

const EMPTY = { username: "", full_name: "", email: "", password: "", role: "scheduler" };

export default function UsersClient() {
  const [users, setUsers] = useState<U[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState("");

  async function load() {
    const r = await fetch("/api/users");
    if (r.ok) setUsers(await r.json());
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const r = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = (await r.json()) as { error?: string };
    if (r.ok) {
      setForm(EMPTY);
      setMsg("کاربر ساخته شد");
      load();
    } else {
      setMsg(data.error || "خطا");
    }
  }

  async function toggle(u: U) {
    setMsg("");
    const r = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !u.active }),
    });
    if (!r.ok) {
      const data = (await r.json()) as { error?: string };
      setMsg(data.error || "خطا");
    }
    load();
  }

  const input = "border border-gray-200 rounded-xl p-3 w-full";

  return (
    <div className="space-y-8">
      <form onSubmit={create} className="bg-white p-6 rounded-[2rem] shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <input className={input} placeholder="نام کاربری (انگلیسی)" value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <input className={input} placeholder="نام کامل" value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        <input className={input} placeholder="ایمیل (اختیاری)" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className={input} type="password" placeholder="رمز (حداقل ۸ کاراکتر)" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <select className={input} value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}>
          {Object.entries(ROLE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button className="bg-brand-green text-white rounded-xl p-3 font-bold">ساخت کاربر</button>
        {msg && <p className="md:col-span-3 text-sm text-gray-600">{msg}</p>}
      </form>

      <div className="bg-white rounded-[2rem] shadow-sm p-4 overflow-x-auto">
        <table className="w-full text-right">
          <thead>
            <tr className="text-gray-400 text-sm">
              <th className="p-3">نام</th>
              <th className="p-3">نام کاربری</th>
              <th className="p-3">نقش</th>
              <th className="p-3">وضعیت</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="p-3 font-bold">{u.full_name}</td>
                <td className="p-3 font-mono text-sm">{u.username}</td>
                <td className="p-3 text-sm">{ROLE_LABELS[u.role] || u.role}</td>
                <td className="p-3 text-sm">{u.active ? "فعال" : "غیرفعال"}</td>
                <td className="p-3">
                  <button onClick={() => toggle(u)} className="text-sm underline">
                    {u.active ? "غیرفعال کن" : "فعال کن"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}