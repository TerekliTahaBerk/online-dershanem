"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Clock3, PhoneCall } from "lucide-react";
import { FadeIn } from "@/components/ui/fade-in";
import { ContactLink } from "@/components/ui/contact-link";
import { contact, getPackagePaymentLink, subjectPackageGroups } from "@/lib/content";
import { PurchaseFunnelTrigger } from "@/components/ui/purchase-funnel-trigger";

type GroupKey = (typeof subjectPackageGroups)[number]["key"];
type FilterKey = "ALL" | GroupKey;

type PackageWithGroup = (typeof subjectPackageGroups)[number]["packages"][number] & {
  groupKey: GroupKey;
};

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: "ALL", label: "Tümü" },
  ...subjectPackageGroups.map((group) => ({ key: group.key, label: group.key }))
];

const allPackages: PackageWithGroup[] = subjectPackageGroups.flatMap((group) =>
  group.packages.map((pkg) => ({
    ...pkg,
    groupKey: group.key
  }))
);

function isFeaturedPackage(pkg: PackageWithGroup) {
  return pkg.badge.toLocaleUpperCase("tr-TR").includes("POPÜLER");
}

export function PackagesPageContent() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("ALL");

  const filteredPackages = useMemo(() => {
    if (activeFilter === "ALL") {
      return allPackages;
    }

    return allPackages.filter((pkg) => pkg.groupKey === activeFilter);
  }, [activeFilter]);

  return (
    <>
      <FadeIn>
        <div>
          <span className="pd-eyebrow">Paketler</span>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-ink sm:text-5xl">
            İhtiyacına göre ders seç,
            <br />
            odaklan.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
            Tek paket zorunluluğu yok. Sadece eksik olduğun derslere yatırım yap, bütçeni ve zamanını en verimli şekilde yönet.
          </p>
        </div>
      </FadeIn>

      <div className="mt-8 inline-flex flex-wrap gap-2 rounded-2xl border border-line bg-soft p-1">
        {filters.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => setActiveFilter(filter.key)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              activeFilter === filter.key ? "bg-white text-ink shadow-sm" : "text-muted hover:bg-white/70 hover:text-ink"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredPackages.map((pkg, index) => {
              const paymentLink = getPackagePaymentLink(pkg.category, pkg.subject) ?? "";
              const featured = isFeaturedPackage(pkg);

              return (
                <FadeIn key={`${pkg.groupKey}-${pkg.subject}`} delay={index * 0.04}>
                  <article
                    className={`relative flex h-full flex-col rounded-3xl border p-6 transition duration-300 hover:-translate-y-1 ${
                      featured
                        ? "border-ink bg-white shadow-[0_20px_40px_-20px_rgba(9,20,19,0.28)]"
                        : "border-line bg-white shadow-soft hover:shadow-lg"
                    }`}
                  >
                    {featured ? (
                      <span className="absolute -top-3 left-5 rounded-full bg-ink px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
                        En Popüler
                      </span>
                    ) : null}

                    {pkg.badge ? (
                      <div className="mb-3">
                        <span className="inline-flex rounded-full bg-mint px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-pine">
                          {pkg.badge}
                        </span>
                      </div>
                    ) : null}

                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{pkg.category}</p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-ink">{pkg.subject}</h2>

                    <div className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
                      <Clock3 className="h-3.5 w-3.5" />
                      {pkg.quota}
                    </div>

                    <div className="mt-5">
                      <p className="text-sm font-medium text-muted line-through">{pkg.oldPrice}</p>
                      <p className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-ink">{pkg.discountedPrice}</p>
                      <p className="mt-1 text-xs font-medium text-muted">{pkg.perLessonPrice}</p>
                    </div>

                    <ul className="mt-5 flex flex-1 flex-col gap-2.5 text-sm text-muted">
                      {pkg.features.map((feature) => (
                        <li key={feature} className="flex gap-2 leading-6">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <PurchaseFunnelTrigger
                      source={`packages_page_${pkg.groupKey}_${pkg.subject}`}
                      packageName={`${pkg.category} ${pkg.subject}`}
                      paymentLink={paymentLink}
                      className={`mt-6 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition ${
                        featured ? "bg-ink text-white hover:bg-ink/90" : "bg-anchor text-white hover:bg-pine"
                      }`}
                      analyticsId={`packages_page_${pkg.groupKey}_${pkg.subject}`}
                    >
                      {pkg.cta} <ArrowRight className="ml-2 h-4 w-4" />
                    </PurchaseFunnelTrigger>
                  </article>
                </FadeIn>
              );
            })}
          </div>
        </div>

        <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <FadeIn>
            <aside className="rounded-3xl border border-line bg-white p-6 shadow-soft">
              <p className="text-base font-semibold text-ink">Aradığını bulamadın mı?</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Danışman ekibimiz öğrencinin seviyesine göre önce hangi dersle başlanması gerektiğini netleştirir.
              </p>

              <div className="mt-5 flex flex-col gap-2">
                <ContactLink
                  href={`tel:${contact.phone}`}
                  channel="phone"
                  placement="packages_page_sidebar"
                  className="inline-flex items-center justify-center rounded-full bg-anchor px-4 py-3 text-sm font-semibold text-white transition hover:bg-pine"
                >
                  <PhoneCall className="mr-2 h-4 w-4" /> Hemen Ara
                </ContactLink>
              </div>
            </aside>
          </FadeIn>
        </div>
      </div>
    </>
  );
}
