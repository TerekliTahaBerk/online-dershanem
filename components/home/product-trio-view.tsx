import { yonBrand } from "@/lib/yon-brand";
import { ProductBrandLabel } from "@/components/product/product-brand-label";
import Link from "next/link";
import Image from "next/image";
import type { PublicProduct } from "@/lib/product-architecture";
import { denemeLigiBrand } from "@/lib/deneme-ligi-brand";

/**
 * 04 ÜÇ ÜRÜN — onaylı tasarım (Web.dc.html).
 * Beyaz zemin, 3 kolon ProductCard; her kartın üstünde ürüne özgü,
 * 172px önizleme alanı vardır. Yön ve Deneme Ligi onaylı marka
 * logolarını aynı ölçüde gösterir; ders ve KPSS kendi önizlemelerini korur.
 * Mobilde dikey; hover'da kenarlık markaya döner.
 */

/**
 * Canlı ders: paylaşılan tahta + en fazla dört katılımcı.
 *
 * Burada eskiden taralı bir yer tutucu ve "canlı ders ekranı" yazısı vardı;
 * canlı sitede yarım bırakılmış maket gibi duruyordu.
 */
function LivePreview() {
  return (
    <div className="flex h-[172px] flex-col gap-2 border-b border-dc-line-soft bg-dc-surface-muted p-[18px]">
      <div className="flex flex-1 flex-col justify-center gap-2 rounded-xl border border-dc-line bg-white px-4">
        <span className="h-2 w-[58%] rounded-full bg-[#CDE2D8]" />
        <span className="h-2 w-[80%] rounded-full bg-[#DCEAE3]" />
        <span className="h-2 w-[40%] rounded-full bg-dc-brand" />
      </div>
      <div className="flex gap-2">
        <span className="h-[34px] flex-1 rounded-lg bg-[#DFEBE5]" />
        <span className="h-[34px] flex-1 rounded-lg bg-[#E9F1ED]" />
        <span className="h-[34px] flex-1 rounded-lg bg-[#E9F1ED]" />
        <span className="h-[34px] flex-1 rounded-lg bg-[#E9F1ED]" />
      </div>
    </div>
  );
}

function YonPreview() {
  // Continue the source image's edge colors so its square background has no seam.
  return <div className="flex h-[172px] items-stretch border-b border-[#CADDF8]">
    <span aria-hidden="true" className="flex-1" style={{ background: "linear-gradient(to bottom, #001d75 0%, #011d71 6.25%, #011c6f 12.5%, #001e75 18.75%, #002586 25%, #002fa0 31.25%, #0043c2 37.5%, #015de1 43.75%, #0877f4 50%, #1491fc 56.25%, #21a4fd 62.5%, #169dfd 68.75%, #0887fd 75%, #026efa 81.25%, #0055eb 87.5%, #003ed1 93.75%, #002dbb 100%)" }} />
    <Image src={yonBrand.logo} alt="" width={1254} height={1254} sizes="172px" className="h-full w-auto shrink-0 object-contain" />
    <span aria-hidden="true" className="flex-1" style={{ background: "linear-gradient(to bottom, #28c1fd 0%, #1db6fd 6.25%, #129cfd 12.5%, #0880fd 18.75%, #026cf7 25%, #015ceb 31.25%, #0052df 37.5%, #0045cd 43.75%, #003bbb 50%, #0034ac 56.25%, #002d9c 62.5%, #002892 68.75%, #002284 75%, #001e7a 81.25%, #001c73 87.5%, #011a6f 93.75%, #01176c 100%)" }} />
  </div>;
}

function LeaguePreview() {
  return (
    <div className="flex h-[172px] items-center justify-center border-b border-[#4D1887] bg-[#34066B]">
      <Image src="/deneme-ligi/logo.png" alt="" width={1254} height={1254} sizes="172px" className="h-full w-auto object-contain" style={{ maskImage: "linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent)" }} />
    </div>
  );
}

