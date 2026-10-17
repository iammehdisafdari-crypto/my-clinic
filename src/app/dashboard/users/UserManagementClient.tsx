"use client";

import { useState } from "react";
import { Trash2, Edit2, Check, X } from "lucide-react";

export const ROLE_HIERARCHY: Record<string, number> = {
  manager: 1,      // ادمین
  doctor: 2,       // پزشک
  scheduler: 3,    // منشی / پذیرش
  nurse: 4,        // پرستار
  photographer: 5, // عکاس
  marketer: 6,     // بازاریاب
  uploader: 7,     // آپلودر
  visitor: 8,      // ویزیتور
};

export const ROLE_LABELS: Record<string, string> = {
  manager: "مدیر / ادمین",
  doctor: "پزشک",
  scheduler: "منشی / پذیرش",
  nurse: "پرستار",
  photographer: "عکاس",
  marketer: "بازاریاب",
  uploader: "آپلودر",
  visitor: "ویزیتور",
};

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
  const currentRank = ROLE_HIERARCHY[currentUserRole] ?? 99;

  // فیلتر قطعی: کاربر فقط کاربرانی را می‌بیند که رتبه‌شان پایین‌تر (عدد بزرگتر) از خودش باشد
  const [users, setUsers] = useState<UserItem[]>(() => {
    return initialUsers.filter((u) => {
      const targetRank = ROLE_HIERARCHY[u.role] ?? 99;
      return targetRank > currentRank;
    });
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ display_name: "", role: "" });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // نقش‌هایی که مجاز است اختصاص دهد (فقط رتبه‌های پایین‌تر)
  const assignableRoles = Object.entries(ROLE_LABELS).filter(
    ([roleKey]) => (ROLE_HIERARCHY[roleKey] ?? 99) > currentRank
  );

  function startEdit(u: UserItem) {
    setEditingId(u.id);
    setEditForm({
      display_name: u.display_name || "",
      role: u.role,
    });
  }

  async function handleUpdate(id: number) {
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
      setUsers(users.map((u) => (u.id === id ? { ...u, ...editForm } : u)));
      setEditingId(null);
      setMsg("کاربر با موفقیت ویرایش شد.");
    } else {
      setMsg(data.error || "خطا در ویرایش کاربر");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("آیا از حذف این کاربر اطمینان دارید؟ این عملیات غیرقابل بازگشت است.")) return;

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

      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-gray-400 text-xs">
              <th className="py-3 px-4">نام و نام خانوادگی</th>
              <th className="py-3 px-4">نام کاربری</th>
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
                        className="border border-gray-200 rounded-lg p-1.5 text-xs w-full outline-none focus:border-brand-green"
                      />
                    ) : (
                      u.display_name
                    )}
                  </td>

                  <td className="py-3.5 px-4 font-mono text-gray-600 text-xs dir-ltr text-right">
                    {u.username}
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
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-xs text-gray-400">
                  کاربری جهت نمایش وجود ندارد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}