import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { Instrument_Serif, Inter } from "next/font/google";
import "./globals.css";
import { seoKeywords, siteUrl } from "@/lib/content";

import { Suspense } from "react";
import { Pixels } from "@/components/analytics/pixels";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { NavigationProgress } from "@/components/ui/navigation-progress";
import { CartProvider } from "@/components/cart/cart-provider";
import { CartFab } from "@/components/cart/cart-fab";
import { ToastProvider } from "@/components/ui/toast";

const themeInitScript = `(()=>{try{document.documentElement.setAttribute('data-theme','light');}catch(e){}})();`;
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
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
  themeColor: "#FAFAF7"
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  manifest: "/manifest.webmanifest",
  title: {
    default: "TYT-AYT ve LGS Online Dershane | Küçük Grup Özel Ders",
    template: "%s | Online Dershanem"
  },
  description:
    "TYT-AYT ve LGS için küçük grup online özel ders. Seviyene uygun sınıf, canlı ders, haftalık takip ve net odaklı çalışma planı.",
  keywords: seoKeywords,
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "TYT-AYT ve LGS Online Dershane | Küçük Grup Özel Ders",
    description:
      "Seviyene uygun küçük grupla canlı derse katıl, haftalık takip ve net odaklı planla düzenli ilerle.",
    url: `${siteUrl}/`,
    siteName: "Online Dershanem",
    locale: "tr_TR",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Online Dershanem"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Online Dershanem",
    description: "TYT-AYT ve LGS için küçük grup canlı ders, haftalık takip ve ders bazlı özel ders planı.",
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
      className={`${GeistSans.variable} ${instrumentSerif.variable} ${inter.variable}`}
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
        </AuthSessionProvider>
      </body>
    </html>
  );
}
