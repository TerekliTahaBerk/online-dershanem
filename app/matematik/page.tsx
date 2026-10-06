import { PublicAccordion } from "@/components/public/accordion";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Calculator,
  LineChart,
  Target,
} from "lucide-react";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/jsonld";
import { buildMarketingMetadata } from "@/lib/seo/metadata";
import { siteUrl } from "@/lib/content";
import { lessonPackage, lessonPackages } from "@/lib/pricing-content";

export const metadata = buildMarketingMetadata({
  title: "Matematik Rehberleri ve Canlı Ders Desteği | LGS ve YKS",
  description:
    "LGS, TYT ve AYT için en fazla 4 öğrencilik online matematik dersi; canlı soru çözümü, çalışma planı, deneme analizi ve açık paket fiyatları.",
  canonical: "/matematik",
  imageAlt: "LGS ve YKS için online matematik dersi — onlinedershanem.",
});

const mathFaqs = [
  {
    q: "Online matematik dersi kimler için uygun?",
    a: "Canlı derste soru sormaya, çözümünü göstermeye ve ders sonrasında ne çalışacağını bilmeye ihtiyaç duyan LGS ve YKS öğrencileri için uygundur. Grup yerleşimi öğrencinin seviyesi ve hedefi değerlendirilerek yapılır.",
  },
  {
    q: "Matematik dersleri kaç kişilik?",
    a: "onlinedershanem. matematik gruplarında en fazla 4 öğrenci bulunur. Amaç, öğrencinin kalabalık sınıfta kaybolmadan çözümünü gösterebilmesi ve geri bildirim alabilmesidir.",
  },
  {
    q: "LGS ve YKS matematik dersleri ayrı mı?",
    a: "Evet. LGS Matematik Ders Paketi 8. sınıf ve yeni nesil soru çalışmalarına; YKS Matematik Ders Paketi ise öğrencinin ihtiyacına göre TYT ve AYT matematiğine odaklanır.",
  },
  {
    q: "Online matematik dersi fiyatı ne kadar?",
    a: `${lessonPackages.map((pkg) => `${pkg.name}: ${pkg.priceLabel}`).join(". ")}. Paket ayda ${lessonPackage.lessonsPerMonth} canlı, ${lessonPackage.lessonDurationMinutes} dakikalık ders içerir ve taahhütsüzdür.`,
  },
];

const learningPaths = [
  {
    Icon: Calculator,
    title: "Matematikte temel eksikliği",
    text: "Eksikliği genel bir etiket olarak bırakmadan; kavram, işlem ve soru dili başlıklarında nereden başlanması gerektiğini bulun.",
    href: "/blog/matematikte-temel-eksigi-nasil-kapatilir",
    label: "Temel eksikliği rehberi",
  },
  {
    Icon: Target,
    title: "Yeni nesil soru ve problemler",
    text: "Sorudaki veriyi ayıklama, uygun modeli kurma ve çözüm adımını kontrol etme becerisini sistemli pratikle geliştirin.",
    href: "/blog/lgs-yeni-nesil-matematik-sorulari",
    label: "Yeni nesil soru rehberi",
  },
  {
    Icon: LineChart,
    title: "Deneme analizi ve çalışma yönü",
    text: "Yanlış, boş ve uzun süren soruları sınıflandırıp bir sonraki haftaya uygulanabilir matematik hedefleri çıkarın.",
    href: "/blog/matematik-deneme-analizi",
    label: "Deneme analiz şablonu",
  },
];

const resourceGroups = [
  {
    title: "LGS matematik rehberleri",
    text: "8. sınıf çalışma düzeni, yeni nesil sorular ve deneme analizini birlikte ele alın.",
    links: [
      {
        label: "LGS matematik çalışma programı",
        href: "/blog/lgs-matematik-calisma-programi",
      },
      {
        label: "LGS yeni nesil matematik soruları",
        href: "/blog/lgs-yeni-nesil-matematik-sorulari",
      },
      {
        label: "LGS matematikte zorlananlar için plan",
        href: "/blog/lgs-matematikte-zorlananlar-icin",
      },
    ],
  },
  {
    title: "TYT ve AYT matematik rehberleri",
    text: "TYT hızını, AYT konu derinliğini ve ortak deneme geri bildirimini dengeli ilerletin.",
    links: [
      {
        label: "TYT matematik çalışma programı",
        href: "/blog/tyt-matematik-calisma-programi",
      },
      {
        label: "AYT matematik çalışma programı",
        href: "/blog/ayt-matematik-calisma-programi",
      },
      {
        label: "TYT problem çözme hızı",
        href: "/blog/tyt-matematik-problem-cozme-hizi",
      },
    ],
  },
];

