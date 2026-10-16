export const metadata = {
  title: "مدیریت مطب",
  description: "سیستم نوبت‌دهی",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl">
      <body style={{ fontFamily: 'Tahoma, sans-serif', margin: 0 }}>
        {children}
      </body>
    </html>
  );
}