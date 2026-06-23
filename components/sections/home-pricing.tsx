"use client";

import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { subjectPackageGroups } from "@/lib/content";
import { PurchaseFunnelTrigger } from "@/components/ui/purchase-funnel-trigger";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";

/**
 * Matematik paketleri — üç paket, üç farklı karakter.
 *  - Deneme Kulübü: analiz/rapor odaklı
 *  - Ders Paketi:   canlı ders/öğretmen odaklı
 *  - Tam Destek:    komple çözüm, "En çok önerilen" (koyu kart)
 *
 * Sade editorial dil: kartlarda dekoratif ikon/rozet yok; öne çıkan paket
 * koyu kart + ince üst etiketle ayrışır.
 *
 * Ödeme: her kart sepete ekleme + PurchaseFunnelTrigger ile mevcut OD
 * checkout akışına bağlanır (category/subject açıkça geçilir).
 */

export function HomePricing() {
  const packages = subjectPackageGroups[0]?.packages ?? [];

  return (
    <section id="paketler-on-izleme" className="bg-[var(--od-cream-2)] py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <header className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <h2 className="font-display text-[32px] font-normal leading-[1.08] tracking-tight text-[var(--od-ink)] sm:text-[44px]">
            Matematikte ilerle, gelişimini gör.
          </h2>
          <p className="mt-4 text-[15.5px] leading-7 text-[var(--od-ink-soft)]">
            İster denemeyle eksiğini ölç, ister butik grupta canlı derse katıl,
            ister ikisini birden al. Hepsi tek odakta: matematik.
          </p>
        </header>

        <div className="mt-14 grid items-stretch gap-5 lg:grid-cols-3">
          {packages.map((pkg) => {
            const isFeatured = "featured" in pkg && pkg.featured;
            const cartItem = {
              id: `${pkg.category}__${pkg.subject}`,
              name: pkg.name,
              category: pkg.category,
              subject: pkg.subject,
              priceCents: pkg.priceCents,
              priceLabel: pkg.discountedPrice,
            };
            return (
              <article
                key={pkg.id}
                className={`relative flex flex-col rounded-[32px] border p-7 transition ${
                  isFeatured
                    ? "border-[var(--od-ink)] bg-[var(--od-ink)] text-white shadow-[0_40px_90px_-40px_rgba(20,20,15,0.45)] lg:-my-2 lg:py-9"
                    : "border-[var(--od-line)] bg-white hover:border-[var(--od-ink)]/30"
                }`}
              >
                {pkg.badge ? (
                  <span className="mb-4 inline-block text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--od-yellow)]">
                    {pkg.badge}
                  </span>
                ) : null}

                <h3 className="font-display text-[23px] font-normal leading-tight">
                  {pkg.name}
                </h3>
                <p
                  className={`mt-1.5 text-[13.5px] leading-snug ${
                    isFeatured ? "text-white/70" : "text-[var(--od-ink-soft)]"
                  }`}
                >
                  {pkg.tagline}
                </p>

                <div className="mt-5 flex items-baseline gap-2">
                  <span className="font-display text-[30px] leading-none">{pkg.discountedPrice}</span>
                  {pkg.oldPrice ? (
                    <span
                      className={`text-[13px] line-through ${
                        isFeatured ? "text-white/50" : "text-[#8B8B7E]"
                      }`}
                    >
                      {pkg.oldPrice}
                    </span>
                  ) : null}
                </div>
                <p
                  className={`mt-1 text-[12px] ${
                    isFeatured ? "text-white/55" : "text-[#8B8B7E]"
                  }`}
                >
                  {pkg.quota}
                </p>

                <ul
                  className={`mt-5 flex-1 space-y-2.5 text-[13px] ${
                    isFeatured ? "text-white/90" : "text-[var(--od-ink)]"
                  }`}
                >
                  {pkg.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check
                        size={14}
                        strokeWidth={2.2}
                        className={`mt-0.5 shrink-0 ${
                          isFeatured ? "text-[var(--od-yellow)]" : "text-[var(--od-olive)]"
                        }`}
                      />
                      <span className="leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex flex-col gap-2">
                  <PurchaseFunnelTrigger
                    source={`home_pricing_${pkg.id}`}
                    packageName={pkg.name}
                    category={pkg.category}
                    subject={pkg.subject}
                    priceLabel={pkg.discountedPrice}
                    paymentLink=""
                    analyticsId={`home_pricing_${pkg.id}`}
                    className={`inline-flex items-center justify-center rounded-full px-4 py-2.5 text-[13.5px] font-medium transition ${
                      isFeatured
                        ? "bg-[var(--od-yellow)] text-[var(--od-ink)] hover:bg-[#F0CE52]"
                        : "bg-[var(--od-ink)] text-white hover:bg-[#2A2A22]"
                    }`}
                  >
                    Satın Al
                  </PurchaseFunnelTrigger>
                  <AddToCartButton
                    item={cartItem}
                    analyticsSource={`home_pricing_${pkg.id}`}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-4 py-2.5 text-[13px] font-medium transition ${
                      isFeatured
                        ? "border-white/25 text-white hover:border-white/50"
                        : "border-[var(--od-ink)]/15 text-[var(--od-ink)] hover:border-[var(--od-ink)]/40"
                    }`}
                  />
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/paketler/"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--od-ink)]/15 bg-white px-5 py-2.5 text-[13.5px] font-medium text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/40"
          >
            Tüm paket detaylarını gör
            <ArrowRight size={14} />
          </Link>
          <Link
            href="/deneme-kulubu/"
            className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[13.5px] text-[var(--od-ink-soft)] transition hover:text-[var(--od-ink)]"
          >
            Deneme Kulübü&apos;nü tanı →
          </Link>
        </div>
      </div>
    </section>
  );
}
