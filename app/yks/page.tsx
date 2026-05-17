import type { Metadata } from "next";
import { siteUrl } from "@/lib/content";
import { ExamSalesLanding } from "@/components/sections/exam-sales-landing";
import { breadcrumbJsonLd, courseJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "TYT-AYT Grup Özel Ders Paketleri",
  description:
    "TYT ve AYT için ders bazlı küçük grup özel ders paketleri: ders içerikleri, fiyatlar ve butik grup yerleşimi.",
  alternates: {
    canonical: "/yks/"
  },
  openGraph: {
    title: "TYT-AYT Grup Özel Ders Paketleri | Online Dershanem",
    description: "TYT-AYT ders bazlı paket fiyatlarını inceleyin ve seviyene uygun gruba başvur.",
    url: `${siteUrl}/yks/`
  }
};

export default function TYTLandingPage() {
  const courseLd = courseJsonLd({
    name: "TYT-AYT Grup Özel Ders",
    description:
      "TYT ve AYT için ders bazlı küçük grup özel ders. Maksimum 4 kişilik gruplarla seviyeye göre yerleşim, haftalık takip ve net odaklı çalışma planı.",
    url: "/yks/",
  });
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Ana Sayfa", url: "/" },
    { name: "TYT-AYT Grup Özel Ders", url: "/yks/" },
  ]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <ExamSalesLanding
      data={{
        examKey: "TYT-AYT",
        heroBadge: "TYT-AYT Grup Özel Ders",
        heroTitle: "TYT-AYT için ders bazlı paketleri seç, net artışına odaklan",
        heroText:
          "Bu yapı klasik tüm dersleri içeren paket değildir. TYT-AYT tarafında ihtiyacın olan dersi ayrı seçer, küçük grupta seviyene uygun tempoyla ilerlersin.",
        highlights: [
          "Maksimum 4 kişilik küçük grup yapısı",
          "Seviyeye göre gruplandırma ve düzenli takip",
          "TYT hız + AYT derinlik dengesine uygun ders planı"
        ],
        faq: [
          {
            q: "TYT ve AYT derslerini birlikte almak zorunda mıyım?",
            a: "Hayır. Dersler ayrı paketlenir. Sadece ihtiyaç duyduğun dersi seçebilir, süreç içinde yeni ders ekleyebilirsin."
          },
          {
            q: "Gruplar nasıl oluşturuluyor?",
            a: "Ön görüşme sonrası seviye ve hedefe göre 4 kişilik gruplara yerleşim yapılır. Böylece tempo sınıfa değil öğrenci seviyesine göre belirlenir."
          },
          {
            q: "Paket ücretleri aylık mı?",
            a: "Evet. Kartlarda görünen indirimli fiyatlar aylık ücretlerdir ve ders başı ücret bilgisi ayrıca belirtilir."
          }
        ]
      }}
    />
    </>
  );
}
