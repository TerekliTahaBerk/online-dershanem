import { Check, CreditCard, PhoneCall, Users, Video } from "lucide-react";
import { PricingCard } from "@/components/pricing/pricing-card";
import { PricingSelector } from "@/components/pricing/pricing-selector";
import { StickyCheckoutBar } from "@/components/pricing/sticky-checkout-bar";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { FooterCta } from "@/components/marketing/footer-cta";
import { lessonPackage, includedFeatures, cardHighlights } from "@/lib/pricing-content";
import { homeFaqs } from "@/lib/site-content";

const steps = [
  { icon: CreditCard, title: "Ödeme", body: "PayTR üzerinden güvenle tamamlarsın. Satın alma için önceden hesap oluşturman gerekmez." },
  { icon: PhoneCall, title: "Biz ararız", body: "Öğrencinin seviyesini ve hedefini kısaca konuşuruz." },
  { icon: Users, title: "Gruba yerleştirme", body: "Seviyeye uygun, en fazla 4 kişilik gruba yerleştiririz." },
  { icon: Video, title: "İlk ders", body: "Google Meet üzerinden ilk canlı ders başlar." },
];

type PackagesExperienceProps = {
  title: React.ReactNode;
  subtitle: string;
  primarySource: string;
};

/**
 * Ders Paketleri deneyimi — sınav seçici, "Neler dahil?", öne çıkan gradient
 * fiyat kartı, "nasıl başlar" adımları, FAQ, footer CTA ve sticky checkout bar.
 *
 * Hem `/paketler` hem de `/matematik-ders-paketi` bu bileşeni kullanır (tek
 * kaynaktan tutarlı tasarım). FİYAT `lib/content.ts`'ten türetilir; checkout
 * akışı `PurchaseFunnelTrigger` (sepet → /sepet → PayTR) ile korunur.
 */
export function PackagesExperience({ title, subtitle, primarySource }: PackagesExperienceProps) {
  return (
    <>
      <main>
        {/* Başlık */}
        <section className="bg-[#fafafa] pt-20 sm:pt-32">
          <div className="site-container text-center">
            <p className="site-eyebrow justify-center">Ders Paketleri</p>
            <h1 className="mx-auto mt-4 max-w-5xl font-display text-[clamp(2.8rem,6.2vw,5.6rem)] leading-[.98] text-[var(--site-ink)]">
              {title}
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[16.5px] leading-7 text-[var(--site-body)]">{subtitle}</p>
          </div>
        </section>

        {/* Seçici + kart */}
        <section className="bg-[#fafafa]">
          <div className="site-container py-16 sm:py-24">
            <div className="mb-10 flex justify-center">
              <PricingSelector />
            </div>

            <div className="grid items-start gap-12 lg:grid-cols-[.9fr_1.1fr] lg:gap-24">
              <div>
                <h2 className="font-display text-[clamp(1.9rem,3vw,2.8rem)] text-[var(--site-ink)]">Neler dahil?</h2>
                <p className="mt-3 max-w-md text-[14.5px] leading-6 text-[var(--site-body)]">
                  Canlı ders, küçük grup ve ders sonrası takip tek bir aylık pakette.
                </p>
                <ul className="mt-9 grid gap-x-8 gap-y-5">
                  {includedFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-[16px] leading-7 text-[var(--site-body)] sm:text-[18px]">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--brand-orange-soft)] text-[var(--brand-orange-ink)]">
                        <Check size={12} strokeWidth={3} aria-hidden="true" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="lg:sticky lg:top-24">
                <PricingCard
                  source={primarySource}
                  data={{
                    name: lessonPackage.name,
                    category: lessonPackage.category,
                    subject: lessonPackage.subject,
                    priceLabel: lessonPackage.priceLabel,
                    oldPriceLabel: lessonPackage.oldPriceLabel,
                    discountLabel: lessonPackage.discountLabel,
                    highlights: cardHighlights,
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Nasıl başlar */}
        <section className="bg-[var(--site-bg-warm)]">
          <div className="site-container py-20 sm:py-24">
            <h2 className="text-center font-display text-[clamp(1.9rem,4vw,2.8rem)] leading-[1.1] text-[var(--site-ink)]">
              Paketler nasıl başlar?
            </h2>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={s.title} className="rounded-[24px] border border-[var(--site-line)] bg-white p-7">
                    <div className="flex items-center justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-orange-soft)] text-[var(--brand-orange-ink)]">
                        <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                      </span>
                      <span className="font-display text-[26px] text-[var(--site-line)]">0{i + 1}</span>
                    </div>
                    <h3 className="mt-5 text-[16px] font-bold text-[var(--site-ink)]">{s.title}</h3>
                    <p className="mt-2 text-[14px] leading-6 text-[var(--site-body)]">{s.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="site-container grid gap-5 pb-20 sm:pb-24 md:grid-cols-2">
            <article className="rounded-[28px] border border-[var(--site-line)] bg-[var(--brand-orange-tint)] p-8 sm:p-10">
              <h2 className="font-display text-[27px] text-[var(--site-ink)]">Kimler için uygun?</h2>
              <ul className="mt-6 space-y-3 text-[14.5px] leading-6 text-[var(--site-body)]">
                {["Kalabalık sınıfta soru soramayanlar", "Ders sonrası ne çalışacağını netleştirmek isteyenler", "LGS, TYT veya AYT matematiğinde düzen arayanlar"].map((item) => <li key={item} className="flex gap-2.5"><Check size={17} className="mt-1 shrink-0 text-[var(--brand-orange)]" aria-hidden="true" />{item}</li>)}
              </ul>
            </article>
            <article className="rounded-[28px] border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-8 sm:p-10">
              <h2 className="font-display text-[27px] text-[var(--site-ink)]">Kimler için uygun değil?</h2>
              <ul className="mt-6 space-y-3 text-[14.5px] leading-6 text-[var(--site-body)]">
                {["Yalnızca kayıtlı video arayanlar", "Birebir özel ders formatı isteyenler", "Derse ve verilen çalışmalara düzenli katılamayacak olanlar"].map((item) => <li key={item}>{item}</li>)}
              </ul>
            </article>
          </div>
        </section>

        <FaqAccordion items={homeFaqs} tone="plain" />
        <FooterCta
          title="Doğru başlangıcı birlikte yapalım."
          subtitle="Kararsızsan kısa bir ücretsiz görüşmede öğrencinin seviyesini konuşalım."
          ctaLabel="Ücretsiz görüşme"
          ctaHref="/iletisim/"
        />
      </main>

      <StickyCheckoutBar
        name={lessonPackage.name}
        category={lessonPackage.category}
        subject={lessonPackage.subject}
        priceLabel={lessonPackage.priceLabel}
        note="taahhütsüz"
      />
    </>
  );
}
