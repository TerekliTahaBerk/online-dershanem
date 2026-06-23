"use client";

import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";
import { contact, subjectPackageGroups } from "@/lib/content";
import { PurchaseFunnelTrigger } from "@/components/ui/purchase-funnel-trigger";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";

const packages = subjectPackageGroups[0].packages;

export function PackagesPageContent() {
  return (
    <div className="mx-auto max-w-6xl px-5">
      {/* Grid */}
      <div className="mt-6 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg) => {
          const featured = "featured" in pkg && pkg.featured;
          return (
            <article
              key={pkg.id}
              className={`relative flex flex-col rounded-3xl border p-7 transition hover:-translate-y-0.5 ${
                featured
                  ? "border-[var(--od-ink)] bg-[var(--od-ink)] text-white shadow-[0_36px_80px_-36px_rgba(20,20,15,0.4)]"
                  : "border-[var(--od-line)] bg-white shadow-[0_18px_44px_-32px_rgba(20,20,15,0.16)]"
              }`}
            >
              {pkg.badge ? (
                <span
                  className={`mb-3 inline-block text-[11px] font-medium uppercase tracking-[0.18em] ${
                    featured ? "text-[var(--od-yellow)]" : "text-[var(--od-olive)]"
                  }`}
                >
                  {pkg.badge}
                </span>
              ) : null}

              <h2 className="font-display text-[26px] font-normal leading-[1.1] tracking-tight">
                {pkg.name}
              </h2>
              <p
                className={`mt-2 text-[13.5px] leading-snug ${
                  featured ? "text-white/70" : "text-[var(--od-ink-soft)]"
                }`}
              >
                {pkg.tagline}
              </p>

              <div
                className={`mt-3 text-[12.5px] ${
                  featured ? "text-white/70" : "text-[#7A7A6F]"
                }`}
              >
                {pkg.quota}
              </div>

              <div className="mt-6 flex items-baseline gap-3">
                <span className="font-display text-[34px] leading-none">
                  {pkg.discountedPrice}
                </span>
                {pkg.oldPrice ? (
                  <span
                    className={`text-[13px] line-through ${
                      featured ? "text-white/50" : "text-[#A0A095]"
                    }`}
                  >
                    {pkg.oldPrice}
                  </span>
                ) : null}
              </div>
              {pkg.perLessonPrice ? (
                <div
                  className={`mt-1 text-[12.5px] ${
                    featured ? "text-white/60" : "text-[#7A7A6F]"
                  }`}
                >
                  {pkg.perLessonPrice}
                </div>
              ) : null}

              <p
                className={`mt-5 text-[12.5px] leading-snug ${
                  featured ? "text-white/65" : "text-[#7A7A6F]"
                }`}
              >
                {pkg.audience}
              </p>

              <ul
                className={`mt-5 space-y-2 border-t border-dashed pt-5 text-[13.5px] ${
                  featured
                    ? "border-white/15 text-white/90"
                    : "border-[var(--od-line)] text-[var(--od-ink)]"
                }`}
              >
                {pkg.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                        featured ? "bg-[var(--od-yellow)]" : "bg-[var(--od-olive)]"
                      }`}
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto" />

              <PurchaseFunnelTrigger
                source={`packages_page_${pkg.id}`}
                packageName={pkg.name}
                paymentLink=""
                category={pkg.category}
                subject={pkg.subject}
                priceLabel={pkg.discountedPrice}
                analyticsId={`packages_page_${pkg.id}`}
                className={`mt-7 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[13.5px] font-medium transition ${
                  featured
                    ? "bg-[var(--od-yellow)] text-[var(--od-ink)] hover:bg-[#F0CE52]"
                    : "bg-[var(--od-ink)] text-white hover:bg-black"
                }`}
              >
                Satın Al
                <ArrowRight size={14} />
              </PurchaseFunnelTrigger>

              <AddToCartButton
                analyticsSource={`packages_page_${pkg.id}`}
                item={{
                  id: `${pkg.category}__${pkg.subject}`,
                  name: pkg.name,
                  category: pkg.category,
                  subject: pkg.subject,
                  priceCents: pkg.priceCents,
                  priceLabel: pkg.discountedPrice,
                }}
                className={`mt-3 inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[12.5px] font-medium transition data-[justadded=1]:bg-[#dcfce7] data-[justadded=1]:border-emerald-300 data-[justadded=1]:text-emerald-800 ${
                  featured
                    ? "border border-white/25 text-white hover:border-white/50"
                    : "border border-[var(--od-ink)]/12 bg-[var(--od-cream-2)] text-[var(--od-ink)] hover:bg-white hover:border-[var(--od-ink)]/30"
                }`}
              />
            </article>
          );
        })}
      </div>

      {/* Help band */}
      <div className="mt-16 overflow-hidden rounded-[28px] border border-[var(--od-line)] bg-[var(--od-yellow-soft)]">
        <div className="grid gap-6 p-8 sm:grid-cols-[1.4fr_auto] sm:items-center sm:p-12">
          <div>
            <h3 className="font-display text-[28px] font-normal leading-[1.1] tracking-tight text-[var(--od-ink)] sm:text-[34px]">
              Hangi paketin uygun olduğunu birlikte belirleyelim.
            </h3>
            <p className="mt-3 max-w-md text-[14.5px] leading-7 text-[var(--od-ink-soft)]">
              Öğrencinin matematik seviyesini ve hedefini konuşalım; deneme,
              ders veya tam destekten hangisinin doğru başlangıç olduğunu
              birlikte netleştirelim.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Link
              href="/iletisim/"
              className="inline-flex items-center justify-center rounded-full bg-[var(--od-ink)] px-6 py-3 text-[14px] font-medium text-white transition hover:bg-black"
            >
              Bizimle İletişime Geç
            </Link>
            <a
              href={`tel:${contact.phone}`}
              className="inline-flex items-center gap-2 text-[13.5px] font-medium text-[var(--od-ink)] hover:text-[var(--od-olive)]"
            >
              <Phone size={13} strokeWidth={1.8} />
              {contact.phone}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
