import type { Metadata } from "next";
import "./globals.css";
import { seoKeywords, siteUrl } from "@/lib/content";
import { Pixels } from "@/components/analytics/pixels";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
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
    url: siteUrl,
    siteName: "Online Dershanem",
    locale: "tr_TR",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Online Dershanem",
    description: "TYT-AYT ve LGS için küçük grup canlı ders, haftalık takip ve ders bazlı özel ders planı."
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
