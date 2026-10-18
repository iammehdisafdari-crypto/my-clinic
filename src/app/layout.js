export const runtime = "edge";

import { Vazirmatn } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "@/components/client-providers";

const vazir = Vazirmatn({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800"],
  display: "swap",
  variable: "--font-vazir",
});

export const metadata = {
  title: "مدیریت هوشمند مطب",
  description: "سیستم نوبت‌دهی و جراحی",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl" className={vazir.className}>
      <body className="font-sans antialiased">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}