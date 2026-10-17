"use client";
import React, { useState } from 'react';
import { useRouter } from "next/navigation";
import './ring.css';

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.email.trim(),
          password: formData.password,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        home?: string;
        error?: string;
        details?: string;
      };

      if (data.success) {
        router.push(data.home || "/");
        router.refresh();
      } else {
        setError(data.error || data.details || "خطایی رخ داد");
      }
    } catch (err: any) {
      setError("خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-body">
      <div className="ring">
        <i style={{ "--clr": "#10b981" } as React.CSSProperties}></i>
        <i style={{ "--clr": "#34d399" } as React.CSSProperties}></i>
        <i style={{ "--clr": "#059669" } as React.CSSProperties}></i>
        <div className="login-form-container">
          <h2 style={{ color: "white" }}>ورود به پنل</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>

            <div className="inputBx">
              <input
                type="text"
                placeholder="ایمیل یا نام کاربری"
                value={formData.email}
                required
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="inputBx">
              <input
                type="password"
                placeholder="رمز عبور"
                value={formData.password}
                required
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            {error && (
              <p style={{ color: '#ff4d4d', fontSize: '13px', textAlign: 'center', margin: '5px 0' }}>
                {error}
              </p>
            )}

            <div className="inputBx">
              <button type="submit" disabled={loading} style={{ cursor: 'pointer' }}>
                {loading ? "در حال پردازش..." : "ورود به پنل"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}