export const runtime = "edge";

import "./globals.css";
import { ClientProviders } from "@/components/client-providers";

export const metadata = {
  title: "مدیریت هوشمند مطب",
  description: "سیستم نوبت‌دهی و جراحی",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}