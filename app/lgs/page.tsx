import type { Metadata } from "next";
import { siteUrl } from "@/lib/content";
import { ExamSalesLanding } from "@/components/sections/exam-sales-landing";
import { breadcrumbJsonLd, courseJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "LGS Matematik Dersi",
  description:
    "LGS matematik için maksimum 4 kişilik butik canlı ders, ders sonrası takip ve veli bilgilendirmesi.",
  alternates: {
    canonical: "/lgs"
  },
  openGraph: {
    title: "LGS Matematik Dersi | Online Dershanem",
    description: "LGS matematik için butik canlı ders, ders sonrası takip ve veli bilgilendirmesi.",
    url: `${siteUrl}/lgs`
  }
};

export default function LGSLandingPage() {
  const courseLd = courseJsonLd({
    name: "LGS Matematik",
    description:
      "LGS matematik için butik canlı ders (maksimum 4 kişi), ders sonrası takip ve kazanım odaklı çalışma.",
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
        heroTitle: "LGS matematikte küçük grupla düzenli ilerleme",
        heroText:
          "LGS matematikte öğrenciyi maksimum 4 kişilik canlı dersler ve veliye açık gelişim takibiyle ilerletiyoruz. Çocuğunuzun matematikte nerede takıldığını görüp ders sonrası yönlendirmeyle kapatıyoruz.",
        highlights: [
          "Maksimum 4 kişilik matematik grubunda daha fazla bireysel ilgi",
          "Ders sonrası ödevlendirme ve konu takibi",
          "Veliye net ve anlaşılır gelişim bilgilendirmesi"
        ],
        faq: [
          {
            q: "LGS öğrencisi için tek satış ürünü nedir?",
            a: "Public satışta yalnızca Matematik Ders Paketi var. Öğrenci seviyesine göre küçük canlı ders grubuna yerleştirilir."
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
