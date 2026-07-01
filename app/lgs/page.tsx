import type { Metadata } from "next";
import { siteUrl } from "@/lib/content";
import { ExamSalesLanding } from "@/components/sections/exam-sales-landing";
import { breadcrumbJsonLd, courseJsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "LGS Matematik Dersi",
  description:
    "LGS matematik için en fazla 4 öğrencilik canlı ders, derste soru-cevap ve veliye kısa gelişim notu.",
  alternates: {
    canonical: "/lgs"
  },
  openGraph: {
    title: "LGS Matematik Dersi | Online Dershanem",
    description: "LGS matematik için küçük grup canlı ders, ders içi soru-cevap ve veliye kısa gelişim notu.",
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
          "LGS matematikte öğrenci çözümünü derste gösterir, sorusunu bekletmeden sorar ve hafta sonunda ne çalışacağını bilir. Veliye de çocuğunun nerede zorlandığını anlatan kısa bir özet gider.",
        highlights: [
          "En fazla 4 öğrencilik matematik grubunda daha fazla bireysel temas",
          "Ders sonrası ödevlendirme ve belirli bir çalışma yönü",
          "Veliye kısa ve anlaşılır gelişim özeti"
        ],
        approach: {
          heading: "LGS matematiğinde öğrenciye nasıl yaklaşıyoruz?",
          items: [
            {
              title: "Yeni nesil soruda takılan öğrenci",
              body: "Yeni nesil sorularda öğrenci çoğu zaman konuyu bilir ama soruyu çözemez. Önce sorunun ne istediğini birlikte ayrıştırır, sonra benzer tipleri derste çözeriz."
            },
            {
              title: "Bu model 8. sınıf için ne zaman doğru?",
              body: "Konu eksiği birikmeye başladıysa, deneme netleri oturmuyorsa ve öğrenci derste soru sormaktan çekiniyorsa küçük grup modeli bu noktada anlamlı olur."
            },
            {
              title: "Küçük grup avantajı",
              body: "En fazla 4 öğrencide öğretmen her öğrencinin çözümünü görür; LGS temposunda kimse geride kalmaz."
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
            a: "Telafi planıyla öğrenci aynı hafta içinde derse geri döner; konu takibi aksamaz."
          },
          {
            q: "Dersler canlı mı, kayıt mı?",
            a: "Dersler Google Meet üzerinden canlıdır. Öğrenci soru sorar, çözümünü gösterir; hazır video izlemez."
          },
          {
            q: "Ödeme sonrası süreç nasıl işliyor?",
            a: "Ödeme sonrası ekibimiz sizinle iletişime geçer, seviye değerlendirmesi yapar ve uygun gruba yerleştirip ilk dersi planlar."
          }
        ]
      }}
    />
    </>
  );
}
