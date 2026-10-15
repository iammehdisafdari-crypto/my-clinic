"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        // هدایت کاربر بر اساس نقش
        if (data.role === "visitor") {
          router.push("/dashboard/visitor");
        } else {
          router.push("/dashboard/manager");
        }
      } else {
        setError(data.error || "خطا در ورود");
      }
    } catch (err) {
      setError("ارتباط با سرور برقرار نشد");
    }
  };

  return (
    <div style={{ backgroundColor: "#f4f4f5", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }} dir="rtl">
      <div style={{ backgroundColor: "white", padding: "40px", borderRadius: "24px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)", width: "100%", maxWidth: "400px", border: "1px solid #e5e7eb" }}>
        <h2 style={{ fontSize: "24px", fontWeight: "900", color: "#0a0a0a", textAlign: "center", marginBottom: "8px" }}>ورود به پنل مطب</h2>
        <p style={{ textAlign: "center", color: "#71717a", fontSize: "14px", marginBottom: "32px" }}>لطفاً نام کاربری و رمز عبور خود را وارد کنید</p>
        
        {error && <p style={{ color: "#ef4444", backgroundColor: "#fef2f2", padding: "10px", borderRadius: "12px", fontSize: "13px", textAlign: "center", marginBottom: "20px", border: "1px solid #fee2e2" }}>{error}</p>}
        
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <input 
            type="text" 
            placeholder="نام کاربری" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ padding: "16px", borderRadius: "16px", border: "1px solid #e5e7eb", backgroundColor: "#f9fafb", outline: "none" }} 
            required
          />
          <input 
            type="password" 
            placeholder="رمز عبور" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: "16px", borderRadius: "16px", border: "1px solid #e5e7eb", backgroundColor: "#f9fafb", outline: "none" }} 
            required
          />
          <button type="submit" style={{ padding: "16px", backgroundColor: "#0a0a0a", color: "white", border: "none", borderRadius: "16px", fontWeight: "bold", cursor: "pointer", marginTop: "10px", transition: "0.3s" }}>
            ورود به سیستم
          </button>
        </form>
      </div>
    </div>
  );
}