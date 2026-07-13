import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { seoKeywords, siteUrl } from "@/lib/content";

import { Suspense } from "react";
import { Pixels } from "@/components/analytics/pixels";
import { NavigationProgress } from "@/components/ui/navigation-progress";
import { CartProvider } from "@/components/cart/cart-provider";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/providers/theme-provider";

// Public marketing sitesi krem/açık tema için tasarlandı; tüm site açık temaya
// sabitlenir. İşletim sistemi koyu modda olsa bile site krem
// render edilir (düşük kontrast / "white-on-white" sorunlarının kök çözümü).
// Inline-script FOUC'u önler; data-theme="light" zaten <html>'de de set edilir.
const themeInitScript = `(()=>{try{document.documentElement.setAttribute('data-theme','light');}catch(e){}})();`;
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#FFFFFF",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  manifest: "/manifest.webmanifest",
  title: {
    default: "Canlı Online Matematik Dersi | Online Dershanem",
    template: "%s | Online Dershanem"
  },
  description:
    "LGS ve YKS için en fazla 4 öğrencilik, ayda 4 × 60 dakika canlı matematik dersi; ders sonrası çalışma yönü ve veliye sade gelişim özeti.",
  keywords: seoKeywords,
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "Matematiği Verimli ve Erişilebilir Öğrenmenin Yolu",
    description:
      "LGS ve YKS için en fazla 4 kişilik canlı matematik dersi, ders sonrası net çalışma yönü ve veliye sade gelişim özeti.",
    url: `${siteUrl}/`,
    siteName: "Online Dershanem",
    locale: "tr_TR",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Matematiği verimli ve erişilebilir öğrenmenin yolu — Online Dershanem"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Matematiği Verimli ve Erişilebilir Öğrenmenin Yolu",
    description: "En fazla 4 öğrencilik canlı matematik dersleri ve ders sonrası net çalışma yönü.",
    images: ["/og.png"]
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" }
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="tr"
      data-theme="light"
      className={GeistSans.variable}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>
        <ThemeProvider>
          <CartProvider>
            <ToastProvider>
              <Suspense fallback={null}>
                <NavigationProgress />
              </Suspense>
              <Pixels />
              {children}
              <Analytics />
              <SpeedInsights />
            </ToastProvider>
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
