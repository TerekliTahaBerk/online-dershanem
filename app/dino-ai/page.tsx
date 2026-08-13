import Link from "next/link";
import { ArrowRight, BrainCircuit } from "lucide-react";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { buildMarketingMetadata } from "@/lib/seo/metadata";
import { publicProducts, sharedIntelligenceLayer } from "@/lib/product-architecture";

export const metadata = buildMarketingMetadata({
  title: "Dino AI | Üç Ürünün Ortak Zekâ Katmanı",
  description:
    "Dino AI, Online Dershanem, Online Koçum ve Online Deneme Kulübüm'ü birbirine bağlaması planlanan ortak zekâ katmanıdır. Geliştirme aşamasındadır.",
  canonical: "/dino-ai",
});

/**
 * Dino AI dördüncü bir ana ürün DEĞİLDİR; üç ürünün ürettiği veriyi öğrenciye
 * anlaşılır bir sonraki adım olarak döndürmesi planlanan ortak katmandır.
 * Bu sayfa yalnız ürünün yönünü anlatır — derin ürün anlatımı P0-08'in konusu.
 *
 * ÖNEMLİ: Aşağıdaki başlıklar yayında olan özellikler değildir. Her biri
 * planlanan kullanım olarak yazılmıştır; kullanıma açılan bir yetenek ilgili
 * ürün sayfasında duyurulur.
 */
const plannedUses: Record<(typeof publicProducts)[number]["slug"], string> = {
  "online-dershanem":
    "Ders geri bildiriminin ve ödev takibinin öğrenciye anlaşılır bir çalışma yönü olarak dönmesi hedefleniyor.",
  "online-kocum":
    "Haftalık plan hazırlanırken öğrencinin kendi verisine dayalı öneriler görünmesi hedefleniyor.",
  "online-deneme-kulubum":
    "Deneme sonuçlarının güçlü ve zayıf başlıklara ayrılıp somut bir sonraki adıma bağlanması hedefleniyor.",
};

export default function DinoAiPage() {
  return (
    <div className="site-scope">
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className="bg-[var(--site-ink)] py-20 text-white sm:py-28">
          <div className="site-container">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[var(--brand-yellow)]">
              <BrainCircuit size={23} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <p className="mt-7 text-[12px] font-bold uppercase tracking-[.12em] text-[var(--brand-yellow)]">
              {sharedIntelligenceLayer.role}
            </p>
            <h1 className="mt-4 max-w-4xl text-[clamp(2.8rem,6vw,5.1rem)] font-semibold leading-[.98] tracking-[-.055em]">
              Üç ürünü birbirine bağlayan zekâ katmanı.
            </h1>
            <p className="mt-7 max-w-2xl text-[17px] leading-8 text-white/70 sm:text-[19px]">
              {sharedIntelligenceLayer.name} ayrı bir ürün değil; Online Dershanem, Online Koçum ve Online
              Deneme Kulübüm&apos;de biriken verinin öğrenciye anlaşılır bir sonraki adım olarak dönmesi için
              geliştirdiğimiz ortak katmandır.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/urunler/" className="site-btn site-btn-primary site-btn-lg">
                Ürünleri incele <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link href="/iletisim/" className="site-btn site-btn-secondary site-btn-lg">
                Gelişmelerden haberdar ol
              </Link>
            </div>
          </div>
        </section>

        <section className="site-container py-20 sm:py-24">
          <div className="max-w-3xl">
            <p className="site-kicker">Geliştirme aşamasında</p>
            <h2 className="mt-4 text-[clamp(2.3rem,5vw,3.7rem)] font-semibold tracking-[-.045em] text-[var(--site-ink)]">
              Hangi ürüne ne katması planlanıyor?
            </h2>
            <p className="mt-5 text-[16px] leading-8 text-[var(--site-body)]">
              Aşağıdaki başlıklar bugün yayında olan özellikler değil, Dino AI için planlanan kullanım
              alanlarıdır. Bir yetenek kullanıma açıldığında ilgili ürün sayfasında duyurulur.
            </p>
          </div>
          <ul className="mt-12 grid gap-5 md:grid-cols-3">
            {publicProducts.map((product) => (
              <li
                key={product.slug}
                className="flex flex-col rounded-[26px] border border-[var(--site-line)] bg-white p-7"
              >
                <span className="w-fit rounded-full border border-[var(--site-line)] px-3 py-1 text-[11px] font-bold uppercase tracking-[.1em] text-[var(--site-muted)]">
                  Planlanıyor
                </span>
                <h3 className="mt-6 text-2xl font-semibold text-[var(--site-ink)]">{product.name}</h3>
                <p className="mt-3 flex-1 text-[15px] leading-7 text-[var(--site-body)]">
                  {plannedUses[product.slug]}
                </p>
                <Link
                  href={product.href}
                  className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--brand-olive)]"
                >
                  {product.name} sayfası
                  <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
