import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { seoKeywords, siteUrl } from "@/lib/content";

import { Suspense } from "react";
import { Pixels } from "@/components/analytics/pixels";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { NavigationProgress } from "@/components/ui/navigation-progress";
import { CartProvider } from "@/components/cart/cart-provider";
import { CartFab } from "@/components/cart/cart-fab";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/providers/theme-provider";

// Public marketing sitesi krem/açık tema için tasarlandı; panel kapalı olduğundan
// tüm site açık temaya sabitlenir. İşletim sistemi koyu modda olsa bile site krem
// render edilir (düşük kontrast / "white-on-white" sorunlarının kök çözümü).
// Inline-script FOUC'u önler; data-theme="light" zaten <html>'de de set edilir.
const themeInitScript = `(()=>{try{document.documentElement.setAttribute('data-theme','light');}catch(e){}})();`;
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#FAFAF7",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  manifest: "/manifest.webmanifest",
  title: {
    default: "Online Matematik Dershanesi | Online Dershanem",
    template: "%s | Online Dershanem"
  },
  description:
    "Maksimum 4 kişilik canlı matematik dersleri, ders sonrası takip ve veli bilgilendirmesi. Çocuğunuzun matematikte nerede takıldığını görüp birlikte kapatıyoruz.",
  keywords: seoKeywords,
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "Online Matematik Dershanesi | Online Dershanem",
    description:
      "Maksimum 4 kişilik canlı matematik dersleri, ders sonrası takip ve veli bilgilendirmesi.",
    url: `${siteUrl}/`,
    siteName: "Online Dershanem",
    locale: "tr_TR",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Online Dershanem · Online Matematik Dershanesi"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Online Matematik Dershanesi | Online Dershanem",
    description: "Maksimum 4 kişilik canlı matematik dersleri ve ders sonrası takip.",
    images: ["/logo.png"]
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
      className={`${GeistSans.variable} ${fraunces.variable} ${inter.variable}`}
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
        <AuthSessionProvider>
          <ThemeProvider>
            <CartProvider>
              <ToastProvider>
                <Suspense fallback={null}>
                  <NavigationProgress />
                </Suspense>
                <Pixels />
                {children}
                <CartFab />
                <Analytics />
                <SpeedInsights />
              </ToastProvider>
            </CartProvider>
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