function KpssPreview() {
  return (
    <div className="h-[172px] border-b border-dc-line-soft bg-dc-surface-muted p-[18px]">
      <div className="flex h-full flex-col rounded-xl border border-dc-line bg-white p-3">
        <div className="flex items-center justify-between font-mono text-xs font-semibold text-(--dc-ink-faint)">
          <span>HAFTALIK ODAK</span>
          <span>12 HAFTA</span>
        </div>
        <div className="mt-3 flex flex-1 flex-col justify-center gap-2">
          {[
            ["Ölçme ve Değerlendirme", "72%"],
            ["Gelişim Psikolojisi", "54%"],
            ["Program Geliştirme", "38%"],
          ].map(([label, width]) => (
            <div key={label}>
              <div className="mb-1 flex justify-between text-xs font-semibold text-dc-ink-muted">
                <span>{label}</span>
              </div>
              <span className="block h-1.5 rounded-full bg-[#E4EBE7]">
                <span
                  className="block h-full rounded-full bg-dc-brand"
                  style={{ width }}
                />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const productCards = {
  "online-dershanem": {
    eyebrow: "onlinedershanem.",
    title: "Öğrenme eksiğini canlı derste kapat.",
    body: "Takıldığın konuyu öğretmenle anında çözersin. Ders sonrası neyi tekrar edeceğin netleşir.",
    tracks: ["LGS", "YKS"],
    cta: "onlinedershanem. ürününü incele",
    href: "/urunler/online-dershanem",
    Preview: LivePreview,
  },
  "online-kocum": {
    eyebrow: yonBrand.mediumName,
    title: yonBrand.cardHeadline,
    body: yonBrand.cardDescription,
    tracks: ["LGS", "YKS"],
    cta: yonBrand.inspectLabel,
    href: "/urunler/online-kocum",
    Preview: YonPreview,
  },
  "online-deneme-kulubum": {
    eyebrow: denemeLigiBrand.name,
    title: "Sadece nete değil, eksiğin nedenine bak.",
    body: "LGS, TYT ve AYT denemelerinde hangi konu ve soru tipinde puan kaybettiğini görürsün.",
    tracks: ["LGS", "TYT", "AYT"],
    cta: "Deneme Ligi’ni incele",
    href: "/urunler/online-deneme-kulubum",
    Preview: LeaguePreview,
  },
  kpss: {
    eyebrow: "KPSS",
    title: "Sınav gününe kadar planın net olsun.",
    body: "Kalan süreyi, çalışma kapasiteni ve konu ilerlemeni tek bir uygulanabilir düzende birleştirirsin.",
    tracks: ["KPSS"],
    cta: "KPSS'yi İncele",
    href: "/urunler/kpss",
    Preview: KpssPreview,
  },
} as const;

export function ProductTrioView({
  products,
  title = "Hangi ürün sana uygun?",
  lede,
}: {
  products: readonly PublicProduct[];
  title?: string;
  lede?: string;
}) {
  const resolvedLede =
    lede ??
    (products.some((product) => product.registryCode === "KPSS")
      ? "Dört ürün dört farklı ihtiyaca odaklanır: öğren, planla, ölç ve sınava hazırlan."
      : "Üç ürün üç farklı ihtiyaca odaklanır: öğren, planla, ölç.");

  return (
    <section className="border-y border-dc-line-soft bg-white">
      <div className="site-container py-(--dc-section)">
        <div className="max-w-[620px]">
          <h2 className="font-display text-(length:--public-title) leading-[1.08] tracking-tight text-dc-ink">
            {title}
          </h2>
          <p className="mt-4 text-[17px] leading-[1.65] text-dc-ink-body">
            {resolvedLede}
          </p>
        </div>

        <div
          className={`mt-11 grid gap-[22px] md:grid-cols-2 ${
            products.length > 3 ? "lg:grid-cols-4" : "lg:grid-cols-3"
          }`}
        >
          {products.map((product) => {
            const league = product.registryCode === "ODK";
            const yon = product.slug === "online-kocum";
            const { eyebrow, title, body, tracks, cta, href, Preview } = league
              ? {
                  ...productCards[product.slug],
                  eyebrow: denemeLigiBrand.name,
                  title: denemeLigiBrand.headline,
                  body: denemeLigiBrand.description,
                  cta: "Deneme Ligi’ni incele",
                  Preview: LeaguePreview,
                }
              : productCards[product.slug];
            return (
              <article
                key={product.slug}
                className={`flex flex-col overflow-hidden rounded-dc-card border bg-white transition-colors ${yon ? "border-[#CADDF8] hover:border-[#0754C9] [--color-dc-brand:#0673F5] [--color-dc-brand-strong:#0754C9] [--color-dc-brand-hover:#0644A2] [--color-dc-brand-soft:#EFF6FF] [--color-dc-brand-soft-line:#CADDF8] motion-reduce:transition-none" : league ? "border-[#E9E1F3] hover:border-[#5B2599]" : "border-dc-line hover:border-dc-brand"}`}
              >
                <Preview />
                <div className="flex flex-1 flex-col gap-3 p-6">
                  <p className={`text-[12px] font-bold tracking-[0.08em] ${league ? "text-[#5B2599]" : "text-dc-brand-strong"}`}>
                    <ProductBrandLabel href={href} fallback={eyebrow} />
                  </p>
                  <h3 className="font-display text-[25px] leading-tight tracking-[-0.02em] text-dc-ink">
                    {title}
                  </h3>
                  <p className="text-[15px] leading-[1.6] text-dc-ink-muted">
                    {body}
                  </p>
                  <div className="mt-0.5 flex flex-wrap gap-2">
                    {tracks.map((t) => (
                      <span
                        key={t}
                        className={`rounded-full px-[11px] py-[5px] text-[12px] font-semibold ${league ? "bg-[#F0E8FB] text-[#5B2599]" : "bg-dc-brand-soft text-dc-brand-hover"}`}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <Link
                    href={href}
                    className={`mt-auto inline-flex min-h-11 items-center self-start text-[14.5px] font-bold ${league ? "text-[#5B2599] hover:text-[#350775]" : "text-dc-brand-strong hover:text-dc-brand-hover"}`}
                  >
                    {cta} →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
