import Link from "next/link";
import { Check, CreditCard, PhoneCall, Users, Video } from "lucide-react";
import { PricingCard } from "@/components/pricing/pricing-card";
import { StickyCheckoutBar } from "@/components/pricing/sticky-checkout-bar";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { FooterCta } from "@/components/marketing/footer-cta";
import {
  lessonPackages,
  lessonPackagesByExam,
  includedFeatures,
} from "@/lib/pricing-content";
import { homeFaqs } from "@/lib/site-content";

/** Katalogdaki sınav hatları — kart listesi bu sırayla bölünür. */
const examTracks = ["LGS", "YKS"] as const;

const steps = [
  {
    icon: CreditCard,
    title: "Paketi seç",
    body: "Sınavını ve branşını seç, ödemeyi PayTR üzerinden güvenle tamamla.",
  },
  {
    icon: PhoneCall,
    title: "Seni ararız",
    body: "Öğrencinin seviyesini, sınıfını ve sınav hedefini konuşuruz.",
  },
  {
    icon: Users,
    title: "Grup planlanır",
    body: "Seviyeye uygun, en fazla 4 kişilik küçük gruba yerleştiririz.",
  },
  {
    icon: Video,
    title: "Ders başlar",
    body: "Google Meet üzerinden canlı ders ve ders sonrası yönlendirme başlar.",
  },
];

type PackagesExperienceProps = {
  title: React.ReactNode;
  subtitle: string;
  primarySource: string;
};

/**
 * Ders Paketleri deneyimi — "Neler dahil?", sınav hattına göre branş fiyat
 * kartları, "nasıl başlar" adımları, FAQ, footer CTA ve sticky checkout bar.
 *
 * Canonical `/ders-paketleri` deneyimi. FİYAT `lib/content.ts`'ten türetilir;
 * checkout akışı `PurchaseFunnelTrigger` (sepet → /sepet → PayTR) ile korunur.
 */
