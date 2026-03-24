import { Check } from "lucide-react";
import { getPackagePaymentLink, subjectPackageGroups } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { PurchaseFunnelTrigger } from "@/components/ui/purchase-funnel-trigger";

export function PricingComparisonSection() {
  return (
    <section id="paket-karsilastirma" className="scroll-mt-24 py-16 sm:py-20">
      <Container>
        <blockquote className="mb-8 border-l-2 border-brand/60 pl-4 text-sm leading-relaxed text-ink sm:mb-10 sm:text-base">
          “Bu millete gideceği yolu gösterirken Dünya&apos;nın her türlü ilminden, keşfiyatından, terakkiyatından istifade edelim,
          lâkin unutmayalım ki, asıl temeli kendi içimizden çıkarmak mecburiyetindeyiz.”
          <span className="mt-3 block text-xs font-semibold tracking-[0.08em] text-muted">Gazi Mustafa Kemal Atatürk</span>
        </blockquote>

        <div className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">Kişiselleştirilmiş Öğrenme</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Zayıf Olduğun Halkayı Güçlendir, Başarıyı Garantile
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
            İyi olduğun dersler için zaman ve para harcama. Sadece eksik olduğun dersi seç, 4 kişilik özel gruplarda seviyene uygun,
            butik bir eğitim al.
          </p>
        </div>

        <div className="mt-10 space-y-10">
          {subjectPackageGroups.map((group) => (
            <section key={group.key}>
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-ink">{group.title}</h3>
                  <p className="mt-1 text-sm text-muted">{group.subtitle}</p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {group.packages.map((pkg) => (
                  <article key={`${group.key}-${pkg.subject}`} className="h-full rounded-3xl border border-line bg-white p-6 shadow-soft">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted/80">{pkg.category}</p>
                        <h4 className="mt-1 text-xl font-bold text-ink">{pkg.subject}</h4>
                      </div>
                      {pkg.badge ? (
                        <span className="inline-flex rounded-full bg-mint px-3 py-1 text-[11px] font-semibold text-pine">{pkg.badge}</span>
                      ) : null}
                    </div>

                    <div className="mt-4 rounded-2xl border border-line bg-soft p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand">{pkg.discountLabel}</p>
                      <p className="mt-1 inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                        {pkg.quota}
                      </p>
                      <p className="mt-1 text-sm font-medium text-muted line-through">{pkg.oldPrice}</p>
                      <p className="mt-1 text-2xl font-bold text-anchor">{pkg.discountedPrice}</p>
                      <p className="mt-1 text-xs font-semibold text-muted">{pkg.perLessonPrice}</p>
                    </div>

                    <ul className="mt-5 space-y-2 text-sm text-muted">
                      {pkg.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 text-brand" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <PurchaseFunnelTrigger
                      source={`subject_package_${group.key}_${pkg.subject}`}
                      packageName={`${pkg.category} ${pkg.subject}`}
                      paymentLink={getPackagePaymentLink(pkg.category, pkg.subject) ?? ""}
                      className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-anchor px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-pine"
                      analyticsId={`subject_package_${group.key}_${pkg.subject}`}
                    >
                      {pkg.cta}
                    </PurchaseFunnelTrigger>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-6 text-xs text-muted">
          Özgürlük elinde: İster tek bir zayıf konuna odaklan, ister kendi özel müfredatını oluştur. Tüm yerleşimler öğrencinin
          güncel seviyesine göre titizlikle yapılır.
        </p>
      </Container>
    </section>
  );
}
