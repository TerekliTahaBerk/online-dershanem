"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { getPackagePaymentLink, subjectPackageGroups } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { PurchaseFunnelTrigger } from "@/components/ui/purchase-funnel-trigger";
import { InlineLeadCaptureCard } from "@/components/sections/inline-lead-capture-card";

type GroupKey = (typeof subjectPackageGroups)[number]["key"];

export function PricingComparisonSection() {
  const [activeGroupKey, setActiveGroupKey] = useState<GroupKey>(subjectPackageGroups[0]?.key ?? "TYT-AYT");
  const activeGroup = useMemo(
    () => subjectPackageGroups.find((group) => group.key === activeGroupKey) ?? subjectPackageGroups[0],
    [activeGroupKey]
  );

  if (!activeGroup) return null;

  return (
    <section id="paket-karsilastirma" className="scroll-mt-24 py-12 sm:py-14">
      <Container>
        <blockquote className="mb-6 max-w-5xl border-l-2 border-brand/60 pl-4 text-xs leading-relaxed text-ink sm:text-sm">
          “Bu millete gideceği yolu gösterirken Dünya&apos;nın her türlü ilminden, keşfiyatından, terakkiyatından istifade edelim,
          lâkin unutmayalım ki, asıl temeli kendi içimizden çıkarmak mecburiyetindeyiz.”
          <span className="mt-3 block text-xs font-semibold tracking-[0.08em] text-muted">Gazi Mustafa Kemal Atatürk</span>
        </blockquote>

        <div className="mb-6">
          <InlineLeadCaptureCard
            id="seni-arayalim-formu"
            source="home_inline_after_quote"
            title="Formu Doldur, Seni Arayalım"
            description="Butona tıklayıp modal açmanı beklemiyoruz. Bilgilerini buraya bırak, danışmanımız kısa sürede seni arayıp en uygun ders planını birlikte çıkarsın."
          />
        </div>

        <div className="rounded-3xl border border-line bg-gradient-to-b from-white to-mint/40 p-5 shadow-soft sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="max-w-4xl">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">Kişiselleştirilmiş Öğrenme</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                Zayıf Olduğun Halkayı Güçlendir, Başarıyı Garantile
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                İyi olduğun dersler için zaman ve para harcama. Sadece eksik olduğun dersi seç, 4 kişilik özel gruplarda seviyene
                uygun, butik bir eğitim al.
              </p>
            </div>
            <Link
              href="/paketler/"
              className="inline-flex rounded-full border border-line-strong bg-white px-4 py-2 text-xs font-semibold text-ink transition hover:bg-soft"
            >
              Tüm Paketleri Gör
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {subjectPackageGroups.map((group) => (
              <button
                key={group.key}
                type="button"
                onClick={() => setActiveGroupKey(group.key)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  activeGroup.key === group.key
                    ? "bg-anchor text-white"
                    : "border border-line-strong bg-white text-ink hover:bg-soft"
                }`}
              >
                {group.key} Paketleri
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeGroup.key}
              className="mt-5"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              <h3 className="text-xl font-bold tracking-tight text-ink">{activeGroup.title}</h3>
              <p className="mt-1 text-sm text-muted">{activeGroup.subtitle}</p>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {activeGroup.packages.map((pkg) => (
                  <motion.article
                    key={`${activeGroup.key}-${pkg.subject}`}
                    className="h-full rounded-2xl border border-line bg-white p-4 transition duration-300 hover:-translate-y-1 hover:shadow-soft"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted/80">{pkg.category}</p>
                        <h4 className="mt-1 text-base font-bold text-ink">{pkg.subject}</h4>
                      </div>
                      {pkg.badge ? (
                        <span className="inline-flex rounded-full bg-mint px-2.5 py-1 text-[10px] font-semibold text-pine">{pkg.badge}</span>
                      ) : null}
                    </div>

                    <div className="mt-3 rounded-xl border border-line bg-soft p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand">{pkg.discountLabel}</p>
                      <p className="mt-1 inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                        {pkg.quota}
                      </p>
                      <p className="mt-1 text-xs font-medium text-muted line-through">{pkg.oldPrice}</p>
                      <p className="mt-1 text-xl font-bold text-anchor">{pkg.discountedPrice}</p>
                      <p className="mt-1 text-[11px] font-semibold text-muted">{pkg.perLessonPrice}</p>
                    </div>

                    <ul className="mt-3 space-y-1.5 text-xs text-muted">
                      {pkg.features.slice(0, 3).map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <PurchaseFunnelTrigger
                      source={`subject_package_${activeGroup.key}_${pkg.subject}`}
                      packageName={`${pkg.category} ${pkg.subject}`}
                      paymentLink={getPackagePaymentLink(pkg.category, pkg.subject) ?? ""}
                      className="mt-4 inline-flex w-fit items-center justify-center rounded-full bg-anchor px-4 py-2 text-xs font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-pine"
                      analyticsId={`subject_package_${activeGroup.key}_${pkg.subject}`}
                    >
                      {pkg.cta}
                    </PurchaseFunnelTrigger>
                  </motion.article>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          <p className="mt-5 text-xs text-muted">
            Özgürlük elinde: İster tek bir zayıf konuna odaklan, ister kendi özel müfredatını oluştur. Tüm yerleşimler öğrencinin
            güncel seviyesine göre titizlikle yapılır.
          </p>
        </div>
      </Container>
    </section>
  );
}
