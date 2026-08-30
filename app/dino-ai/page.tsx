import Image from "next/image";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { ProductClosingCta } from "@/components/product/product-sections";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  title: "Dino AI | Ders, plan ve deneme arasındaki bağ",
  description:
    "Dino AI ayrı satılan bir ürün değildir. Aldığın her ürünün içinde çalışır; öğretmenin ve koçun kararını destekler, yerine geçmez.",
  canonical: "/dino-ai",
});

const surfaces = [
  {
    where: "Ders sonrası ekranında",
    quote:
      "Bugün ikinci dereceden denklemlerde iki soruda takıldın. Yarın 40 dakika bu konuya ayır.",
    note: "Öğretmenin ders notundan çıkar; öğrenci ve veli aynı metni görür.",
  },
  {
    where: "Koçun plan ekranında",
    quote:
      "Son iki haftada paragrafa hiç dönmemiş. Bu haftaya iki oturum eklemeyi düşünebilirsin.",
    note: "Öneri koça gider. Planı koç kurar, gerekirse öneriyi kullanmaz.",
  },
  {
    where: "Deneme sonucunda",
    quote: "Son üç denemede yüzde problemlerinde aynı hatayı yapıyorsun.",
    note: "Örnek metindir. Gerçek çıktı öğrencinin kendi deneme verisinden üretilir.",
  },
];

/** DINO AI — onaylı tasarım (Web.dc.html → isDino). */
export default function DinoAiPage() {
  return (
    <div className="site-scope">
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className="site-container pt-14 sm:pt-[72px]">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
            <div>
              <p className="text-[12px] font-semibold tracking-[0.08em] text-dc-brand-strong">
                DINO AI · AYRI SATILAN BİR ÜRÜN DEĞİL
              </p>
              <h1 className="mt-4 font-display text-[length:var(--public-display)] leading-[1.1] tracking-[-0.03em] text-dc-ink">
                Ders, plan ve deneme arasındaki bağı Dino AI kuruyor.
              </h1>
              <p className="mt-4 max-w-[500px] text-[17px] leading-[1.65] text-dc-ink-body sm:text-[18px]">
                Derste zorlandığın konu, planda yapamadığın oturum ve denemede
                kaybettiğin puan aynı yerde birleşir. Dino AI bunları sade bir dille
                açıklar; kararı öğretmen ve koç verir.
              </p>

              <div className="mt-6 max-w-[520px] rounded-2xl border border-dc-line bg-white px-5 py-4">
                <p className="text-[15px] font-bold text-dc-ink">
                  Dino AI ayrı satılan bir ürün değildir.
                </p>
                <p className="mt-1.5 text-[14.5px] leading-[1.6] text-dc-ink-muted">
                  Aldığın her ürünün içinde çalışır; öğretmenin ve koçun kararını
                  destekler, yerine geçmez.
                </p>
                {/* DOĞRULUK (§55): Dino AI yüzeyleri hazır, üretim çıktısı henüz
                    yayında değil. Sayfa çalışıyormuş gibi anlatmaz. */}
                <p className="mt-3 border-t border-dc-line-soft pt-3 text-[13.5px] leading-[1.6] text-dc-ink-muted">
                  <span className="font-semibold text-dc-ink">Geliştirme aşamasında.</span>{" "}
                  Aşağıdaki örnekler Dino AI&apos;ın ne yapacağını anlatıyor. Kendi
                  verinden üretilen gerçek çıktılar henüz yayında değil; hazır
                  olduğunda panelinde görünecek.
                </p>
              </div>
            </div>

            <div className="relative h-[320px] sm:h-[400px]">
              <div
                aria-hidden="true"
                className="absolute inset-5 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle at 50% 50%,#E8F5EF,rgba(243,249,246,0) 70%)",
                }}
              />
              <Image
                src="/design/dino-mascot.png"
                alt=""
                aria-hidden="true"
                width={1319}
                height={1193}
                priority
                sizes="(max-width: 1023px) 70vw, 380px"
                className="absolute bottom-0 left-[10%] w-[76%] max-w-[380px] drop-shadow-[0_22px_34px_rgba(12,74,56,.18)] lg:left-[70px]"
              />
            </div>
          </div>
        </section>

        <section className="mt-[var(--dc-section-tight)] border-y border-dc-line-soft bg-white">
          <div className="site-container py-[var(--dc-section-tight)]">
            <h2 className="font-display text-[length:var(--public-title)] leading-[1.1] tracking-[-0.025em] text-dc-ink">
              Nerede karşına çıkıyor?
            </h2>

            <div className="mt-8 grid gap-10 lg:grid-cols-3">
              {surfaces.map((s) => (
                <div key={s.where}>
                  <p className="text-[13px] font-semibold text-dc-brand-strong">{s.where}</p>
                  <span className="my-3.5 block h-px bg-[#DDE4E0]" />
                  <p className="text-[19px] font-bold leading-[1.45] text-dc-ink">
                    &ldquo;{s.quote}&rdquo;
                  </p>
                  <p className="mt-2.5 text-[14.5px] leading-[1.6] text-dc-ink-muted">
                    {s.note}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <ProductClosingCta
          variant="deep"
          title="Dino AI'ı üç ürünün içinde kullan."
          body="Hangi ürünü alırsan Dino AI o akışta çalışır. Üçünü birleştirdiğinde en bütün resmi görürsün."
        />
      </main>
      <SiteFooter />
    </div>
  );
}
