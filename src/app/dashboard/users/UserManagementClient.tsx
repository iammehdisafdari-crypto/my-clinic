"use client";

import { useState } from "react";
import { Trash2, Edit2, Check, X, KeyRound } from "lucide-react";
import { canManageRole, DB_ROLES, ROLE_LABELS } from "@/lib/roles";

type UserItem = {
  id: number;
  username: string;
  display_name: string;
  role: string;
  is_active: number;
};

export default function UserManagementClient({
  initialUsers,
  currentUserRole,
}: {
  initialUsers: UserItem[];
  currentUserRole: string;
}) {
  const assignableRoles = DB_ROLES
    .filter((role) => canManageRole(currentUserRole, role))
    .map((role) => [role, ROLE_LABELS[role] || role] as [string, string]);

  // فیلتر: کاربر فقط اعضای با سطح پایین‌تر از خود را مدیریت می‌کند
  const [users, setUsers] = useState<UserItem[]>(() => {
    return initialUsers.filter((u) => canManageRole(currentUserRole, u.role));
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    username: "",
    display_name: "",
    role: "",
    new_password: "",
  });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    display_name: "",
    password: "",
    role: assignableRoles[0]?.[0] || "",
  });

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMsg("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: newUser.username.trim(),
        full_name: newUser.display_name.trim(),
        password: newUser.password,
        role: newUser.role,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setMsg(data.error || "خطا در ساخت کاربر");
      return;
    }
    setUsers((current) => [...current, data.user]);
    setNewUser({
      username: "",
      display_name: "",
      password: "",
      role: assignableRoles[0]?.[0] || "",
    });
    setMsg("کاربر با موفقیت ساخته شد.");
  }

  function startEdit(u: UserItem) {
    setEditingId(u.id);
    setEditForm({
      username: u.username || "",
      display_name: u.display_name || "",
      role: u.role,
      new_password: "",
    });
  }

  async function handleUpdate(id: number) {
    if (editForm.new_password && editForm.new_password.length < 8) {
      setMsg("رمز عبور جدید باید حداقل ۸ کاراکتر باشد");
      return;
    }

    setLoading(true);
    setMsg("");
    const res = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (res.ok) {
      setUsers(
        users.map((u) =>
          u.id === id
            ? {
                ...u,
                username: editForm.username.trim(),
                display_name: editForm.display_name.trim(),
                role: editForm.role,
              }
            : u
        )
      );
      setEditingId(null);
      setMsg("اطلاعات کاربر با موفقیت به‌روزرسانی شد.");
    } else {
      setMsg(data.error || "خطا در ویرایش کاربر");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("آیا از حذف این کاربر اطمینان دارید؟")) return;

    setLoading(true);
    setMsg("");
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (res.ok) {
      setUsers(users.filter((u) => u.id !== id));
      setMsg("کاربر با موفقیت حذف شد.");
    } else {
      setMsg(data.error || "خطا در حذف کاربر");
    }
  }

  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm space-y-6 font-sans">
      <div className="flex justify-between items-center pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-xl font-black text-gray-900">مدیریت اعضای تیم و کاربران</h2>
          <p className="text-xs text-gray-400 mt-1">
            سطح دسترسی شما:{" "}
            <span className="text-brand-green font-bold">
              {ROLE_LABELS[currentUserRole] || currentUserRole}
            </span>
          </p>
        </div>
      </div>

      {msg && (
        <p className="text-xs font-bold text-center bg-gray-50 text-gray-700 p-3 rounded-xl border border-gray-100">
          {msg}
        </p>
      )}

      {assignableRoles.length > 0 && (
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <input required value={newUser.display_name} onChange={(e) => setNewUser({ ...newUser, display_name: e.target.value })} placeholder="نام و نام خانوادگی" className="rounded-xl border border-gray-200 bg-white p-3 text-sm" />
          <input required dir="ltr" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} placeholder="نام کاربری" className="rounded-xl border border-gray-200 bg-white p-3 text-sm" />
          <input required minLength={8} type="password" dir="ltr" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="رمز عبور (حداقل ۸ حرف)" className="rounded-xl border border-gray-200 bg-white p-3 text-sm" />
          <select required value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="rounded-xl border border-gray-200 bg-white p-3 text-sm">
            {assignableRoles.map(([role, label]) => <option key={role} value={role}>{label}</option>)}
          </select>
          <button disabled={loading} className="rounded-xl bg-brand-green p-3 text-sm font-bold text-white disabled:opacity-50">افزودن کاربر</button>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-gray-400 text-xs">
              <th className="py-3 px-4">نام و نام خانوادگی</th>
              <th className="py-3 px-4">نام کاربری و تغییر رمز</th>
              <th className="py-3 px-4">نقش دسترسی</th>
              <th className="py-3 px-4 text-center">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((u) => {
              const isEditing = editingId === u.id;

              return (
                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-gray-800">
                    {isEditing ? (
                      <input
                        value={editForm.display_name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, display_name: e.target.value })
                        }
                        placeholder="نام نمایشی"
                        className="border border-gray-200 rounded-lg p-1.5 text-xs w-full outline-none focus:border-brand-green"
                      />
                    ) : (
                      u.display_name
                    )}
                  </td>

                  <td className="py-3.5 px-4 font-mono text-gray-600 text-xs dir-ltr text-right">
                    {isEditing ? (
                      <div className="flex flex-col gap-1.5 min-w-[170px]">
                        <input
                          type="text"
                          value={editForm.username}
                          onChange={(e) =>
                            setEditForm({ ...editForm, username: e.target.value })
                          }
                          placeholder="نام کاربری"
                          className="w-full px-2 py-1 border border-emerald-500 rounded-lg text-xs font-mono bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          dir="ltr"
                        />
                        <div className="relative">
                          <input
                            type="password"
                            value={editForm.new_password}
                            onChange={(e) =>
                              setEditForm({ ...editForm, new_password: e.target.value })
                            }
                            placeholder="رمز جدید (اختیاری - حداقل ۸ کاراکتر)"
                            minLength={8}
                            className="w-full pl-6 pr-2 py-1 border border-dashed border-gray-300 rounded-lg text-xs font-mono bg-gray-50 text-gray-800 focus:outline-none focus:border-emerald-500 placeholder:font-sans placeholder:text-[11px]"
                            dir="ltr"
                          />
                          <KeyRound
                            size={12}
                            className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400"
                          />
                        </div>
                      </div>
                    ) : (
                      u.username
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    {isEditing ? (
                      <select
                        value={editForm.role}
                        onChange={(e) =>
                          setEditForm({ ...editForm, role: e.target.value })
                        }
                        className="border border-gray-200 rounded-lg p-1.5 text-xs outline-none focus:border-brand-green"
                      >
                        {!assignableRoles.some(([key]) => key === editForm.role) && (
                          <option key={editForm.role} value={editForm.role}>
                            {ROLE_LABELS[editForm.role] || editForm.role} (نقش فعلی)
                          </option>
                        )}
                        {assignableRoles.map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-700">
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center justify-center gap-2">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUpdate(u.id)}
                            disabled={loading}
                            className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                            title="ذخیره"
                          >
                            <Check size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                            title="انصراف"
                          >
                            <X size={15} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(u)}
                            className="p-1.5 text-gray-400 hover:text-brand-green rounded-lg hover:bg-gray-100 transition-colors"
                            title="ویرایش"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(u.id)}
                            disabled={loading}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            title="حذف"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
