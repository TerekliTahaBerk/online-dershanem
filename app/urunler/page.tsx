import Link from "next/link";
import { ArrowRight, BookOpenCheck, CalendarCheck2, ChartNoAxesCombined, Check } from "lucide-react";
import { ProductDiscovery } from "@/components/marketing/product-discovery";
import { DinoAiLayer } from "@/components/marketing/dino-ai-layer";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  title: "Ürünler | Online Dershanem, Online Koçum ve Deneme Kulübüm",
  description: "LGS ve YKS için canlı ders, çalışma planı ve online deneme ürünlerini rollerine ve sınav düzeylerine göre karşılaştırın.",
  canonical: "/urunler",
});

const journey = [
  { icon: BookOpenCheck, title: "Öğren", product: "Online Dershanem", body: "Canlı derste sor, çözümünü göster ve öğretmen geri bildirimi al." },
  { icon: CalendarCheck2, title: "Düzen kur", product: "Online Koçum", body: "Hedefini haftalık plana çevir, ilerlemeni fark et ve gerektiğinde destek iste." },
  { icon: ChartNoAxesCombined, title: "Ölç", product: "Online Deneme Kulübüm", body: "Planlı denemelerle mevcut durumu gör, analizi sonraki çalışma kararına dönüştür." },
] as const;

export default function ProductsPage() {
  return (
    <div className="site-scope">
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className="bg-[var(--site-bg-warm)] py-20 sm:py-28">
          <div className="site-container text-center">
            <p className="site-kicker">Ürünler</p>
            <h1 className="mx-auto mt-5 max-w-5xl text-[clamp(2.8rem,7vw,5.25rem)] font-semibold leading-[.98] tracking-[-.055em] text-[var(--site-ink)]">Tek bir eğitim paketi değil, açık bir ürün ailesi.</h1>
            <p className="mx-auto mt-7 max-w-3xl text-[17px] leading-8 text-[var(--site-body)] sm:text-[19px]">Her ürün öğrencinin yolculuğunda farklı bir işi üstlenir. İhtiyaç duyduğun ürünle başla; ders, planlama ve ölçme desteğini gerektiğinde birlikte kullan.</p>
          </div>
        </section>

        <ProductDiscovery />

        <section className="bg-[var(--brand-olive-soft)] py-20 sm:py-24">
          <div className="site-container">
            <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr] lg:gap-20">
              <div>
                <p className="site-kicker">Birlikte nasıl çalışırlar?</p>
                <h2 className="mt-4 text-[clamp(2.3rem,5vw,3.7rem)] font-semibold leading-[1.02] tracking-[-.045em] text-[var(--site-ink)]">Öğren, düzen kur, ölç ve yeniden karar ver.</h2>
                <p className="mt-6 text-[16px] leading-8 text-[var(--site-body)]">Bu sıra zorunlu bir paket değildir. Öğrenci yalnız ihtiyaç duyduğu noktadan başlayabilir.</p>
              </div>
              <ol className="space-y-4">
                {journey.map(({ icon: Icon, title, product, body }, index) => (
                  <li key={product} className="grid gap-4 rounded-[24px] border border-[var(--site-line)] bg-white p-6 sm:grid-cols-[48px_1fr_auto] sm:items-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--site-bg-warm)] text-[var(--brand-olive)]"><Icon size={20} aria-hidden="true" /></span>
                    <span><span className="block text-[12px] font-bold uppercase tracking-[.08em] text-[var(--site-muted)]">{String(index + 1).padStart(2, "0")} · {title}</span><strong className="mt-1 block text-lg text-[var(--site-ink)]">{product}</strong><span className="mt-1 block text-[14px] leading-6 text-[var(--site-body)]">{body}</span></span>
                    <Check className="hidden text-[var(--brand-olive)] sm:block" aria-hidden="true" />
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <DinoAiLayer />

        <section className="site-container py-20 text-center sm:py-24">
          <h2 className="text-[clamp(2.3rem,5vw,3.7rem)] font-semibold tracking-[-.045em] text-[var(--site-ink)]">Nereden başlayacağından emin değil misin?</h2>
          <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-8 text-[var(--site-body)]">Öğrencinin sınıfını, sınav hedefini ve bugün en çok zorlandığı alanı konuşalım.</p>
          <Link href="/iletisim/" className="site-btn site-btn-primary site-btn-lg mt-8">Ücretsiz görüşme <ArrowRight size={17} aria-hidden="true" /></Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
