"use client";
import React, { useState } from 'react';
import { useRouter } from "next/navigation";
import './ring.css';

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (data.success) {
        router.push(data.role === "visitor" ? "/dashboard/visitor" : "/dashboard/manager");
      } else {
        setError(data.error || "خطا در ورود");
      }
    } catch (err) {
      setError("ارتباط با سرور برقرار نشد");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-body">
      <div className="ring">
        {/* رنگ‌های نئونی سبز برای رینگ‌ها */}
        <i style={{ "--clr": "#10b981" } as any}></i>
        <i style={{ "--clr": "#34d399" } as any}></i>
        <i style={{ "--clr": "#059669" } as any}></i>
        
        <div className="login-form-container">
          <h2>ورود پزشکان</h2>
          <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div className="inputBx">
              <input 
                type="text" 
                placeholder="نام کاربری" 
                required 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="inputBx">
              <input 
                type="password" 
                placeholder="رمز عبور" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="error-msg">{error}</p>}
            <div className="inputBx">
              <button type="submit" disabled={loading}>
                {loading ? "در حال بررسی..." : "ورود به سیستم"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
