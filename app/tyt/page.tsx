import type { Metadata } from "next";
import { siteUrl } from "@/lib/content";
import { ExamSalesLanding } from "@/components/sections/exam-sales-landing";

export const metadata: Metadata = {
  title: "TYT-AYT Grup Özel Ders Paketleri",
  description:
    "TYT ve AYT için ders bazlı küçük grup özel ders paketleri: fiyatlar, ders içerikleri ve hızlı başvuru.",
  alternates: {
    canonical: "/tyt"
  },
  openGraph: {
    title: "TYT-AYT Grup Özel Ders Paketleri | Online Dershanem",
    description: "TYT-AYT ders bazlı paket fiyatlarını inceleyin ve seviyene uygun gruba başvur.",
    url: `${siteUrl}/tyt`
  }
};

export default function TYTLandingPage() {
  return (
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
  );
}
