"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import './panda.css'; // استایل‌ها را در فایل جداگانه می‌گذاریم

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isWrong, setIsWrong] = useState(false);
  const [eyePos, setEyePos] = useState({ x: 0, y: 0 });
  const router = useRouter();

  // انیمیشن حرکت چشم پاندا با موس
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const dw = window.innerWidth / 15;
      const dh = window.innerHeight / 15;
      setEyePos({ x: e.pageX / dw, y: e.pageY / dh });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsWrong(false);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        router.push(data.role === "visitor" ? "/dashboard/visitor" : "/dashboard/manager");
      } else {
        setError(data.error || "نام کاربری یا رمز عبور اشتباه است");
        setIsWrong(true);
        setTimeout(() => setIsWrong(false), 3000);
      }
    } catch (err) {
      setError("ارتباط با سرور برقرار نشد");
      setIsWrong(true);
    }
  };

  return (
    <div className="login-container">
      <div className={`panda ${isPasswordFocused ? 'up' : ''}`}>
        <div className="ear"></div>
        <div className="face">
          <div className="eye-shade"></div>
          <div className="eye-white">
            <div className="eye-ball" style={{ width: `${eyePos.x}px`, height: `${eyePos.y}px` }}></div>
          </div>
          <div className="eye-shade rgt"></div>
          <div className="eye-white rgt">
            <div className="eye-ball" style={{ width: `${eyePos.x}px`, height: `${eyePos.y}px` }}></div>
          </div>
          <div className="nose"></div>
          <div className="mouth"></div>
        </div>
        <div className="body"></div>
        <div className="foot"><div className="finger"></div></div>
        <div className="foot rgt"><div className="finger"></div></div>
      </div>

      <form onSubmit={handleLogin} className={`${isPasswordFocused ? 'up' : ''} ${isWrong ? 'wrong-entry' : ''}`}>
        <div className="hand"></div>
        <div className="hand rgt"></div>
        <h1>ورود پزشکان</h1>
        
        <div className="form-group">
          <input 
            type="text" 
            required 
            className="form-control" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <label className="form-label">نام کاربری</label>
        </div>

        <div className="form-group">
          <input 
            type="password" 
            required 
            className="form-control"
            onFocus={() => setIsPasswordFocused(true)}
            onBlur={() => setIsPasswordFocused(false)}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <label className="form-label">رمز عبور</label>
          {error && <p className="alert-bubble">{error}</p>}
          <button className="btn-login">ورود به پنل</button>
        </div>
      </form>
    </div>
  );
}
