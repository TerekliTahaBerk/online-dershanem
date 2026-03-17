import type { Metadata } from "next";
import "./globals.css";
import { seoKeywords, siteUrl } from "@/lib/content";
import { Pixels } from "@/components/analytics/pixels";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Online Dershanem | Butik Online Sınıflar",
    template: "%s | Online Dershanem"
  },
  description:
    "TYT-AYT ve LGS için ders bazlı Grup Özel Ders paketleri: küçük gruplar, seviyeye göre yerleşim ve odaklı canlı ders akışı.",
  keywords: seoKeywords,
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "Online Dershanem | Butik Online Sınıflar",
    description:
      "Ders bazlı Grup Özel Ders modeli: ihtiyaç duyduğun dersi seç, küçük grupta odaklı ilerle.",
    url: siteUrl,
    siteName: "Online Dershanem",
    locale: "tr_TR",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Online Dershanem",
    description: "TYT-AYT ve LGS için ders bazlı küçük grup özel ders deneyimi."
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png"
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <Pixels />
        {children}
      </body>
    </html>
  );
}
