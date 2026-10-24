"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard render error:", error);
  }, [error]);

  return (
    <main dir="rtl" lang="fa" style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "sans-serif" }}>
      <section style={{ maxWidth: 480, textAlign: "center", color: "#12352f" }}>
        <h1 style={{ fontSize: 24, marginBottom: 12 }}>بارگذاری این صفحه با مشکل روبه‌رو شد</h1>
        <p style={{ lineHeight: 1.9, color: "#52625e" }}>
          اطلاعات شما محفوظ است. یک بار دیگر تلاش کنید؛ اگر مشکل ادامه داشت، کد خطا را برای پشتیبانی بفرستید.
        </p>
        {error.digest && <p dir="ltr" style={{ fontFamily: "monospace", color: "#6b7280" }}>کد خطا: {error.digest}</p>}
        <button type="button" onClick={() => reset()} style={{ marginTop: 12, border: 0, borderRadius: 10, padding: "12px 20px", background: "#087f5b", color: "white", fontWeight: 700, cursor: "pointer" }}>
          تلاش دوباره
        </button>
      </section>
    </main>
  );
}
