import { Check, CreditCard, PhoneCall, Users, Video } from "lucide-react";
import { PricingCard } from "@/components/pricing/pricing-card";
import { PricingSelector } from "@/components/pricing/pricing-selector";
import { StickyCheckoutBar } from "@/components/pricing/sticky-checkout-bar";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { FooterCta } from "@/components/marketing/footer-cta";
import { lessonPackage, includedFeatures, cardHighlights } from "@/lib/pricing-content";
import { homeFaqs } from "@/lib/site-content";

const steps = [
  { icon: CreditCard, title: "Ödeme", body: "PayTR üzerinden güvenle tamamlarsın. Hesap açmana gerek yok." },
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
        <section className="bg-white pt-16 sm:pt-20">
          <div className="site-container text-center">
            <p className="site-eyebrow justify-center">Ders Paketleri</p>
            <h1 className="mx-auto mt-4 max-w-3xl font-display text-[clamp(2.4rem,6vw,4rem)] leading-[1.04] tracking-[-0.03em] text-[var(--site-ink)]">
              {title}
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[16.5px] leading-7 text-[var(--site-body)]">{subtitle}</p>
          </div>
        </section>

        {/* Seçici + kart */}
        <section className="bg-white">
          <div className="site-container py-14 sm:py-16">
            <div className="mb-10 flex justify-center">
              <PricingSelector />
            </div>

            <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
              <div>
                <h2 className="font-display text-[26px] tracking-[-0.01em] text-[var(--site-ink)]">Neler dahil?</h2>
                <p className="mt-3 max-w-md text-[14.5px] leading-6 text-[var(--site-body)]">
                  Karmaşık paket seçenekleri yok. Tek bir teklif var — aylık ilerler, istediğin zaman
                  bırakabilirsin.
                </p>
                <ul className="mt-7 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  {includedFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[15px] leading-6 text-[var(--site-body)]">
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
            <h2 className="text-center font-display text-[clamp(1.9rem,4vw,2.8rem)] leading-[1.1] tracking-[-0.02em] text-[var(--site-ink)]">
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
