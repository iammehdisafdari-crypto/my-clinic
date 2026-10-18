export const runtime = "edge";

import "./globals.css";
import { ClientProviders } from "@/components/client-providers";

export const metadata = {
  title: "مدیریت مطب | نوبت و جراحی",
  description: "سیستم مدیریت هوشمند درمانگاه و مطب",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="antialiased font-sans">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}