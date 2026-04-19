"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Clock3 } from "lucide-react";
import { getPackagePaymentLink, subjectPackageGroups } from "@/lib/content";
import { PurchaseFunnelTrigger } from "@/components/ui/purchase-funnel-trigger";

type GroupKey = (typeof subjectPackageGroups)[number]["key"];

export function PricingComparisonSection() {
  const [activeGroupKey, setActiveGroupKey] = useState<GroupKey>(subjectPackageGroups[0]?.key ?? "TYT-AYT");
  const activeGroup = subjectPackageGroups.find((group) => group.key === activeGroupKey) ?? subjectPackageGroups[0];

  if (!activeGroup) return null;

  return (
    <section id="paket-karsilastirma" className="pd-section" style={{ background: "var(--pd-bg-subtle)" }}>
      <blockquote className="pd-home-quote">
        <p>
          “Bu millete gideceği yolu gösterirken Dünya&apos;nın her türlü ilminden, keşfiyatından, terakkiyatından istifade edelim,
          lâkin unutmayalım ki, asıl temeli kendi içimizden çıkarmak mecburiyetindeyiz.”
        </p>
        <cite>Gazi Mustafa Kemal Atatürk</cite>
      </blockquote>

      <div className="pd-section-header">
        <div className="pd-section-head-txt">
          <span className="pd-eyebrow">Paketler</span>
          <h2>
            Tek paket zorunluluğu yok.
            <br />
            Sadece ihtiyacın olan dersi seç.
          </h2>
          <p>
            Klasik dershanelerin aksine gereksiz ders yükü yok. Bütçeni ve zamanını stratejik yönet, zayıf olduğun halkayı
            küçük grupta güçlendir.
          </p>
        </div>
        <Link href="/paketler/" className="pd-btn pd-btn-ghost">
          Tüm Paketleri Gör <ArrowRight size={14} />
        </Link>
      </div>

      <div className="pd-section-inner">
        <div className="pd-package-tabs" role="tablist" aria-label="Paket grupları">
          {subjectPackageGroups.map((group) => (
            <button
              key={group.key}
              type="button"
              onClick={() => setActiveGroupKey(group.key)}
              className={`pd-package-tab ${activeGroup.key === group.key ? "active" : ""}`}
              aria-pressed={activeGroup.key === group.key}
            >
              {group.key} Paketleri
            </button>
          ))}
        </div>

        <div className="pd-package-header">
          <div>
            <h3>{activeGroup.title}</h3>
            <p>{activeGroup.subtitle}</p>
          </div>
        </div>

        <div className="pd-package-grid">
          {activeGroup.packages.map((pkg, index) => {
            const paymentLink = getPackagePaymentLink(pkg.category, pkg.subject) ?? "";
            const isFeatured = index === 0;

            return (
              <article key={`${activeGroup.key}-${pkg.subject}`} className={`pd-package-card ${isFeatured ? "featured" : ""}`}>
                {pkg.badge ? (
                  <div className="pd-package-badge">
                    <span>{pkg.badge}</span>
                  </div>
                ) : null}

                <div className="pd-package-subject">{pkg.category}</div>
                <h4 className="pd-package-name">{pkg.subject}</h4>

                <div className="pd-package-quota">
                  <Clock3 size={12} />
                  <span>{pkg.quota}</span>
                </div>

                <div className="pd-package-price-wrap">
                  <span className="pd-package-price-new">{pkg.discountedPrice}</span>
                  <span className="pd-package-price-old">{pkg.oldPrice}</span>
                </div>
                <div className="pd-package-per">{pkg.perLessonPrice}</div>

                <ul className="pd-package-feats">
                  {pkg.features.slice(0, 4).map((feature) => (
                    <li key={feature} className="pd-package-feat">
                      <Check size={14} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <PurchaseFunnelTrigger
                  source={`subject_package_${activeGroup.key}_${pkg.subject}`}
                  packageName={`${pkg.category} ${pkg.subject}`}
                  paymentLink={paymentLink}
                  className={`pd-btn ${isFeatured ? "pd-btn-primary" : "pd-btn-accent"} pd-package-cta`}
                  analyticsId={`subject_package_${activeGroup.key}_${pkg.subject}`}
                >
                  {pkg.cta}
                </PurchaseFunnelTrigger>
              </article>
            );
          })}
        </div>

        <p className="pd-package-note">
          Özgürlük elinde: ister tek bir zayıf dersine odaklan, ister kendi özel müfredatını oluştur. Tüm yerleşimler
          öğrencinin güncel seviyesine göre yapılır.
        </p>
      </div>
    </section>
  );
}
