import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { GeistSans } from "geist/font/sans";
import localFont from "next/font/local";
import "./globals.css";

// Onaylı tasarımın tipografisi: gövde ve başlık Manrope, etiket/eyebrow
// JetBrains Mono. (Web.dc.html → Tasarım sistemi · Tipografi)
//
// Fontlar repoda (OFL); build Google Fonts'a ağ isteği atmaz. Dosya başına
// latin + latin-ext birleşik değişken WOFF2 — kaynak ve yeniden üretim:
// app/fonts/README.md. Ağırlıklar aralık değil ayrık yüz olarak tanımlı:
// eski `next/font/google` çağrısıyla aynı en-yakın-ağırlık eşleşmesi korunur
// (ör. mono'da `font-medium` 500 değil 400 yüzüne düşer).
// `next/font` seçenekleri derleme anında okunur; değerler literal olmalı.
const manrope = localFont({
  src: [
    { path: "./fonts/manrope/manrope-latin-ext-wght.woff2", weight: "400", style: "normal" },
    { path: "./fonts/manrope/manrope-latin-ext-wght.woff2", weight: "500", style: "normal" },
    { path: "./fonts/manrope/manrope-latin-ext-wght.woff2", weight: "600", style: "normal" },
    { path: "./fonts/manrope/manrope-latin-ext-wght.woff2", weight: "700", style: "normal" },
    { path: "./fonts/manrope/manrope-latin-ext-wght.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-manrope",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: [
    { path: "./fonts/jetbrains-mono/jetbrains-mono-latin-ext-wght.woff2", weight: "400", style: "normal" },
    { path: "./fonts/jetbrains-mono/jetbrains-mono-latin-ext-wght.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-jetbrains-mono",
  display: "swap",
});
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

const vercelTelemetryEnabled = process.env.VERCEL === "1";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  // Tek kaynak: onaylı tasarımın zemini (`--dc-canvas`). Manifest'teki
  // `theme_color` ile AYNI kalmalı; üç ayrı değer taşınıyordu.
  themeColor: "#FBFCFA",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  manifest: "/manifest.webmanifest",
  title: {
    default: "Online Dershanem | Ders, Koçluk ve Deneme Ürünleri",
    template: "%s | Online Dershanem",
  },
  description:
    "LGS ve YKS öğrencileri için canlı ders, çalışma düzeni ve online deneme ürünleri.",
  keywords: seoKeywords,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Ders, Koçluk ve Deneme Ürünleri | Online Dershanem",
    description:
      "Online Dershanem, Online Koçum ve Online Deneme Kulübüm ile LGS ve YKS yolculuğuna uygun desteği seçin.",
    url: `${siteUrl}/`,
    siteName: "Online Dershanem",
    locale: "tr_TR",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Online Dershanem ders, koçluk ve deneme ürünleri",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ders, Koçluk ve Deneme Ürünleri | Online Dershanem",
    description: "LGS ve YKS öğrencileri için üç açık eğitim ürünü.",
    images: ["/og.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="tr"
      data-theme="light"
      data-scroll-behavior="smooth"
      className={`${GeistSans.variable} ${manrope.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeInitScript }} />
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
              <Pixels nonce={nonce} />
              {children}
              {vercelTelemetryEnabled ? <Analytics /> : null}
              {vercelTelemetryEnabled ? <SpeedInsights /> : null}
            </ToastProvider>
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
