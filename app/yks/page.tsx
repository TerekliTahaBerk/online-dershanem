import type { Metadata } from "next";
import { siteUrl } from "@/lib/content";
import { ExamSalesLanding } from "@/components/sections/exam-sales-landing";
import { breadcrumbJsonLd, courseJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "TYT-AYT Matematik Dersi",
  description:
    "TYT ve AYT matematik için en fazla 4 öğrencilik canlı ders, derste soru-cevap ve ders sonrası net çalışma yönü.",
  alternates: {
    canonical: "/yks/"
  },
  openGraph: {
    title: "TYT-AYT Matematik Dersi | Online Dershanem",
    description: "TYT-AYT matematik için küçük grup canlı ders, ders içi soru-cevap ve sade veli özeti.",
    url: `${siteUrl}/yks/`
  }
};

export default function TYTLandingPage() {
  const courseLd = courseJsonLd({
    name: "TYT-AYT Matematik",
    description:
      "TYT ve AYT matematik için küçük grup canlı ders (en fazla 4 öğrenci), ders sonrası çalışma yönü ve sınav odaklı matematik planı.",
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
        heroTitle: "TYT-AYT matematikte derste görünen, hafta içinde yönünü bilen öğrenci.",
        heroText:
          "TYT ve AYT matematikte öğrenci sadece dinlemez; çözümünü gösterir, sorusunu sorar ve ders sonunda hangi çalışmayla devam edeceğini bilir. Veliye de süreç sade bir dille aktarılır.",
        highlights: [
          "En fazla 4 öğrencilik matematik grubu",
          "Ders sonrası ödevlendirme ve net çalışma yönü",
          "TYT hız + AYT derinlik dengesine uygun matematik çalışması"
        ],
        faq: [
          {
            q: "TYT ve AYT matematik aynı pakette mi ilerliyor?",
            a: "Evet. Matematik Ders Paketi öğrencinin seviyesine göre TYT temelini ve AYT derinliğini aynı canlı ders takibinde planlar."
          },
          {
            q: "Gruplar nasıl oluşturuluyor?",
            a: "Ön görüşme sonrası seviye ve hedefe göre en fazla 4 öğrencilik matematik gruplarına yerleşim yapılır. Böylece tempo sınıfa değil öğrenci seviyesine göre belirlenir."
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
