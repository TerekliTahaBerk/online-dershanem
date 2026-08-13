import Link from "next/link";
import { ArrowRight, BookOpenCheck, CalendarCheck2, ChartNoAxesCombined } from "lucide-react";
import { publicProducts } from "@/lib/product-architecture";

const productIcons = {
  "online-dershanem": BookOpenCheck,
  "online-kocum": CalendarCheck2,
  "online-deneme-kulubum": ChartNoAxesCombined,
} as const;

const accentClasses = {
  olive: "bg-[var(--brand-olive-soft)] text-[var(--brand-olive)]",
  yellow: "bg-[var(--pd-pastel-yellow-soft)] text-[var(--pd-pastel-yellow-ink)]",
  sky: "bg-[var(--pd-pastel-sky-soft)] text-[var(--pd-pastel-sky-ink)]",
} as const;

export function ProductDiscovery() {
  return (
    <section id="urunler" className="scroll-mt-24 bg-white">
      <div className="site-container site-section">
        <div className="max-w-3xl">
          <p className="site-kicker">Üç ürün, tek öğrenme yolculuğu</p>
          <h2 className="mt-4 text-[clamp(2.5rem,6vw,4.25rem)] font-semibold leading-[1.02] tracking-[-.05em] text-[var(--site-ink)]">
            İhtiyacın olan desteği seç, gerektiğinde birlikte kullan.
          </h2>
          <p className="mt-6 max-w-2xl text-[17px] leading-8 text-[var(--site-body)]">
            Canlı ders, çalışma düzeni ve sınav ölçümü ayrı ürünlerdir. Böylece bugün gereken desteği seçebilir, ileride paketleri yapıyı değiştirmeden bir araya getirebilirsin.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {publicProducts.map((product) => {
            const Icon = productIcons[product.slug];
            return (
              <article key={product.slug} className="group flex min-h-[390px] flex-col rounded-[28px] border border-[var(--site-line)] bg-white p-6 transition-transform hover:-translate-y-1 sm:p-8">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accentClasses[product.accent]}`}>
                  <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
                </div>
                <p className="mt-8 text-[12px] font-bold uppercase tracking-[.1em] text-[var(--site-muted)]">{product.eyebrow}</p>
                <h3 className="mt-3 text-[clamp(1.8rem,3vw,2.35rem)] font-semibold tracking-[-.04em] text-[var(--site-ink)]">{product.name}</h3>
                <p className="mt-2 text-[14px] font-semibold text-[var(--brand-olive)]">{product.role}</p>
                <p className="mt-5 flex-1 text-[15px] leading-7 text-[var(--site-body)]">{product.description}</p>
                <div className="mt-7 flex items-center justify-between gap-4 border-t border-[var(--site-line)] pt-5">
                  <span className="flex flex-wrap gap-1.5">
                    {product.audiences.map((audience) => (
                      <span key={audience} className="rounded-full bg-[var(--site-bg-warm)] px-2.5 py-1 text-[11px] font-bold text-[var(--site-body)]">{audience}</span>
                    ))}
                  </span>
                  <Link href={product.href} aria-label={`${product.name} hakkında bilgi al`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--site-ink)] text-white transition-transform group-hover:translate-x-1">
                    <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
        <p className="mt-8 text-center">
          <Link href="/urunler/" className="text-[14px] font-semibold text-[var(--brand-olive)] hover:underline">Tüm ürünleri karşılaştır</Link>
        </p>
      </div>
    </section>
  );
}
