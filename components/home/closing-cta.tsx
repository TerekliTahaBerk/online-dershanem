import Image from "next/image";
import Link from "next/link";

/**
 * 14 KAPANIŞ CTA — onaylı tasarım (Web.dc.html).
 * Açık yeşil banner (brand-soft), sağda maskot taşarak oturur.
 */
export function ClosingCta() {
  return (
    <section className="site-container pb-[var(--dc-section-tight)] pt-[var(--dc-section-tight)]">
      <div className="relative grid items-center gap-6 overflow-hidden rounded-dc-banner border border-dc-brand-soft-line bg-dc-brand-soft px-8 py-12 sm:px-14 sm:py-14 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 className="font-display text-[length:var(--public-title)] leading-[1.12] tracking-[-0.025em] text-dc-brand-deep">
            İhtiyacın olan desteği seç.
          </h2>
          <p className="mt-3.5 max-w-[520px] text-[16.5px] leading-[1.65] text-[#3F5C51]">
            Canlı ders, koçluk ve denemeyi tek tek ya da birlikte seçebilir, sana uygun
            paketi tek adımda oluşturabilirsin.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-5">
            <Link href="/paketler" className="site-btn site-btn-primary site-btn-lg">
              Paketini Oluştur →
            </Link>
            <Link
              href="/urunler"
              className="text-[15px] font-bold text-dc-brand-hover hover:text-dc-brand-deep"
            >
              Tüm Ürünleri Karşılaştır
            </Link>
          </div>
        </div>

        <div className="relative hidden h-[230px] lg:block">
          <Image
            src="/design/dino-mascot.png"
            alt=""
            aria-hidden="true"
            width={1319}
            height={1193}
            sizes="300px"
            className="absolute -bottom-14 -right-2.5 w-[300px] max-w-none drop-shadow-[0_20px_30px_rgba(12,74,56,.16)]"
          />
        </div>
      </div>
    </section>
  );
}
