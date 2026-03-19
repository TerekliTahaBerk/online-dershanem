import type { Metadata } from "next";
import "./globals.css";
import { seoKeywords, siteUrl } from "@/lib/content";
import { Pixels } from "@/components/analytics/pixels";

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
    icon: [
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" }
    ],
    shortcut: ["/favicon-48x48.png"],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
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