export function PackagesExperience({
  title,
  subtitle,
  primarySource,
}: PackagesExperienceProps) {
  return (
    <>
      <main id="main-content" tabIndex={-1}>
        {/* Başlık */}
        <section className="bg-white pt-14 sm:pt-20">
          <div className="site-container text-center">
            <p className="site-eyebrow justify-center">Online Dershanem</p>
            <h1 className="mx-auto mt-4 max-w-5xl font-display text-[clamp(2.65rem,5.5vw,5rem)] leading-[.98] text-[var(--site-ink)]">
              {title}
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[16.5px] leading-7 text-[var(--site-body)]">
              {subtitle}
            </p>
          </div>
        </section>

        {/* Neler dahil? */}
        <section className="bg-white">
          <div className="site-container pb-12 pt-9 sm:pt-12">
            <div className="grid items-start gap-10 lg:grid-cols-[.85fr_1.15fr] lg:gap-14">
              <div>
                <h2 className="font-display text-[clamp(1.9rem,3vw,2.8rem)] text-[var(--site-ink)]">
                  Neler dahil?
                </h2>
                <p className="mt-3 max-w-md text-[14.5px] leading-6 text-[var(--site-body)]">
                  LGS ve YKS paketlerinin hepsinde aynı küçük grup ders
                  standardı vardır.
                </p>
                <p className="mt-3 max-w-md text-[14.5px] leading-6 text-[var(--site-body)]">
                  Ders fiyatı <strong>branşa göre değişmez</strong>: aşağıdaki
                  paketlerin hepsi aynı aylık fiyattan satılır. Birden fazla
                  ders ya da birebir özel ders istiyorsan{" "}
                  <Link
                    href="/paketler"
                    className="font-semibold text-[var(--dc-brand-strong)] underline-offset-2 hover:underline"
                  >
                    paket kurucudan
                  </Link>{" "}
                  seçebilirsin.
                </p>
              </div>

              <ul className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                {includedFeatures.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-3 text-[15.5px] leading-7 text-[var(--site-body)]"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--brand-orange-soft)] text-[var(--brand-orange-ink)]">
                      <Check size={12} strokeWidth={3} aria-hidden="true" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Branş paketleri — sınav hattına göre */}
        <section id="paketler" className="scroll-mt-24 bg-white">
          <div className="site-container pb-16 sm:pb-24">
            {examTracks.map((exam) => {
              const packages = lessonPackagesByExam(exam);
              if (packages.length === 0) return null;
              return (
                <div key={exam} className="mt-14 first:mt-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-[var(--site-line)] pb-4">
                    <h2 className="font-display text-[clamp(1.7rem,2.6vw,2.4rem)] text-[var(--site-ink)]">
                      {exam} ders paketleri
                    </h2>
                    <p className="text-[14px] text-[var(--site-muted)]">
                      {packages.length} branş · hepsi {packages[0].priceLabel}
                    </p>
                  </div>
                  <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {packages.map((pkg) => (
                      <PricingCard
                        key={`${pkg.category}-${pkg.subject}`}
                        source={`${primarySource}_${pkg.category.toLowerCase()}`}
                        data={{
                          name: pkg.name,
                          category: pkg.category,
                          subject: pkg.subject,
                          tagline: pkg.tagline,
                          priceLabel: pkg.priceLabel,
                          oldPriceLabel: pkg.oldPriceLabel,
                          discountLabel: pkg.discountLabel,
                          highlightsTitle: `${pkg.category} odağı`,
                          highlights: pkg.examFocus,
                          ctaLabel: "Satın al",
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Nasıl başlar */}
        <section className="bg-[var(--site-bg-warm)]">
          <div className="site-container py-20 sm:py-24">
            <h2 className="text-center font-display text-[clamp(1.9rem,4vw,2.8rem)] leading-[1.1] text-[var(--site-ink)]">
              Paket süreci nasıl başlar?
            </h2>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.title}
                    className="rounded-[24px] border border-[var(--site-line)] bg-white p-7"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-orange-soft)] text-[var(--brand-orange-ink)]">
                        <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                      </span>
                      <span className="font-display text-[26px] text-[var(--site-muted)]">
                        0{i + 1}
                      </span>
                    </div>
                    <h3 className="mt-5 text-[16px] font-bold text-[var(--site-ink)]">
                      {s.title}
                    </h3>
                    <p className="mt-2 text-[14px] leading-6 text-[var(--site-body)]">
                      {s.body}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="site-container grid gap-5 pb-20 sm:pb-24 md:grid-cols-2">
            <article className="rounded-[28px] border border-[var(--site-line)] bg-[var(--brand-orange-tint)] p-8 sm:p-10">
              <h2 className="font-display text-[27px] text-[var(--site-ink)]">
                Kimler için uygun?
              </h2>
              <ul className="mt-6 space-y-3 text-[14.5px] leading-6 text-[var(--site-body)]">
                {[
                  "Kalabalık sınıfta soru soramayanlar",
                  "Ders sonrası ne çalışacağını bilmek isteyenler",
                  "LGS veya YKS hazırlığında düzen arayanlar",
                ].map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <Check
                      size={17}
                      className="mt-1 shrink-0 text-[var(--brand-orange)]"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
            <article className="rounded-[28px] border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-8 sm:p-10">
              <h2 className="font-display text-[27px] text-[var(--site-ink)]">
                Kimler için uygun değil?
              </h2>
              <ul className="mt-6 space-y-3 text-[14.5px] leading-6 text-[var(--site-body)]">
                {[
                  "Yalnızca kayıtlı video arayanlar",
                  "Birebir özel ders formatı isteyenler",
                  "Derse ve verilen çalışmalara düzenli katılamayacak olanlar",
                ].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <FaqAccordion items={homeFaqs} tone="plain" />
        <FooterCta
          title="Hangi paket uygun, birlikte karar verelim."
          subtitle="Kararsızsan ücretsiz ön görüşmede öğrencinin seviyesini ve sınav hedefini konuşalım."
          ctaLabel="Ücretsiz görüşme"
          ctaHref="/iletisim"
        />
      </main>

      {/*
        Katalogda her branş ayrı paket olduğu için sticky bar her paketi
        buton yapamaz; tek CTA ile kart listesine götürür.
      */}
      <StickyCheckoutBar
        title="LGS ve YKS branş paketleri"
        priceLabel={lessonPackages[0]?.priceLabel}
        ctaHref="#paketler"
        ctaLabel="Paketleri gör"
        note="taahhütsüz"
      />
    </>
  );
}
