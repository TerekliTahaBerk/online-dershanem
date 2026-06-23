import type { Metadata } from "next";
import { siteUrl } from "@/lib/content";
import { ExamSalesLanding } from "@/components/sections/exam-sales-landing";
import { breadcrumbJsonLd, courseJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "TYT-AYT Matematik Dersi",
  description:
    "TYT ve AYT matematik için maksimum 4 kişilik butik canlı ders, ders sonrası takip ve veli bilgilendirmesi.",
  alternates: {
    canonical: "/yks/"
  },
  openGraph: {
    title: "TYT-AYT Matematik Dersi | Online Dershanem",
    description: "TYT-AYT matematik için butik canlı ders, ders sonrası takip ve veli bilgilendirmesi.",
    url: `${siteUrl}/yks/`
  }
};

export default function TYTLandingPage() {
  const courseLd = courseJsonLd({
    name: "TYT-AYT Matematik",
    description:
      "TYT ve AYT matematik için butik canlı ders (maksimum 4 kişi), ders sonrası takip ve net odaklı çalışma planı.",
    url: "/yks/",
  });
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Ana Sayfa", url: "/" },
    { name: "TYT-AYT Matematik", url: "/yks/" },
  ]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <ExamSalesLanding
      data={{
        examKey: "TYT-AYT",
        heroBadge: "TYT-AYT Matematik",
        heroTitle: "TYT-AYT matematikte küçük grupla takip edilebilir ilerleme",
        heroText:
          "TYT ve AYT matematikte öğrenciyi maksimum 4 kişilik canlı dersler ve veliye açık gelişim takibiyle ilerletiyoruz. Matematikte nerede takıldığını görüp ders sonrası yönlendirmeyle kapatıyoruz.",
        highlights: [
          "Maksimum 4 kişilik butik matematik grubu",
          "Ders sonrası ödevlendirme ve konu takibi",
          "TYT hız + AYT derinlik dengesine uygun matematik çalışması"
        ],
        faq: [
          {
            q: "TYT ve AYT matematik aynı pakette mi ilerliyor?",
            a: "Evet. Matematik Ders Paketi öğrencinin seviyesine göre TYT temelini ve AYT derinliğini aynı canlı ders takibinde planlar."
          },
          {
            q: "Gruplar nasıl oluşturuluyor?",
            a: "Ön görüşme sonrası seviye ve hedefe göre en fazla 4 kişilik matematik gruplarına yerleşim yapılır. Böylece tempo sınıfa değil öğrenci seviyesine göre belirlenir."
          },
          {
            q: "Paket ücretleri aylık mı?",
            a: "Evet. Matematik Ders Paketi aylık ₺3.000'dir."
          }
        ]
      }}
    />
    </>
  );
}
