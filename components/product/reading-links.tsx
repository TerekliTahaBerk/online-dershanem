import Link from "next/link";
import { productReading } from "@/lib/seo/editorial-links";
import type { MarketingProduct } from "@/lib/marketing-application";

/** Server-rendered crawlable links to existing educational articles. */
export function ProductReadingLinks({ product }: { product: MarketingProduct }) {
  return <section className="site-container py-(--dc-section-tight)" aria-labelledby="reading-links-title">
    <h2 id="reading-links-title" className="font-display text-(length:--public-title) leading-tight tracking-tight text-dc-ink">Hazırlığına yön veren rehberler</h2>
    <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-dc-ink-body">Karar vermeden önce çalışma yöntemlerini, ders seçeneklerini ve deneme sonuçlarını değerlendirmeye zaman ayır.</p>
    <ul className="mt-6 grid gap-4 md:grid-cols-3">{productReading(product).map(article => <li key={article.href}><Link href={article.href} className="flex h-full min-h-16 items-center justify-between gap-3 rounded-dc-card border border-dc-line bg-white p-5 text-[16px] font-bold leading-relaxed text-dc-ink hover:border-dc-brand"><span>{article.title}</span><span aria-hidden="true">→</span></Link></li>)}</ul>
  </section>;
}
