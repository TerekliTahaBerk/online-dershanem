import type { Metadata } from "next";
import { siteUrl } from "@/lib/content";
import { ExamSalesLanding } from "@/components/sections/exam-sales-landing";
import { breadcrumbJsonLd, courseJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "LGS Matematik Paketleri",
  description:
    "LGS matematik için butik canlı dersler, matematik deneme kulübü ve veliye açık gelişim takibi. En fazla 4 kişilik grupta kazanım bazlı ilerleme.",
  alternates: {
    canonical: "/lgs"
  },
  openGraph: {
    title: "LGS Matematik Paketleri | Online Dershanem",
    description: "LGS matematik paketlerini inceleyin: butik canlı ders, deneme kulübü ve veliye açık gelişim takibi.",
    url: `${siteUrl}/lgs`
  }
};

export default function LGSLandingPage() {
  const courseLd = courseJsonLd({
    name: "LGS Matematik",
    description:
      "LGS matematik için butik canlı ders (maks. 4 kişi), düzenli matematik denemeleri ve kazanım bazlı gelişim takibi.",
    url: "/lgs/",
  });
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Ana Sayfa", url: "/" },
    { name: "LGS Matematik", url: "/lgs/" },
  ]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <ExamSalesLanding
      data={{
        examKey: "LGS",
        heroBadge: "LGS Matematik",
        heroTitle: "LGS matematikte butik canlı ders ve deneme takibiyle düzenli ilerleme",
        heroText:
          "LGS matematikte öğrenciyi butik canlı dersler, düzenli matematik denemeleri ve veliye açık gelişim takibiyle ilerletiyoruz. Çocuğunuzun matematikte nerede takıldığını görüp ders ve denemeyle birlikte kapatıyoruz.",
        highlights: [
          "Maksimum 4 kişilik matematik grubunda daha fazla bireysel ilgi",
          "Kazanım bazlı matematik takibi ve düzenli denemeler",
          "Veliye net ve anlaşılır gelişim bilgilendirmesi"
        ],
        faq: [
          {
            q: "Sadece deneme veya sadece ders paketi alabilir miyim?",
            a: "Evet. Matematik Deneme Kulübü ile sadece denemeyle ölçebilir, Matematik Ders Paketi ile canlı derse katılabilir ya da Tam Destek ile ikisini birden alabilirsin."
          },
          {
            q: "Dersler kalabalık sınıf şeklinde mi?",
            a: "Hayır. Matematik dersleri en fazla 4 kişilik butik grup modelindedir. Bu sayede öğretmen takibi daha yakın ilerler."
          },
          {
            q: "Ders kaçırılırsa süreç nasıl ilerliyor?",
            a: "Telafi planı ile öğrenci aynı hafta içinde akışa geri alınır, matematik kazanım takibi kesintiye uğratılmaz."
          }
        ]
      }}
    />
    </>
  );
}
