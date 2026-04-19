"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
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
        <div className="pd-packages-page-header">
          <span className="pd-eyebrow">Paketler</span>
          <h1 className="pd-packages-page-title">
            İhtiyacına göre ders seç,
            <br />
            odaklan.
          </h1>
          <p className="pd-packages-page-sub">
            Tek paket zorunluluğu yok. Sadece eksik olduğun derslere yatırım yap, bütçeni ve zamanını en verimli şekilde yönet.
          </p>
        </div>
      </FadeIn>

      <div className="pd-packages-toolbar">
        <div className="pd-packages-tabs">
          {filters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(filter.key)}
              className={`pd-packages-tab ${activeFilter === filter.key ? "active" : ""}`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <span className="pd-packages-count">{filteredPackages.length} paket</span>
      </div>

      <div className="pd-packages-grid">
        {filteredPackages.map((pkg, index) => {
          const paymentLink = getPackagePaymentLink(pkg.category, pkg.subject) ?? "";
          const featured = isFeaturedPackage(pkg);

          return (
            <FadeIn key={`${pkg.groupKey}-${pkg.subject}`} delay={index * 0.04}>
              <article className={`pd-packages-card ${featured ? "featured" : ""}`}>
                {pkg.badge ? (
                  <div className="pd-packages-card-badge">
                    <span>{pkg.badge}</span>
                  </div>
                ) : null}

                <p className="pd-packages-card-subject">{pkg.category}</p>
                <h2 className="pd-packages-card-name">{pkg.subject}</h2>

                <div className="pd-packages-card-quota">
                  <Clock3 size={11} />
                  <span>{pkg.quota}</span>
                </div>

                <div className="pd-packages-card-prices">
                  <span className="pd-packages-card-price-new">{pkg.discountedPrice}</span>
                  <span className="pd-packages-card-price-old">{pkg.oldPrice}</span>
                </div>
                <div className="pd-packages-card-per">{pkg.perLessonPrice}</div>

                <ul className="pd-packages-card-feats">
                  {pkg.features.map((feature) => (
                    <li key={feature} className="pd-packages-card-feat">
                      {feature}
                    </li>
                  ))}
                </ul>

                <PurchaseFunnelTrigger
                  source={`packages_page_${pkg.groupKey}_${pkg.subject}`}
                  packageName={`${pkg.category} ${pkg.subject}`}
                  paymentLink={paymentLink}
                  className={`pd-packages-card-cta ${featured ? "featured" : ""}`}
                  analyticsId={`packages_page_${pkg.groupKey}_${pkg.subject}`}
                >
                  {pkg.cta} <ArrowRight size={14} />
                </PurchaseFunnelTrigger>
              </article>
            </FadeIn>
          );
        })}
      </div>

      <FadeIn>
        <div className="pd-packages-help">
          <h3>Aradığını bulamadın mı?</h3>
          <p>Size özel bir paket oluşturmak için ücretsiz danışmanlık talep edin.</p>
          <div className="pd-packages-help-actions">
            <Link href="/seni-arayalim/" className="pd-btn pd-btn-primary pd-btn-lg">
              Seni Arayalım
            </Link>
            <ContactLink
              href={`tel:${contact.phone}`}
              channel="phone"
              placement="packages_page_footer_support"
              className="pd-packages-help-phone"
            >
              {contact.phone}
            </ContactLink>
          </div>
        </div>
      </FadeIn>
    </>
  );
}
