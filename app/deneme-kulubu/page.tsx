import Link from "next/link";
import { ArrowRight, BarChart3, ShieldCheck, TimerReset } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { PublicOdkPackageCard } from "@/components/odk/public-package-card";
import { buildMarketingMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/jsonld";
import { listPublicOdkPackages, ODK_PUBLIC_FAQ } from "@/lib/odk/public-commerce-server";

export const dynamic = "force-dynamic";

export const metadata = buildMarketingMetadata({
  title: "Online Deneme Kulübüm | LGS, TYT ve AYT",
  description: "LGS, TYT ve AYT için planlı online denemeler, kazanım analizi ve gelişimi takip etmeye yardımcı raporlar.",
  canonical: "/urunler/online-deneme-kulubum",
  imagePath: "/deneme-kulubu/opengraph-image",
  imageAlt: "Online Deneme Kulübüm — LGS, TYT ve AYT",
});

export default async function DenemeKulubuPage() {
  const packages = await listPublicOdkPackages();
  return (
    <div className="site-scope">
      <SchemaJsonLd schema={[
        breadcrumbJsonLd([{ name: "Ana Sayfa", url: "/" }, { name: "Ürünler", url: "/urunler/" }, { name: "Online Deneme Kulübüm", url: "/urunler/online-deneme-kulubum/" }]),
        faqJsonLd([...ODK_PUBLIC_FAQ]),
      ]} />
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className="overflow-hidden bg-[var(--site-bg-warm)] py-20 sm:py-28">
          <div className="site-container grid items-center gap-12 lg:grid-cols-[1.12fr_.88fr]">
            <div>
              <span className="site-eyebrow">Online Deneme Kulübüm · LGS, TYT ve AYT</span>
              <h1 className="mt-5 max-w-3xl font-display text-[clamp(2.7rem,6vw,5.25rem)] leading-[.98] tracking-[-.055em] text-[var(--site-ink)]">
                Sadece puanı değil, bir sonraki adımı da görün.
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--site-body)]">
                LGS, TYT ve AYT için gerçek sınav saatinde online denemeye girin; sonuç, kazanım analizi ve gelişim raporlarını tek panelde takip edin. Her paketin içeriği ve erişim koşulları satın almadan önce açıkça gösterilir.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a href="#paketler" className="site-btn site-btn-primary site-btn-lg">Paketleri incele <ArrowRight size={18} /></a>
                <Link href="/iletisim" className="site-btn site-btn-secondary site-btn-lg">Sorunuzu sorun</Link>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {[
                [TimerReset, "Planlı oturum", "Deneme günü, başlangıç ve bitiş saati paket sözleşmesinde görünür."],
                [BarChart3, "Kazanım raporu", "Doğru, yanlış ve boşların ötesinde konu bazlı gelişimi izleyin."],
                [ShieldCheck, "Kontrollü erişim", "Ödeme yalnız satış ve operasyon koşulları eksiksiz olduğunda açılır."],
              ].map(([Icon, title, body]) => {
                const CardIcon = Icon as typeof TimerReset;
                return <article key={String(title)} className="rounded-[24px] border border-[var(--site-line)] bg-white p-5"><CardIcon className="text-[var(--brand-orange)]" /><h2 className="mt-4 font-display text-xl text-[var(--site-ink)]">{String(title)}</h2><p className="mt-2 text-sm leading-6 text-[var(--site-body)]">{String(body)}</p></article>;
              })}
            </div>
          </div>
        </section>

        <section id="paketler" className="site-container scroll-mt-24 py-20 sm:py-24">
          <div className="max-w-2xl"><span className="site-eyebrow">Paketler</span><h2 className="mt-4 font-display text-4xl tracking-[-.04em] text-[var(--site-ink)] sm:text-5xl">Takvimi ve hakları belli paketler</h2><p className="mt-4 leading-7 text-[var(--site-body)]">Fiyat, deneme tarihleri ve rapor erişimleri canlı ürün kataloğundan gelir.</p></div>
          {packages.length ? <div className="mt-10 grid gap-6 lg:grid-cols-2">{packages.map((item) => <PublicOdkPackageCard key={item.contract.package.id} item={item} />)}</div> : <div className="mt-10 rounded-[28px] border border-amber-200 bg-amber-50 p-8"><h3 className="font-display text-2xl text-amber-950">Yeni dönem paketleri hazırlanıyor.</h3><p className="mt-3 max-w-2xl leading-7 text-amber-900">Eksik veya satışa hazır olmayan bir paket için ödeme yolu göstermiyoruz. Duyuru almak için bizimle iletişime geçebilirsiniz.</p><Link href="/iletisim" className="site-btn site-btn-secondary mt-6">Bilgi alın</Link></div>}
        </section>

        <section className="bg-[var(--site-bg-warm)] py-20"><div className="site-container"><span className="site-eyebrow">Sık sorulanlar</span><div className="mt-7 grid gap-4 lg:grid-cols-2">{ODK_PUBLIC_FAQ.map((item) => <details key={item.q} className="rounded-[22px] border border-[var(--site-line)] bg-white p-5"><summary className="cursor-pointer font-semibold text-[var(--site-ink)]">{item.q}</summary><p className="mt-3 leading-7 text-[var(--site-body)]">{item.a}</p></details>)}</div></div></section>
      </main>
      <SiteFooter />
    </div>
  );
}
