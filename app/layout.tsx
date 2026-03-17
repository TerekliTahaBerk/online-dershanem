import type { Metadata } from "next";
import "./globals.css";
import { seoKeywords, siteUrl } from "@/lib/content";
import { Pixels } from "@/components/analytics/pixels";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Online Dershanem | Online Dershane, TYT-AYT-LGS Özel Ders",
    template: "%s | Online Dershanem"
  },
  description:
    "Online Dershanem: TYT, AYT, LGS ve YKS için ders bazlı grup özel ders modeli. Küçük gruplar, seviyeye göre yerleşim, canlı ders ve düzenli takip.",
  keywords: seoKeywords,
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "Online Dershanem | Online Dershane, TYT-AYT-LGS Özel Ders",
    description:
      "TYT, AYT, LGS ve YKS için online dershane ve grup özel ders modeli: canlı ders, koçluk, takip ve net artışı odaklı yapı.",
    url: siteUrl,
    siteName: "Online Dershanem",
    locale: "tr_TR",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Online Dershanem",
    description: "Online dershane ve TYT-AYT-LGS-YKS özel ders modeliyle hedef odaklı sınav hazırlığı."
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
