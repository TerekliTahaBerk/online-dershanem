import { ExamSalesLanding } from "@/components/sections/exam-sales-landing";
import { breadcrumbJsonLd, courseJsonLd, faqJsonLd } from "@/lib/seo/jsonld";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  title: "LGS Matematik Kursu ve Online Ders",
  description:
    "LGS matematik kursu: en fazla 4 öğrencilik online canlı ders, yeni nesil soru çözümü, çalışma programı ve ders sonrası öğretmen yönlendirmesi.",
  canonical: "/lgs",
  imagePath: "/lgs/opengraph-image",
  imageAlt: "LGS Matematik Dersi — Online Dershanem",
});

export default function LGSLandingPage() {
  const lgsFaq = [
    {
      q: "LGS öğrencisi için hangi paket var?",
      a: "LGS öğrencisi için LGS Matematik Ders Paketi var. Öğrenci seviyesi ve hedefi konuşulduktan sonra uygun küçük gruba yerleştirilir."
    },
    {
      q: "Dersler kalabalık sınıf şeklinde mi?",
      a: "Hayır. Matematik dersleri en fazla 4 öğrencilik küçük grup modelindedir. Bu sayede öğretmen öğrencinin çözümünü derste görebilir."
    },
    {
      q: "Ders kaçırılırsa süreç nasıl ilerliyor?",
      a: "Ayrı bir telafi dersi yapılmaz. Öğrenci katılamadığında ders kaydı ve ders sonu özeti paylaşılır; işlenen konu ile verilen ödev bu şekilde takip edilir."
    },
    {
      q: "Dersler canlı mı, kayıt mı?",
      a: "Dersler Google Meet üzerinden canlıdır. Öğrenci soru sorar, çözümünü gösterir; hazır video izlemez."
    },
    {
      q: "Ödeme sonrası süreç nasıl işliyor?",
      a: "Ödeme sonrası ekibimiz sizinle iletişime geçer, seviye değerlendirmesi yapar ve uygun gruba yerleştirip ilk dersi planlar."
    }
  ];
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(lgsFaq)) }} />
      <ExamSalesLanding
      data={{
        examKey: "LGS",
        heroBadge: "LGS Matematik",
        heroTitle: "LGS matematikte öğrencinin çözümünün görüldüğü küçük grup.",
        heroText:
          "LGS öğrencisi derste çözümünü gösterir, sorusunu bekletmeden sorar ve hafta içinde hangi çalışmayla devam edeceğini bilir.",
        highlights: [
          "En fazla 4 öğrencilik matematik grubunda daha fazla bireysel temas",
          "Yeni nesil sorularda birlikte çözüm ve soru-cevap",
          "Ders sonrası ödevlendirme ve net çalışma yönü"
        ],
        approach: {
          heading: "LGS matematiğinde öğrenciye nasıl yaklaşıyoruz?",
          items: [
            {
              title: "Yeni nesil soruda takılan öğrenci",
              body: "Yeni nesil sorularda öğrenci çoğu zaman konuyu bilir ama sorunun ne istediğini kaçırır. Önce soruyu birlikte ayrıştırır, sonra benzer tipleri derste çözeriz."
            },
            {
              title: "Bu model 8. sınıf için ne zaman doğru?",
              body: "Konu eksiği birikmeye başladıysa, deneme sonuçları dalgalanıyorsa ve öğrenci derste soru sormaktan çekiniyorsa küçük grup modeli anlamlı olur."
            },
            {
              title: "Küçük grup avantajı",
              body: "En fazla 4 öğrencide öğretmen her öğrencinin çözümünü daha yakından görür; geride kalma riskini erken fark etmek kolaylaşır."
            }
          ]
        },
        plan: {
          heading: "Örnek 8 haftalık LGS matematik akışı",
          note: "Plan temsilîdir; öğrencinin seviyesine ve eksik konularına göre ön görüşmede uyarlanır.",
          steps: [
            { label: "Hafta 1–2", text: "Seviye tespiti ve temel eksik kapatma: sayılar, oran-orantı." },
            { label: "Hafta 3–4", text: "Cebirsel ifadeler ve denklemler; yeni nesil soruya giriş." },
            { label: "Hafta 5–6", text: "Geometri temelleri, veri ve olasılık." },
            { label: "Hafta 7–8", text: "Karışık deneme çözümü, hız ve süre yönetimi." }
          ]
        },
        sampleSummary: {
          heading: "Örnek LGS veli özeti",
          rows: [
            { label: "İşlenen konu", value: "Üçgenlerde eşlik ve benzerlik" },
            { label: "Zorlandığı yer", value: "Benzerlik oranını kurarken kenar eşleştirmesi" },
            { label: "Bu hafta ödevi", value: "10 yeni nesil soru + 1 deneme bölümü" },
            { label: "Sonraki hedef", value: "Çokgenler ve alan problemleri" }
          ]
        },
        resources: [
          { label: "LGS matematik çalışma programı", href: "/blog/lgs-matematik-calisma-programi" },
          { label: "LGS yeni nesil matematik soruları", href: "/blog/lgs-yeni-nesil-matematik-sorulari" },
          { label: "Matematik deneme analizi", href: "/blog/matematik-deneme-analizi" },
          { label: "Tüm matematik rehberleri", href: "/matematik" }
        ],
        faq: lgsFaq
      }}
    />
    </>
  );
}
