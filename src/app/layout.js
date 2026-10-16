// src/app/layout.js
export const metadata = {
  title: "مدیریت مطب",
  description: "سیستم نوبت‌دهی و مدیریت اتاق عمل",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl">
      <body style={{ fontFamily: 'Tahoma, Arial, sans-serif', margin: 0 }}>
        {children}
      </body>
    </html>
  );
}