export default function MathematicsHubPage() {
  const pageLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Online Matematik Dersi",
    description:
      "LGS, TYT ve AYT matematik çalışma rehberleri ile canlı ders seçenekleri.",
    url: `${siteUrl}/matematik`,
    inLanguage: "tr-TR",
    about: [
      "Matematik",
      "LGS Matematik",
      "TYT Matematik",
      "AYT Matematik",
      "Online Matematik Dersi",
    ],
    publisher: {
      "@type": "Organization",
      name: "onlinedershanem.",
      url: siteUrl,
    },
  };

  return (
    <div className="site-scope">
      <SchemaJsonLd
        schema={[
          breadcrumbJsonLd([
            { name: "Ana Sayfa", url: "/" },
            { name: "Matematik", url: "/matematik/" },
          ]),
          pageLd,
          faqJsonLd(mathFaqs),
        ]}
      />
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className="border-b border-dc-line bg-dc-canvas">
          <div className="site-container grid gap-10 py-(--dc-section-tight) lg:grid-cols-[1.08fr_.92fr] lg:items-center">
            <div>
              <span className="dc-eyebrow">LGS · TYT · AYT matematik</span>
              <h1 className="mt-4 max-w-3xl font-display text-(length:--public-display) leading-[1.02] tracking-[-0.035em] text-dc-ink">
                Online matematik dersinde öğrenci{" "}
                çözümünü göstermeli, sadece
                dinlememeli.
              </h1>
              <p className="mt-6 max-w-2xl text-[17px] leading-8 text-dc-ink-body">
                Bu rehber, LGS ve YKS matematiğinde çalışma yönü arayanlar için.
                onlinedershanem. farklı derslerde canlı öğrenme sunar; burada
                matematik rehberlerini ve matematikte destek seçeneklerini bulabilirsin.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/urunler/online-dershanem"
                  className="site-btn site-btn-primary site-btn-lg"
                >
                  Canlı öğrenmeyi incele
                </Link>
                <LeadFunnelTrigger
                  source="matematik_hub_hero_consultation"
                  eventName="landing_cta_click"
                  className="site-btn site-btn-secondary site-btn-lg"
                >
                  Ücretsiz ön görüşme
                </LeadFunnelTrigger>
              </div>
              <p className="mt-5 text-[13px] font-semibold text-dc-ink-muted">
                Ayda {lessonPackage.lessonsPerMonth} × {lessonPackage.lessonDurationMinutes} dakika · {lessonPackage.quota} · {lessonPackage.priceLabel} · Taahhütsüz
              </p>
            </div>

            <aside
              className="rounded-[28px] border border-dc-line bg-white p-7 shadow-[0_38px_85px_-58px_rgba(17,19,17,.35)] sm:p-9"
              aria-label="Ders sonrası çalışma akışı"
            >
              <p className="dc-eyebrow">Dört adımda ders akışı</p>
              <ol className="mt-6 space-y-4">
                {[
                  ["01", "Canlı derste çözümü göster"],
                  ["02", "Takıldığın adımda geri bildirim al"],
                  ["03", "Ders sonrası çalışma yönünü gör"],
                  ["04", "Sonraki derste gelişimi yeniden değerlendir"],
                ].map(([number, text]) => (
                  <li
                    key={number}
                    className="flex items-center gap-4 rounded-2xl border border-dc-line bg-dc-canvas p-4"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--brand-olive) text-xs font-bold text-white">
                      {number}
                    </span>
                    <span className="text-[14.5px] font-semibold leading-6 text-dc-ink">
                      {text}
                    </span>
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        </section>

        <section className="site-container py-(--dc-section)">
          <div className="max-w-3xl">
            <span className="dc-eyebrow">Matematikte ilk adım</span>
            <h2 className="mt-4 font-display text-(length:--public-title) leading-tight tracking-tight text-dc-ink">
              Daha çok soru değil, eksiğe göre çalışma.
            </h2>
            <p className="mt-5 text-[16px] leading-8 text-dc-ink-body">
              Matematikte ilerleme tek bir yönteme bağlı değildir. Öğrencinin
              temel bilgisi, soru dili, işlem alışkanlığı ve süre kullanımı ayrı
              ayrı görülmeli; haftalık plan bu ihtiyaca göre sadeleşmelidir.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {learningPaths.map(({ Icon, title, text, href, label }) => (
              <article
                key={title}
                className="flex flex-col rounded-dc-card border border-dc-line bg-white p-6 sm:p-7"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-dc-brand-soft text-dc-brand-strong">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-display text-[22px] leading-tight text-dc-ink">
                  {title}
                </h3>
                <p className="mt-3 flex-1 text-[14.5px] leading-7 text-dc-ink-body">
                  {text}
                </p>
                <Link
                  href={href}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-dc-brand-strong hover:underline"
                >
                  {label}
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-dc-line bg-dc-canvas">
          <div className="site-container py-(--dc-section)">
            <div className="grid gap-5 md:grid-cols-2">
              <Link
                href="/lgs"
                className="group rounded-[26px] border border-dc-line bg-white p-7 transition-colors hover:border-(--brand-olive) sm:p-9"
              >
                <p className="dc-eyebrow">8. sınıf</p>
                <h2 className="mt-4 font-display text-[clamp(1.8rem,3.5vw,2.6rem)] leading-tight text-dc-ink">
                  LGS matematik dersi
                </h2>
                <p className="mt-4 max-w-lg text-[15px] leading-7 text-dc-ink-body">
                  Yeni nesil soru, temel eksik ve deneme geri bildirimini
                  öğrencinin seviyesine göre ele alın.
                </p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-dc-brand-strong">
                  LGS matematiği incele{" "}
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </span>
              </Link>
              <Link
                href="/yks"
                className="group rounded-[26px] border border-dc-line bg-white p-7 transition-colors hover:border-(--brand-olive) sm:p-9"
              >
                <p className="dc-eyebrow">TYT ve AYT</p>
                <h2 className="mt-4 font-display text-[clamp(1.8rem,3.5vw,2.6rem)] leading-tight text-dc-ink">
                  YKS matematik dersi
                </h2>
                <p className="mt-4 max-w-lg text-[15px] leading-7 text-dc-ink-body">
                  TYT hızını, AYT konu derinliğini ve deneme analizini
                  öğrencinin hedefine göre dengeleyin.
                </p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-dc-brand-strong">
                  YKS matematiği incele{" "}
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </div>
          </div>
        </section>

        <section className="site-container py-(--dc-section)">
          <div className="flex items-center gap-3">
            <BookOpen
              className="text-dc-brand-strong"
              aria-hidden="true"
            />
            <span className="dc-eyebrow">Matematik rehberleri</span>
          </div>
          <h2 className="mt-4 max-w-3xl font-display text-(length:--public-title) leading-tight tracking-tight text-dc-ink">
            Öğrencinin ihtiyacına göre okumaya başlayın.
          </h2>
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {resourceGroups.map((group) => (
              <article
                key={group.title}
                className="rounded-dc-card border border-dc-line bg-white p-6 sm:p-8"
              >
                <h3 className="font-display text-[24px] text-dc-ink">
                  {group.title}
                </h3>
                <p className="mt-3 text-[14.5px] leading-7 text-dc-ink-body">
                  {group.text}
                </p>
                <ul className="mt-6 divide-y divide-(--site-line) border-y border-dc-line">
                  {group.links.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="group flex min-h-14 items-center justify-between gap-4 py-3 text-[14.5px] font-semibold text-dc-ink hover:text-dc-brand-strong"
                      >
                        {item.label}
                        <ArrowRight
                          size={16}
                          className="shrink-0 transition-transform group-hover:translate-x-1"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-dc-line bg-dc-canvas">
          <div className="site-container py-(--dc-section-tight)">
            <div className="max-w-3xl">
              <span className="dc-eyebrow">Ders modeli seçimi</span>
              <h2 className="mt-4 font-display text-(length:--public-title) leading-tight text-dc-ink">
                Online dershane mi, matematik özel ders mi?
              </h2>
              <p className="mt-4 text-[16px] leading-8 text-dc-ink-body">
                Kararı yalnız ders adına göre değil; grup büyüklüğü, canlı
                etkileşim, ders sonrası yönlendirme ve aile bütçesine göre
                verin.
              </p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Link
                href="/urunler/online-dershanem"
                className="group flex items-center justify-between gap-4 rounded-[20px] border border-dc-line bg-white p-5 text-[15px] font-semibold text-dc-ink hover:border-(--brand-olive)"
              >
                Online dershane modelini incele{" "}
                <ArrowRight
                  size={17}
                  className="shrink-0 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="/online-ozel-ders"
                className="group flex items-center justify-between gap-4 rounded-[20px] border border-dc-line bg-white p-5 text-[15px] font-semibold text-dc-ink hover:border-(--brand-olive)"
              >
                Online matematik özel dersi karşılaştır{" "}
                <ArrowRight
                  size={17}
                  className="shrink-0 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </div>
        </section>

        <section className="site-container py-(--dc-section)">
          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <span className="dc-eyebrow">Sık sorulanlar</span>
              <h2 className="mt-4 font-display text-(length:--public-title) leading-tight text-dc-ink">
                Online matematik dersi hakkında.
              </h2>
            </div>
            <PublicAccordion items={mathFaqs.map((item) => ({ title: item.q, content: item.a }))} />
          </div>
        </section>

        <section className="site-container pb-20 sm:pb-28">
          <div className="rounded-[28px] border border-dc-line bg-(--brand-olive) p-8 text-white sm:p-12">
            <div className="grid gap-7 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <h2 className="font-display text-(length:--public-title) leading-tight">
                  Öğrenciniz nereden başlamalı, konuşalım.
                </h2>
                <p className="mt-3 max-w-xl text-[15px] leading-7 text-white">
                  Öğrencinin sınıfını, hedefini ve zorlandığı noktayı konuşup
                  uygun LGS veya YKS grubunu değerlendirelim.
                </p>
              </div>
              <LeadFunnelTrigger
                source="matematik_hub_final_cta"
                eventName="landing_cta_click"
                className="site-btn bg-white text-dc-brand-strong hover:bg-dc-canvas"
              >
                Ücretsiz görüşme
              </LeadFunnelTrigger>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
