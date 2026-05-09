"use client";

import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { getPackagePaymentLink, subjectPackageGroups } from "@/lib/content";
import { PurchaseFunnelTrigger } from "@/components/ui/purchase-funnel-trigger";

/**
 * Real package pricing — TYT-AYT subjects.
 * Mirrors the data shape used elsewhere on the site so prices stay consistent.
 *
 * Visual: pastel cream cards on a slightly warmer cream backdrop.
 * The first card (Matematik) is the highlighted "popular" pick.
 */
export function HomePricing() {
  const tytAyt = subjectPackageGroups.find((g) => g.key === "TYT-AYT");
  const packages = tytAyt?.packages ?? [];

  return (
    <section
      id="paketler-on-izleme"
      className="border-t border-[var(--od-line)] bg-[var(--od-cream-2)] py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-5">
        <header className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <span className="text-[12.5px] font-medium uppercase tracking-[0.18em] text-[#8B8B7E]">
            Paketler
          </span>
          <h2 className="mt-3 font-display text-[32px] font-normal leading-[1.08] tracking-tight text-[var(--od-ink)] sm:text-[44px]">
            Sadece <em className="italic text-[var(--od-olive)]">ihtiyacın</em> kadar.
          </h2>
          <p className="mt-4 text-[15.5px] leading-7 text-[var(--od-ink-soft)]">
            Toplu paket zorunluluğu yok. İstediğin dersi seç, kontenjanlar
            dolmadan yerini al.
          </p>
        </header>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {packages.map((pkg, i) => {
            const isFeatured = i === 0;
            const paymentLink = getPackagePaymentLink(pkg.category, pkg.subject) ?? "";
            return (
              <article
                key={pkg.subject}
                className={`relative flex flex-col rounded-3xl border p-6 transition ${
                  isFeatured
                    ? "border-[var(--od-ink)] bg-white shadow-[0_24px_60px_-32px_rgba(20,20,15,0.32)]"
                    : "border-[var(--od-line)] bg-white/90 hover:border-[var(--od-ink)]/30"
                }`}
              >
                {pkg.badge ? (
                  <span
                    className={`absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10.5px] font-semibold uppercase tracking-wider ${
                      isFeatured
                        ? "bg-[var(--od-ink)] text-white"
                        : "bg-[var(--od-yellow-soft)] text-[var(--od-olive)]"
                    }`}
                  >
                    {isFeatured ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--od-yellow)]" />
                    ) : null}
                    {pkg.badge}
                  </span>
                ) : null}

                <div className="text-[11.5px] font-medium uppercase tracking-wider text-[#8B8B7E]">
                  {pkg.category}
                </div>
                <h3 className="mt-1 font-display text-[24px] font-normal text-[var(--od-ink)]">
                  {pkg.subject}
                </h3>

                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-display text-[28px] leading-none text-[var(--od-ink)]">
                    {pkg.discountedPrice}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[12px] text-[#8B8B7E]">
                  <span className="line-through">{pkg.oldPrice}</span>
                  <span className="text-[var(--od-olive)]">·</span>
                  <span>{pkg.perLessonPrice}</span>
                </div>

                <div className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--od-blush)]/60 px-2.5 py-1 text-[11.5px] font-medium text-[#9C5340]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#E26B49]" />
                  {pkg.quota}
                </div>

                <ul className="mt-5 flex-1 space-y-2.5 text-[13px] text-[var(--od-ink)]">
                  {pkg.features.slice(0, 4).map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check
                        size={14}
                        strokeWidth={2.2}
                        className="mt-0.5 shrink-0 text-[var(--od-olive)]"
                      />
                      <span className="leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>

                <PurchaseFunnelTrigger
                  source={`home_pricing_${pkg.category}_${pkg.subject}`}
                  packageName={`${pkg.category} ${pkg.subject}`}
                  paymentLink={paymentLink}
                  analyticsId={`home_pricing_${pkg.category}_${pkg.subject}`}
                  className={`mt-6 inline-flex items-center justify-center rounded-full px-4 py-2.5 text-[13.5px] font-medium transition ${
                    isFeatured
                      ? "bg-[var(--od-ink)] text-white hover:bg-[#2A2A22]"
                      : "border border-[var(--od-ink)]/15 bg-white text-[var(--od-ink)] hover:border-[var(--od-ink)]/40"
                  }`}
                >
                  {pkg.cta}
                </PurchaseFunnelTrigger>
              </article>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/paketler/"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--od-ink)]/15 bg-white px-5 py-2.5 text-[13.5px] font-medium text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/40"
          >
            Tüm paketleri gör
            <ArrowRight size={14} />
          </Link>
          <Link
            href="/lgs/"
            className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[13.5px] text-[var(--od-ink-soft)] transition hover:text-[var(--od-ink)]"
          >
            LGS paketlerini gör →
          </Link>
        </div>
      </div>
    </section>
  );
}
