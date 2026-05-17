import type { Metadata } from "next";
import { siteUrl } from "@/lib/content";
import { ExamSalesLanding } from "@/components/sections/exam-sales-landing";
import { breadcrumbJsonLd, courseJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "LGS Grup Özel Ders Paketleri",
  description:
    "LGS Matematik ve Fen için ders bazlı küçük grup özel ders paketleri: takip modeli, fiyatlar ve butik grup yapısı.",
  alternates: {
    canonical: "/lgs"
  },
  openGraph: {
    title: "LGS Grup Özel Ders Paketleri | Online Dershanem",
    description: "LGS ders bazlı paket fiyatlarını inceleyin ve seviyeye uygun küçük gruba başvurun.",
    url: `${siteUrl}/lgs`
  }
};

export default function LGSLandingPage() {
  const courseLd = courseJsonLd({
    name: "LGS Grup Özel Ders",
    description:
      "LGS Matematik ve Fen Bilimleri için ders bazlı küçük grup (maks. 4 kişi) özel ders. Kazanım takibi ve düzenli mini quiz yapısıyla.",
    url: "/lgs/",
  });
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Ana Sayfa", url: "/" },
    { name: "LGS Grup Özel Ders", url: "/lgs/" },
  ]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <ExamSalesLanding
      data={{
        examKey: "LGS",
        heroBadge: "LGS Grup Özel Ders",
        heroTitle: "LGS'de ders bazlı küçük grup paketleriyle düzenli ilerleme",
        heroText:
          "LGS sürecinde öğrenciler tüm dersleri toplu almak zorunda değildir. Matematik veya Fen Bilimleri paketini ayrı seçerek odaklı ve verimli şekilde ilerleyebilir.",
        highlights: [
          "Maksimum 4 kişilik sınıf ile daha fazla bireysel ilgi",
          "Kazanım bazlı takip ve düzenli mini quiz yapısı",
          "Veliye net ve anlaşılır süreç bilgilendirmesi"
        ],
        faq: [
          {
            q: "LGS öğrencisi tek ders paketi alabilir mi?",
            a: "Evet. Matematik veya Fen Bilimleri paketini ayrı seçebilirsin. İhtiyaca göre ikinci ders sonradan eklenebilir."
          },
          {
            q: "Dersler kalabalık sınıf şeklinde mi?",
            a: "Hayır. Tüm paketler küçük grup (maks. 4 kişi) modelindedir. Bu sayede öğretmen takibi daha yakın ilerler."
          },
          {
            q: "Ders kaçırılırsa süreç nasıl ilerliyor?",
            a: "Kayıt ve telafi planı ile öğrenci aynı hafta içinde akışa geri alınır, kazanım takibi kesintiye uğratılmaz."
          }
        ]
      }}
    />
    </>
  );
}
