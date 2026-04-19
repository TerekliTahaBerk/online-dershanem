"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getPackagePaymentLink, subjectPackageGroups } from "@/lib/content";
import { PurchaseFunnelTrigger } from "@/components/ui/purchase-funnel-trigger";

export function PricingComparisonSection() {
  const homePackages = subjectPackageGroups.flatMap((group) =>
    group.packages.map((pkg) => ({
      ...pkg,
      groupKey: group.key
    }))
  ).slice(0, 4);

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
        <div className="pd-home-pricing-grid">
          {homePackages.map((pkg, index) => {
            const paymentLink = getPackagePaymentLink(pkg.category, pkg.subject) ?? "";
            const isFeatured = index === 0;

            return (
              <article key={`${pkg.groupKey}-${pkg.subject}`} className={`pd-home-pricing-col ${isFeatured ? "featured" : ""}`}>
                {isFeatured ? <span className="pd-home-pricing-badge">En Popüler</span> : null}
                <div className="pd-home-pricing-subject">{pkg.category}</div>
                <h3 className="pd-home-pricing-title">{pkg.subject}</h3>
                <div className="pd-home-pricing-price">{pkg.discountedPrice}</div>
                <div className="pd-home-pricing-price-sub">
                  <span>{pkg.oldPrice}</span> · <span>{pkg.perLessonPrice}</span>
                </div>
                <ul className="pd-home-pricing-feats">
                  {pkg.features.slice(0, 4).map((feature) => (
                    <li key={feature} className="pd-home-pricing-feat">
                      {feature}
                    </li>
                  ))}
                </ul>
                <PurchaseFunnelTrigger
                  source={`home_subject_package_${pkg.groupKey}_${pkg.subject}`}
                  packageName={`${pkg.category} ${pkg.subject}`}
                  paymentLink={paymentLink}
                  className={`pd-btn ${isFeatured ? "pd-home-pricing-cta-featured" : "pd-btn-ghost"} pd-home-pricing-cta`}
                  analyticsId={`home_subject_package_${pkg.groupKey}_${pkg.subject}`}
                >
                  {pkg.cta}
                </PurchaseFunnelTrigger>
              </article>
            );
          })}
        </div>

        <p className="pd-home-pricing-note">
          Özgürlük elinde: ister tek bir zayıf dersine odaklan, ister kendi özel müfredatını oluştur. Tüm yerleşimler
          öğrencinin güncel seviyesine göre yapılır.
        </p>
      </div>
    </section>
  );
}
