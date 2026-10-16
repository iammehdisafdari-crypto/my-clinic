"use client";
import React, { useState } from 'react';
import { useRouter } from "next/navigation";
import './ring.css';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: "", password: "", username: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    const payload = isLogin ? { username: formData.email, password: formData.password } : formData;

    try {
      const res = await fetch(endpoint, { method: "POST", body: JSON.stringify(payload) });
      const data = await res.json();

      if (data.success) {
        if (isLogin) {
          router.push(data.role === "visitor" ? "/dashboard/visitor" : "/dashboard/manager");
        } else {
          alert("ثبت‌نام موفق! حالا وارد شوید.");
          setIsLogin(true);
        }
      } else {
        setError(data.error || "خطایی رخ داد");
      }
    } catch (err) {
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
          <h2 style={{ color: "white" }}>{isLogin ? "ورود پزشکان" : "ایجاد حساب"}</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            
            {!isLogin && (
              <div className="inputBx">
                <input type="text" placeholder="نام و نام خانوادگی" required 
                  onChange={(e) => setFormData({...formData, username: e.target.value})} />
              </div>
            )}

            <div className="inputBx">
              <input type="text" placeholder={isLogin ? "ایمیل یا نام کاربری" : "ایمیل شما"} required 
                onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </div>

            <div className="inputBx">
              <input type="password" placeholder="رمز عبور" required 
                onChange={(e) => setFormData({...formData, password: e.target.value})} />
            </div>

            {error && <p style={{ color: '#ff4d4d', fontSize: '12px', textAlign: 'center', margin: '5px 0' }}>{error}</p>}
            
            <div className="inputBx">
              <button type="submit" disabled={loading} style={{ cursor: 'pointer' }}>
                {loading ? "در حال پردازش..." : (isLogin ? "ورود به پنل" : "ثبت‌نام")}
              </button>
            </div>

            <p style={{ color: 'white', fontSize: '13px', cursor: 'pointer', textAlign: 'center', marginTop: '10px' }} 
               onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? "حساب ندارید؟ ثبت‌نام کنید" : "حساب دارید؟ وارد شوید"}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
