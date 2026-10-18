export const runtime = "edge";

import "./globals.css";
import { ClientProviders } from "@/components/client-providers";

export const metadata = {
  title: "مدیریت مطب | نوبت و جراحی",
  description: "سیستم مدیریت هوشمند درمانگاه و مطب",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css"
        />
      </head>
      <body className="antialiased font-sans bg-slate-50 text-slate-900">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}