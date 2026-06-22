import type { Metadata } from "next";
import { siteUrl } from "@/lib/content";
import { ExamSalesLanding } from "@/components/sections/exam-sales-landing";
import { breadcrumbJsonLd, courseJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "TYT-AYT Matematik Paketleri",
  description:
    "TYT ve AYT matematik için butik canlı dersler, matematik deneme kulübü ve veliye açık gelişim takibi. En fazla 4 kişilik grupta net odaklı ilerleme.",
  alternates: {
    canonical: "/yks/"
  },
  openGraph: {
    title: "TYT-AYT Matematik Paketleri | Online Dershanem",
    description: "TYT-AYT matematik paketlerini inceleyin: butik canlı ders, deneme kulübü ve veliye açık gelişim takibi.",
    url: `${siteUrl}/yks/`
  }
};

export default function TYTLandingPage() {
  const courseLd = courseJsonLd({
    name: "TYT-AYT Matematik",
    description:
      "TYT ve AYT matematik için butik canlı ders (maks. 4 kişi), düzenli matematik denemeleri ve net odaklı gelişim takibi.",
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
        heroTitle: "TYT-AYT matematikte canlı ders ve denemeyle net artışına odaklan",
        heroText:
          "TYT ve AYT matematikte öğrenciyi butik canlı dersler, düzenli matematik denemeleri ve veliye açık gelişim takibiyle ilerletiyoruz. Matematikte nerede takıldığını görüp ders ve denemeyle birlikte kapatıyoruz.",
        highlights: [
          "Maksimum 4 kişilik butik matematik grubu",
          "Düzenli matematik denemeleri ve kazanım analizi",
          "TYT hız + AYT derinlik dengesine uygun matematik planı"
        ],
        faq: [
          {
            q: "Sadece deneme veya sadece ders paketi alabilir miyim?",
            a: "Evet. Matematik Deneme Kulübü ile denemeyle ölçebilir, Matematik Ders Paketi ile canlı derse katılabilir ya da Tam Destek ile ikisini birden alabilirsin."
          },
          {
            q: "Gruplar nasıl oluşturuluyor?",
            a: "Ön görüşme sonrası seviye ve hedefe göre en fazla 4 kişilik matematik gruplarına yerleşim yapılır. Böylece tempo sınıfa değil öğrenci seviyesine göre belirlenir."
          },
          {
            q: "Paket ücretleri aylık mı?",
            a: "Evet. Matematik paketlerinin fiyatları aylıktır: Deneme Kulübü ₺750/ay, Ders Paketi ₺3.000/ay, Tam Destek ₺3.500/ay."
          }
        ]
      }}
    />
    </>
  );
}
