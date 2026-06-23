import type { Metadata } from "next";
import { siteUrl } from "@/lib/content";
import { ExamSalesLanding } from "@/components/sections/exam-sales-landing";
import { breadcrumbJsonLd, courseJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "LGS Matematik Dersi",
  description:
    "LGS matematik için en fazla 4 öğrencilik canlı ders, derste soru-cevap ve veliye sade gelişim özeti.",
  alternates: {
    canonical: "/lgs"
  },
  openGraph: {
    title: "LGS Matematik Dersi | Online Dershanem",
    description: "LGS matematik için küçük grup canlı ders, ders içi soru-cevap ve veliye sade gelişim özeti.",
    url: `${siteUrl}/lgs`
  }
};

export default function LGSLandingPage() {
  const courseLd = courseJsonLd({
    name: "LGS Matematik",
    description:
      "LGS matematik için küçük grup canlı ders (en fazla 4 öğrenci), ders sonrası çalışma yönü ve kazanım odaklı çalışma.",
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
        heroTitle: "LGS matematikte öğrencinin sesinin duyulduğu küçük grup.",
        heroText:
          "LGS matematikte öğrenci çözümünü derste gösterir, sorusunu bekletmeden sorar ve hafta sonunda ne çalışacağını bilir. Veliye de çocuğunun nerede zorlandığını anlatan sade bir özet gider.",
        highlights: [
          "En fazla 4 öğrencilik matematik grubunda daha fazla bireysel temas",
          "Ders sonrası ödevlendirme ve net çalışma yönü",
          "Veliye kısa ve anlaşılır gelişim özeti"
        ],
        faq: [
          {
            q: "LGS öğrencisi için tek satış ürünü nedir?",
            a: "Public satışta yalnızca Matematik Ders Paketi var. Öğrenci seviyesine göre küçük canlı ders grubuna yerleştirilir."
          },
          {
            q: "Dersler kalabalık sınıf şeklinde mi?",
            a: "Hayır. Matematik dersleri en fazla 4 öğrencilik küçük grup modelindedir. Bu sayede öğretmen öğrencinin çözümünü derste görebilir."
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
