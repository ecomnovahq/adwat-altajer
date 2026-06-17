import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "أدوات التاجر | منصة الذكاء الاصطناعي للتجار السعوديين",
  description: "منصة أدوات التاجر — أدوات ذكاء اصطناعي لمساعدة التجار السعوديين على تنمية متاجرهم",
  keywords: "أدوات تجارية، ذكاء اصطناعي، تجارة إلكترونية، سعودي",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        {/* Theme init — must run before paint to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('tajer-theme')||'dark';document.documentElement.setAttribute('data-theme',t);})();`,
          }}
        />
        {/* Tajawal font — preconnect + preload for non-blocking load */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="preload"
          as="style"
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap"
          media="print"
          // @ts-expect-error onload is valid for link elements
          onLoad="this.media='all'"
        />
        <noscript>
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap"
          />
        </noscript>
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
