import type { Metadata } from "next";
import {
  BarChart3,
  BookOpen,
  Brain,
  CheckCircle2,
  Clock,
  FileText,
  Flame,
  Layers,
  LineChart,
  Target,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { StickyContactBar } from "@/components/sections/sticky-contact-bar";
import { MultiStepLeadForm } from "@/components/sections/multi-step-lead-form";
import { Container } from "@/components/ui/container";
import { FadeIn } from "@/components/ui/fade-in";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";
import { siteUrl } from "@/lib/content";

export const metadata: Metadata = {
  title: "Deneme Kulübü",
  description:
    "TYT, AYT ve LGS öğrencileri için düzenli deneme çözümü, detaylı hata analizi ve net artış koçluğuyla sınav hazırlığını bir üst seviyeye taşı.",
  alternates: {
    canonical: "/deneme-kulubu/"
  },
  openGraph: {
    title: "Deneme Kulübü | Online Dershanem",
    description:
      "Sadece deneme değil; analiz, strateji ve koçlukla net artışını garantile. TYT, AYT ve LGS için yakında.",
    url: `${siteUrl}/deneme-kulubu/`
  }
};

const howItWorks = [
  {
    step: "01",
    icon: FileText,
    title: "Denemeyi Çöz",
    desc: "Her hafta belirlenen günde TYT, AYT veya LGS denemeni bağımsız olarak çözersin. Gerçek sınav koşullarını simüle eden zaman kısıtlamalı ortam."
  },
  {
    step: "02",
    icon: BarChart3,
    title: "Canlı Analiz Seansı",
    desc: "Deneme sonrasında öğretmenlerimizle canlı analiz seansına katılırsın. Hangi soruları neden yanlış yaptığını, hangi konularda açık verdiğini birlikte inceleriz."
  },
  {
    step: "03",
    icon: Brain,
    title: "Hata Haritası",
    desc: "Her denemeden sonra kişisel hata haritanı çıkarırız: kavram hatası mı, dikkatsizlik mi, zaman yönetimi mi? Sorunun kaynağına ineriz."
  },
  {
    step: "04",
    icon: Target,
    title: "Kişisel Strateji Güncellemesi",
    desc: "Biriken deneme verilerine göre çalışma planın düzenlenir. Hangi konuya ne kadar zaman ayırman gerektiği somut olarak belirlenir."
  }
];

const features = [
  {
    icon: Clock,
    title: "Haftalık Düzenli Deneme",
    desc: "Belirlenen günde, aynı rutinde, gerçek sınav atmosferinde deneme çözersin. Düzenlilik disiplin, disiplin net artışı getirir."
  },
  {
    icon: LineChart,
    title: "Grafik Bazlı Gelişim Takibi",
    desc: "Her denemenden sonra net sayıların, doğru-yanlış oranların ve konu performansların grafiğe dökülür. Gelişimini somut olarak görürsün."
  },
  {
    icon: Users,
    title: "Küçük Grup, Yüksek Verim",
    desc: "Maksimum 12 kişilik analiz gruplarında her öğrencinin hatasına tek tek odaklanılır. Kaybolup gitmezsin, her sefer görünürsün."
  },
  {
    icon: Zap,
    title: "Hız ve Strateji Antrenmanı",
    desc: "Doğru cevap vermeyi bilmek yeterli değil; doğru soruyu, doğru sürede, doğru sırayla çözmek gerekir. Bunu sana öğretiriz."
  },
  {
    icon: BookOpen,
    title: "Konu Bazlı Tekrar Planı",
    desc: "Denemelerden elde edilen verilerle eksik konuların önceliklendirilir ve takip eden hafta için odak noktaları belirlenir."
  },
  {
    icon: Layers,
    title: "Ortak Hata Videoları",
    desc: "Gruptaki öğrencilerin en çok takıldığı sorular için özel çözüm videoları hazırlanır. İzle, anla, pekiştir."
  }
];

const whyDifferent = [
  {
    icon: Flame,
    title: "Sadece deneme değil, analiz kulübü",
    desc: "Piyasadaki deneme paketleri sana binlerce soru verir ve bırakır. Biz denemeyi araç olarak kullanır; asıl işimiz hatayı teşhis etmek ve iyileştirmektir."
  },
  {
    icon: Trophy,
    title: "Koçlukla desteklenen süreç",
    desc: "Bir denemeyi çözdükten sonra ne yapman gerektiğini bilmemek en büyük zaman kaybı. Deneme Kulübü'nde her denemeden sonra sıradaki adımın netleşir."
  },
  {
    icon: CheckCircle2,
    title: "Veri odaklı net artışı",
    desc: "His ve tahminle değil, somut verilerle çalışırsın. Hangi konuda kaç net verdiğin, nereye zaman harcadığın sayılarla ortaya konur."
  }
];

const comingSoonPackages = [
  {
    exam: "TYT",
    color: "from-blue-50 to-sky-50",
    badge: "bg-blue-100 text-blue-700",
    border: "border-blue-200",
    desc: "Temel Yeterlilik Testi için haftalık deneme, detaylı analiz ve net artış koçluğu. Türkçe, Matematik, Fen ve Sosyal alanlarında kapsamlı takip.",
    features: ["Haftalık TYT Denemesi", "Türkçe-Mat-Fen-Sosyal Analizi", "Hata Haritası", "Net Artış Koçluğu", "Çalışma Planı Güncelleme"]
  },
  {
    exam: "AYT",
    color: "from-purple-50 to-violet-50",
    badge: "bg-purple-100 text-purple-700",
    border: "border-purple-200",
    desc: "Alan Yeterlilik Testi için sayısal, eşit ağırlık ve sözel branşlarda derinlemesine analiz ve konu odaklı strateji geliştirme.",
    features: ["Haftalık AYT Denemesi", "Branş Bazlı Analiz", "Hata Haritası", "Konu Önceliklendirme", "Sayısal / EA / Sözel Takip"]
  },
  {
    exam: "LGS",
    color: "from-emerald-50 to-teal-50",
    badge: "bg-emerald-100 text-emerald-700",
    border: "border-emerald-200",
    desc: "Liselere Giriş Sınavı için Matematik ve Fen Bilimleri odaklı, yeni nesil soru stratejisi ve düzenli analiz desteği.",
    features: ["Haftalık LGS Denemesi", "Mat ve Fen Analizi", "Yeni Nesil Soru Stratejisi", "Hata Haritası", "Çalışma Planı Takibi"]
  }
];

export default function DenemeKulubuPage() {
  return (
    <>
      <Navbar />
      <main className="py-14 sm:py-20">
        <Container>

          {/* Hero */}
          <FadeIn>
            <section className="rounded-3xl border border-line bg-gradient-to-br from-white via-paper to-mint p-7 shadow-soft sm:p-12">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">Deneme Kulübü</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-5xl">
                Denemeyi Çözmek Yetmez.{" "}
                <span className="text-brand">Anlamak Lazım.</span>
              </h1>
              <p className="mt-5 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
                Online Dershanem Deneme Kulübü, düzenli deneme çözümünü derin hata analiziyle birleştirir. Her hafta çözdüğün deneme; bireysel hata haritana, kişisel strateji güncellemene ve koçlukla desteklenen net artış planına dönüşür.
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
                Piyasadaki deneme paketleri sana binlerce soru verir ve bırakır. Biz farklıyız: denemeni bir araç olarak kullanır, asıl işimiz hatanın kaynağını bulmak ve bir daha tekrar etmemeni sağlamaktır.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <LeadFunnelTrigger
                  source="odk_hero_cta"
                  eventName="landing_cta_click"
                  className="inline-flex rounded-full bg-anchor px-6 py-3 text-sm font-semibold text-white transition hover:bg-pine"
                  analyticsId="odk_hero_cta"
                >
                  Yakında Başlıyor — Bildir
                </LeadFunnelTrigger>
                <span className="text-sm text-muted">TYT · AYT · LGS için paketler yolda</span>
              </div>
            </section>
          </FadeIn>

          {/* Why different */}
          <section className="mt-12">
            <FadeIn>
              <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Neden Farklı?</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                Deneme Kulübü'nü sıradan deneme paketlerinden ayıran üç temel fark.
              </p>
            </FadeIn>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {whyDifferent.map((item, i) => (
                <FadeIn key={item.title} delay={i * 0.07}>
                  <div className="flex h-full flex-col rounded-3xl border border-line bg-white p-6 shadow-soft">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-soft">
                      <item.icon className="h-5 w-5 text-brand" />
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-ink">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{item.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </section>

          {/* How it works */}
          <section className="mt-14">
            <FadeIn>
              <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Nasıl Çalışır?</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                Dört adımlık döngü, her hafta tekrar eder. Her tur seni biraz daha ileri taşır.
              </p>
            </FadeIn>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {howItWorks.map((item, i) => (
                <FadeIn key={item.step} delay={i * 0.08}>
                  <div className="relative flex h-full flex-col rounded-3xl border border-line bg-white p-6 shadow-soft">
                    <span className="text-5xl font-black text-soft">{item.step}</span>
                    <div className="mt-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-mint">
                      <item.icon className="h-4.5 w-4.5 h-5 w-5 text-pine" />
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-ink">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{item.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </section>

          {/* Features */}
          <section className="mt-14">
            <FadeIn>
              <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Kulüp Avantajları</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                Her hafta seni daha güçlü, daha bilinçli ve daha stratejik yapan altı temel unsur.
              </p>
            </FadeIn>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {features.map((item, i) => (
                <FadeIn key={item.title} delay={i * 0.06}>
                  <div className="flex h-full gap-4 rounded-3xl border border-line bg-white p-5 shadow-soft">
                    <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-soft">
                      <item.icon className="h-4.5 w-4.5 h-5 w-5 text-brand" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.desc}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </section>

          {/* Coming soon packages */}
          <section className="mt-14">
            <FadeIn>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">Paketler</p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Yakında Geliyor</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                    TYT, AYT ve LGS için Deneme Kulübü paketleri hazırlanıyor. İlk açıklandığında haberdar olmak için ön başvuru bırakabilirsin.
                  </p>
                </div>
              </div>
            </FadeIn>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {comingSoonPackages.map((pkg, i) => (
                <FadeIn key={pkg.exam} delay={i * 0.08}>
                  <article className={`relative flex h-full flex-col rounded-3xl border bg-gradient-to-br p-6 ${pkg.color} ${pkg.border}`}>
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${pkg.badge}`}>
                        {pkg.exam}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                        Yakında
                      </span>
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-ink">
                      {pkg.exam} Deneme Kulübü
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{pkg.desc}</p>
                    <ul className="mt-5 space-y-2">
                      {pkg.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-xs text-muted">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-brand" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-6 flex-1" />
                    <LeadFunnelTrigger
                      source={`odk_package_${pkg.exam.toLowerCase()}_notify`}
                      eventName="landing_cta_click"
                      className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-anchor px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-pine"
                      analyticsId={`odk_package_${pkg.exam.toLowerCase()}_notify`}
                    >
                      Açılınca Haber Ver
                    </LeadFunnelTrigger>
                  </article>
                </FadeIn>
              ))}
            </div>
          </section>

          {/* Final CTA */}
          <FadeIn delay={0.1}>
            <section className="mt-14 rounded-3xl border border-line bg-anchor p-8 text-center sm:p-12">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-mint">Deneme Kulübü</p>
              <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
                Hazır mısın? İlk denemenden önce başla.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-mint/80">
                Paketler yakında açılacak. Şimdi ön başvurunu bırak, fırsatları ilk sen gör, erken kayıt avantajlarından yararlan.
              </p>
              <LeadFunnelTrigger
                source="odk_final_cta"
                eventName="landing_cta_click"
                className="mt-8 inline-flex rounded-full bg-mint px-8 py-3.5 text-sm font-semibold text-pine transition hover:bg-white hover:text-anchor"
                analyticsId="odk_final_cta"
              >
                Ön Başvuru Yap — Ücretsiz
              </LeadFunnelTrigger>
            </section>
          </FadeIn>

        </Container>
      </main>
      <MultiStepLeadForm />
      <Footer />
      <StickyContactBar />
    </>
  );
}
