import type { Metadata } from "next";
import { siteUrl } from "@/lib/content";
import { ExamSalesLanding } from "@/components/sections/exam-sales-landing";
import { breadcrumbJsonLd, courseJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "TYT-AYT Matematik Dersi",
  description:
    "TYT ve AYT matematik için en fazla 4 öğrencilik canlı ders, derste soru-cevap ve ders sonrası çalışma yönü.",
  alternates: {
    canonical: "/yks/"
  },
  openGraph: {
    title: "TYT-AYT Matematik Dersi | Online Dershanem",
    description: "TYT-AYT matematik için küçük grup canlı ders, ders içi soru-cevap ve veliye kısa gelişim notu.",
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
          "TYT ve AYT matematikte öğrenci sadece dinlemez; çözümünü gösterir, sorusunu sorar ve ders sonunda hangi çalışmayla devam edeceğini bilir. Veliye de süreç yalın bir dille aktarılır.",
        highlights: [
          "En fazla 4 öğrencilik matematik grubu",
          "Ders sonrası ödevlendirme ve açık bir çalışma yönü",
          "TYT hız + AYT derinlik dengesine uygun matematik çalışması"
        ],
        approach: {
          heading: "TYT-AYT matematiğinde dengeyi nasıl kuruyoruz?",
          items: [
            {
              title: "TYT mi, AYT mi önce?",
              body: "Temel eksiği olan öğrencide önce TYT matematiği sağlamlaştırılır; ardından hedef bölüme göre AYT derinliği eklenir."
            },
            {
              title: "Temel eksiği olan öğrenci",
              body: "Lise konuları üst üste bindiyse önce eksik temel kapatılır; öğrenci konuyu anlamadan soru ezberlemez."
            },
            {
              title: "Deneme analizi",
              body: "Her denemede hangi konuda ve hangi soru tipinde kaybedildiğini birlikte çıkarır, çalışmayı tam o noktaya yönlendiririz."
            }
          ]
        },
        plan: {
          heading: "Örnek haftalık TYT-AYT matematik akışı",
          note: "Plan temsilîdir; öğrencinin seviyesine ve hedef bölümüne göre ön görüşmede uyarlanır.",
          steps: [
            { label: "1. blok", text: "Konu anlatımı ve birlikte çözüm (canlı ders)." },
            { label: "2. blok", text: "TYT hız çalışması: temel soru tipleri ve süre." },
            { label: "3. blok", text: "AYT derinlik: seçili konuda zor soru pratiği." },
            { label: "4. blok", text: "Deneme analizi ve sonraki hafta planı." }
          ]
        },
        sampleSummary: {
          heading: "Örnek TYT-AYT veli özeti",
          rows: [
            { label: "İşlenen konu", value: "Türev — artan/azalan ve ekstremum" },
            { label: "Zorlandığı yer", value: "İşaret tablosunu yorumlama" },
            { label: "Bu hafta ödevi", value: "AYT seçmeli 15 soru + 1 TYT deneme bölümü" },
            { label: "Sonraki hedef", value: "İntegral girişine hazırlık" }
          ]
        },
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
          },
          {
            q: "Deneme analizi nasıl takip ediliyor?",
            a: "Öğrencinin denemelerinde kaybettiği konu ve soru tipleri birlikte değerlendirilir; haftalık çalışma bu analize göre yönlendirilir."
          },
          {
            q: "Ödeme sonrası ne oluyor?",
            a: "Ödeme sonrası ekibimiz sizinle iletişime geçer, seviye değerlendirmesi yapar ve uygun gruba yerleştirip ilk dersi planlar."
          }
        ]
      }}
    />
    </>
  );
}
