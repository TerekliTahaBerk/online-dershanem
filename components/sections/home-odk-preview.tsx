import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { FadeIn } from "@/components/ui/fade-in";
import { subjectPackageGroups } from "@/lib/content";
import { PurchaseFunnelTrigger } from "@/components/ui/purchase-funnel-trigger";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";

/**
 * Ana sayfa Matematik Deneme Kulübü teaser'ı.
 *
 * Ürün modeli: Deneme Kulübü, mevcut OD sepeti/checkout akışından satılır
 * (category="Matematik", subject="Deneme Kulübü"). Ayrı ODK platformu
 * (panel/odk) burada tanıtılmaz.
 */
export function HomeOdkPreview() {
  const club = subjectPackageGroups[0].packages.find(
    (p) => p.subject === "Deneme Kulübü",
  );
  if (!club) return null;

  const cartItem = {
    id: `${club.category}__${club.subject}`,
    name: club.name,
    category: club.category,
    subject: club.subject,
    priceCents: club.priceCents,
    priceLabel: club.discountedPrice,
  };

  return (
    <section className="bg-[var(--od-cream)] py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <FadeIn>
            <div>
              <h2 className="font-display text-[32px] font-normal leading-[1.08] tracking-tight text-[var(--od-ink)] sm:text-[44px]">
                Sadece deneme çözmek değil, eksiğini görmek.
              </h2>
              <p className="mt-4 max-w-xl text-[15.5px] leading-7 text-[var(--od-ink-soft)]">
                Dijital matematik denemeleri, kazanım bazlı analiz ve net gelişim
                takibiyle çocuğunuzun matematikte tam olarak hangi konuda eksik
                olduğunu görüyor; veliye anlaşılır bir gelişim özeti sunuyoruz.
              </p>

              <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                {[
                  "Dijital matematik denemeleri",
                  "Kazanım bazlı analiz",
                  "Net gelişim grafiği",
                  "Veliye gelişim özeti",
                ].map((label) => (
                  <li
                    key={label}
                    className="rounded-2xl border border-[var(--od-line)] bg-white px-4 py-3 text-[13.5px] text-[var(--od-ink)]"
                  >
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>

          <FadeIn delay={0.05}>
            <article className="relative overflow-hidden rounded-[32px] border border-[var(--od-line)] bg-white p-7 shadow-[0_30px_70px_-44px_rgba(20,20,15,0.22)] sm:p-9">
              <div className="relative">
                <h3 className="font-display text-[24px] font-normal text-[var(--od-ink)]">
                  {club.name}
                </h3>
                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="font-display text-[36px] leading-none tracking-tight text-[var(--od-ink)]">
                    {club.discountedPrice}
                  </span>
                </div>

                <ul className="mt-6 space-y-2.5 text-[13.5px] text-[var(--od-ink)]">
                  {club.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle2
                        size={15}
                        strokeWidth={2.2}
                        className="mt-0.5 shrink-0 text-[var(--od-olive)]"
                      />
                      <span className="leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-7 flex flex-col gap-2">
                  <PurchaseFunnelTrigger
                    source="home_deneme_kulubu"
                    packageName={club.name}
                    category={club.category}
                    subject={club.subject}
                    priceLabel={club.discountedPrice}
                    paymentLink=""
                    analyticsId="home_deneme_kulubu"
                    className="inline-flex items-center justify-center rounded-full bg-[var(--od-ink)] px-4 py-3 text-[14px] font-medium text-white transition hover:bg-[#2A2A22]"
                  >
                    Satın Al
                  </PurchaseFunnelTrigger>
                  <AddToCartButton
                    item={cartItem}
                    analyticsSource="home_deneme_kulubu"
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[var(--od-ink)]/15 px-4 py-2.5 text-[13px] font-medium text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/40"
                  />
                </div>
              </div>
            </article>
          </FadeIn>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/deneme-kulubu/"
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--od-ink)] px-5 py-2.5 text-[13.5px] font-medium text-white transition hover:bg-black"
          >
            Deneme Kulübü&apos;nü İncele
            <ArrowRight size={14} />
          </Link>
          <Link
            href="/paketler/"
            className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[13.5px] text-[var(--od-ink-soft)] transition hover:text-[var(--od-ink)]"
          >
            Tüm matematik paketleri →
          </Link>
        </div>
      </div>
    </section>
  );
}
