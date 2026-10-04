import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import Image from "next/image";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { ProductClosingCta } from "@/components/product/product-sections";
import { buildMarketingMetadata } from "@/lib/seo/metadata";
import { getDinoMarketingCopy } from "@/lib/dino-marketing";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";

export const metadata = buildMarketingMetadata({
  title: "Dino AI | Ders, plan ve deneme bağı",
  description:
    "Dino AI pilot hazırlıkları: ders, plan ve deneme desteği için öğretmen ve koçun kararını destekleyen örnekler. Ayrı satılan bir ürün değildir.",
  canonical: "/dino-ai",
});

const surfaces = [
  {
    where: "Ders sonrası ekranında",
    quote: "Ders notundaki zorlandığın konuya, sonraki çalışmanda birlikte dönebiliriz.",
    note: "Hedeflenen örnek akış: öğretmenin paylaşmayı onayladığı ders özeti temel alınır.",
  },
  {
    where: "Koçun plan ekranında",
    quote: "Planında tekrar için yer açmayı birlikte değerlendirebiliriz.",
    note: "Hedeflenen örnek akış: öneriyi koç değerlendirir; planı koç kurar.",
  },
  {
    where: "Deneme sonucunda",
    quote: "Deneme sonuçlarında yeniden çalışabileceğin konuları birlikte inceleyebiliriz.",
    note: "Örnek metindir. Gerçek çıktı öğrencinin kendi deneme verisinden üretilir.",
  },
];

/** DINO AI — onaylı tasarım (Web.dc.html → isDino). */
export default function DinoAiPage() {
  const copy = getDinoMarketingCopy(getPanelFeatureFlags().dinoAi);
  return (
    <div className="site-scope">
      <SiteHeader />
      <SchemaJsonLd schema={breadcrumbJsonLd([{ name: "Ana sayfa", url: "/" }, { name: "Dino AI", url: "/dino-ai" }])} />
      <main id="main-content" tabIndex={-1}>
        <section className="site-container pt-14 sm:pt-[72px]">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
            <div>
              <p className="text-[12px] font-semibold tracking-[0.08em] text-dc-brand-strong">
                DINO AI · {copy.status}
              </p>
              <h1 className="mt-4 font-display text-(length:--public-display) leading-[1.1] tracking-[-0.03em] text-dc-ink">
                {copy.headline}
              </h1>
              <p className="mt-4 max-w-[500px] text-[17px] leading-[1.65] text-dc-ink-body sm:text-[18px]">
                {copy.description}
              </p>

              <div className="mt-6 max-w-[520px] rounded-2xl border border-dc-line bg-white px-5 py-4">
                <p className="text-[15px] font-bold text-dc-ink">
                  Dino AI ayrı satılan bir ürün değildir.
                </p>
                <p className="mt-1.5 text-[14.5px] leading-[1.6] text-dc-ink-muted">
                  Öğretmenin ve koçun değerlendirmesini desteklemek için
                  hazırlanır; karar ve paylaşım insan onayından geçer.
                </p>
                <p className="mt-3 border-t border-dc-line-soft pt-3 text-[13.5px] leading-[1.6] text-dc-ink-muted">
                  Aşağıdaki metinler hedeflenen deneyimin örnekleridir;
                  kişisel bir değerlendirme veya kullanılabilirlik sözü değildir.
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

        <section className="mt-(--dc-section-tight) border-y border-dc-line-soft bg-white">
          <div className="site-container py-(--dc-section-tight)">
            <h2 className="font-display text-(length:--public-title) leading-[1.1] tracking-tight text-dc-ink">
              Hangi alanlar için hazırlanıyor?
            </h2>

            <div className="mt-8 grid gap-10 lg:grid-cols-3">
              {surfaces.map((s) => (
                <div key={s.where}>
                  <p className="text-[13px] font-semibold text-dc-brand-strong">
                    {s.where}
                  </p>
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
          title="Ders, plan ve deneme seçeneklerini keşfet."
          body="İhtiyacına uygun desteği seç; Dino AI için hazırlıklar ve sınırlı pilot hakkında bu sayfadan bilgi al."
        />
      </main>
      <SiteFooter />
    </div>
  );
}
