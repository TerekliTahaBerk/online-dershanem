import { ExamSalesLanding } from "@/components/sections/exam-sales-landing";
import { breadcrumbJsonLd, courseJsonLd, faqJsonLd } from "@/lib/seo/jsonld";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  title: "YKS Matematik Kursu | TYT ve AYT",
  description:
    "YKS matematik kursu: en fazla 4 öğrencilik online canlı ders, TYT-AYT çalışma planı, soru çözümü, deneme analizi ve öğretmen yönlendirmesi.",
  canonical: "/yks",
  imagePath: "/yks/opengraph-image",
  imageAlt: "YKS Matematik Dersi — Online Dershanem",
});

export default function TYTLandingPage() {
  const yksFaq = [
    {
      q: "TYT ve AYT matematik aynı YKS paketinde mi ilerliyor?",
      a: "Evet. YKS Matematik Ders Paketi öğrencinin seviyesine göre TYT temelini ve AYT derinliğini aynı canlı ders takibinde planlar."
    },
    {
      q: "Gruplar nasıl oluşturuluyor?",
      a: "Ön görüşme sonrası seviye ve hedefe göre en fazla 4 öğrencilik matematik gruplarına yerleşim yapılır. Böylece tempo sınıfa değil öğrenci seviyesine göre belirlenir."
    },
    {
      q: "Paket ücretleri aylık mı?",
      a: "Evet. YKS Matematik Ders Paketi aylık ilerler; güncel fiyat ve kapsam Ders Paketleri sayfasında açıkça gösterilir."
    },
    {
      q: "Deneme analizi nasıl takip ediliyor?",
      a: "Öğrencinin denemelerinde kaybettiği konu ve soru tipleri birlikte değerlendirilir; haftalık çalışma bu analize göre yönlendirilir."
    },
    {
      q: "Ödeme sonrası ne oluyor?",
      a: "Ödeme sonrası ekibimiz sizinle iletişime geçer, seviye değerlendirmesi yapar ve uygun gruba yerleştirip ilk dersi planlar."
    }
  ];
  const courseLd = courseJsonLd({
    name: "YKS Matematik",
    description:
      "YKS matematik için küçük grup canlı ders (en fazla 4 öğrenci), TYT-AYT dengesi, ders sonrası çalışma yönü ve sınav odaklı matematik planı.",
    url: "/yks/",
  });
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Ana Sayfa", url: "/" },
    { name: "YKS Matematik", url: "/yks/" },
  ]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(yksFaq)) }} />
      <ExamSalesLanding
      data={{
        examKey: "YKS",
        heroBadge: "YKS Matematik",
        heroTitle: "YKS matematikte TYT ve AYT birlikte, dengeli ilerlesin.",
        heroText:
          "YKS öğrencisi derste yalnızca dinlemez; çözümünü gösterir, sorusunu sorar ve ders sonunda TYT-AYT çalışmasında hangi adımla devam edeceğini bilir.",
        highlights: [
          "En fazla 4 öğrencilik matematik grubu",
          "Ders sonrası ödevlendirme ve açık bir çalışma yönü",
          "TYT hız ve AYT derinliğini birlikte taşıyan çalışma düzeni"
        ],
        approach: {
          heading: "YKS matematiğinde TYT-AYT dengesini nasıl kuruyoruz?",
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
              body: "Denemede kaybın hangi konu ve soru tipinden geldiğini birlikte görür, sonraki çalışmayı tam o noktaya yönlendiririz."
            }
          ]
        },
        plan: {
          heading: "Örnek haftalık YKS matematik akışı",
          note: "Plan temsilîdir; öğrencinin seviyesine ve hedef bölümüne göre ön görüşmede uyarlanır.",
          steps: [
            { label: "1. blok", text: "Konu anlatımı ve birlikte çözüm (canlı ders)." },
            { label: "2. blok", text: "TYT hız çalışması: temel soru tipleri ve süre." },
            { label: "3. blok", text: "AYT derinlik: seçili konuda zor soru pratiği." },
            { label: "4. blok", text: "Deneme analizi ve sonraki hafta planı." }
          ]
        },
        sampleSummary: {
          heading: "Örnek YKS veli özeti",
          rows: [
            { label: "İşlenen konu", value: "Türev — artan/azalan ve ekstremum" },
            { label: "Zorlandığı yer", value: "İşaret tablosunu yorumlama" },
            { label: "Bu hafta ödevi", value: "AYT seçmeli 15 soru + 1 TYT deneme bölümü" },
            { label: "Sonraki hedef", value: "İntegral girişine hazırlık" }
          ]
        },
        resources: [
          { label: "TYT matematik çalışma programı", href: "/blog/tyt-matematik-calisma-programi/" },
          { label: "AYT matematik çalışma programı", href: "/blog/ayt-matematik-calisma-programi/" },
          { label: "TYT problem çözme hızı", href: "/blog/tyt-matematik-problem-cozme-hizi/" },
          { label: "Tüm matematik rehberleri", href: "/matematik/" }
        ],
        faq: yksFaq
      }}
    />
    </>
  );
}
