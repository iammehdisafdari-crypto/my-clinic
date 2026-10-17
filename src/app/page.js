export const runtime = "edge";
import Link from "next/link";

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", background: "#0a0a0a", color: "#fff" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>سیستم مدیریت کلینیک</h1>
      <p style={{ color: "#aaa", marginBottom: "2rem" }}>سامانه یکپارچه نوبت‌دهی و پرونده بیماران</p>
      <Link href="/login" style={{ background: "#10b981", color: "#fff", padding: "12px 32px", borderRadius: "9999px", textDecoration: "none", fontWeight: "bold" }}>
        ورود به پنل اعضا
      </Link>
    </div>
  );
}