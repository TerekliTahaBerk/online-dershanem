"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock3, Phone } from "lucide-react";
import { contact, getPackagePaymentLink, subjectPackageGroups } from "@/lib/content";
import { PurchaseFunnelTrigger } from "@/components/ui/purchase-funnel-trigger";

type GroupKey = (typeof subjectPackageGroups)[number]["key"];
type FilterKey = "ALL" | GroupKey;

type PackageWithGroup =
  (typeof subjectPackageGroups)[number]["packages"][number] & {
    groupKey: GroupKey;
  };

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: "ALL", label: "Tümü" },
  ...subjectPackageGroups.map((group) => ({ key: group.key, label: group.key })),
];

const allPackages: PackageWithGroup[] = subjectPackageGroups.flatMap((group) =>
  group.packages.map((pkg) => ({ ...pkg, groupKey: group.key })),
);

function isFeatured(pkg: PackageWithGroup) {
  return pkg.badge.toLocaleUpperCase("tr-TR").includes("POPÜLER");
}

export function PackagesPageContent() {
  const [active, setActive] = useState<FilterKey>("ALL");

  const list = useMemo(
    () => (active === "ALL" ? allPackages : allPackages.filter((p) => p.groupKey === active)),
    [active],
  );

  return (
    <div className="mx-auto max-w-6xl px-5">
      {/* Toolbar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--od-line)] pb-3">
        <div className="flex flex-wrap items-center gap-1">
          {filters.map((f) => {
            const isActive = active === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setActive(f.key)}
                className={`relative -mb-px inline-flex items-center px-4 py-2.5 text-[13.5px] font-medium transition ${
                  isActive
                    ? "text-[var(--od-ink)]"
                    : "text-[#8B8B7E] hover:text-[var(--od-ink)]"
                }`}
              >
                {f.label}
                {isActive ? (
                  <span className="absolute inset-x-3 -bottom-[13px] h-[2px] rounded-full bg-[var(--od-ink)]" />
                ) : null}
              </button>
            );
          })}
        </div>
        <span className="text-[12px] text-[#8B8B7E]">{list.length} paket</span>
      </div>

      {/* Grid */}
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((pkg) => {
          const paymentLink = getPackagePaymentLink(pkg.category, pkg.subject) ?? "";
          const featured = isFeatured(pkg);
          return (
            <article
              key={`${pkg.groupKey}-${pkg.subject}`}
              className={`relative flex flex-col rounded-3xl border bg-white p-7 transition hover:-translate-y-0.5 ${
                featured
                  ? "border-[var(--od-ink)]/30 shadow-[0_28px_70px_-32px_rgba(20,20,15,0.28)]"
                  : "border-[var(--od-line)] shadow-[0_18px_44px_-32px_rgba(20,20,15,0.16)]"
              }`}
            >
              {pkg.badge ? (
                <span
                  className={`absolute -top-2.5 left-7 inline-flex items-center rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] ${
                    featured
                      ? "bg-[var(--od-ink)] text-[var(--od-yellow)]"
                      : "bg-[var(--od-yellow-soft)] text-[var(--od-ink)]"
                  }`}
                >
                  {pkg.badge}
                </span>
              ) : null}

              <span className="text-[11.5px] font-medium uppercase tracking-[0.16em] text-[var(--od-olive)]">
                {pkg.category}
              </span>
              <h2 className="mt-2 font-display text-[28px] font-normal leading-[1.1] tracking-tight text-[var(--od-ink)]">
                {pkg.subject}
              </h2>

              <div className="mt-3 inline-flex items-center gap-1.5 self-start rounded-full border border-[var(--od-line)] bg-[var(--od-cream-2)] px-2.5 py-1 text-[11.5px] text-[#7A7A6F]">
                <Clock3 size={11} strokeWidth={1.8} />
                <span>{pkg.quota}</span>
              </div>

              <div className="mt-6 flex items-baseline gap-3">
                <span className="font-display text-[34px] leading-none text-[var(--od-ink)]">
                  {pkg.discountedPrice}
                </span>
                <span className="text-[13px] text-[#A0A095] line-through">
                  {pkg.oldPrice}
                </span>
              </div>
              <div className="mt-1 text-[12.5px] text-[#7A7A6F]">{pkg.perLessonPrice}</div>

              <ul className="mt-6 space-y-2 border-t border-dashed border-[var(--od-line)] pt-5 text-[13.5px] text-[var(--od-ink)]">
                {pkg.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--od-olive)]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <PurchaseFunnelTrigger
                source={`packages_page_${pkg.groupKey}_${pkg.subject}`}
                packageName={`${pkg.category} ${pkg.subject}`}
                paymentLink={paymentLink}
                category={pkg.category}
                subject={pkg.subject}
                priceLabel={pkg.discountedPrice}
                analyticsId={`packages_page_${pkg.groupKey}_${pkg.subject}`}
                className={`mt-7 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[13.5px] font-medium transition ${
                  featured
                    ? "bg-[var(--od-ink)] text-white hover:bg-black"
                    : "border border-[var(--od-ink)]/15 bg-white text-[var(--od-ink)] hover:border-[var(--od-ink)]/40"
                }`}
              >
                {pkg.cta}
                <ArrowRight size={14} />
              </PurchaseFunnelTrigger>
            </article>
          );
        })}
      </div>

      {/* Help band */}
      <div className="mt-16 overflow-hidden rounded-[28px] border border-[var(--od-line)] bg-[var(--od-yellow-soft)]">
        <div className="grid gap-6 p-8 sm:grid-cols-[1.4fr_auto] sm:items-center sm:p-12">
          <div>
            <span className="text-[12px] font-medium uppercase tracking-[0.16em] text-[var(--od-olive)]">
              Aradığını bulamadın mı?
            </span>
            <h3 className="mt-3 font-display text-[28px] font-normal leading-[1.1] tracking-tight text-[var(--od-ink)] sm:text-[34px]">
              Sana özel bir paket kuralım.
            </h3>
            <p className="mt-3 max-w-md text-[14.5px] leading-7 text-[var(--od-ink-soft)]">
              Hedefin, sınıfın ve mevcut çalışma saatine göre ders kombinasyonu
              hazırlıyoruz. Detaylı bilgi için iletişime geç.
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
