import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * 02 HERO + 03 FACT LINE — tek kolon, ortalanmış kurulum.
 * Maskot ve akış kartı kaldırıldı; odak tamamen mesaj ve birincil CTA'da.
 */
export function HomeHero() {
  return (
    <section className="site-container pb-14 pt-16 sm:pb-[72px] sm:pt-[88px]">
      <div className="mx-auto flex max-w-[780px] flex-col items-center text-center">
        <h1 className="font-display text-[length:var(--public-display)] leading-[1.08] tracking-[-0.03em] text-dc-ink [text-wrap:balance]">
          Canlı derste öğren. Haftanı planla. Denemeyle ölç.
        </h1>
        <p className="mt-5 max-w-[560px] text-[17px] leading-[1.65] text-dc-ink-body [text-wrap:pretty] sm:text-[18.5px]">
          LGS ve YKS için canlı ders, eğitim koçluğu ve online deneme. İhtiyacın
          olan ürünü tek başına veya birlikte kullan.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          <Link
            href="/paketler"
            className="site-btn site-btn-primary site-btn-lg"
          >
            Paketini Oluştur
            <ArrowRight size={17} strokeWidth={2.2} aria-hidden="true" />
          </Link>
          <Link
            href="/urunler"
            className="site-btn site-btn-secondary site-btn-lg"
          >
            Ürünleri Karşılaştır
          </Link>
        </div>

        {/* Doğrulanmış, somut bilgi — rakam/başarı oranı iddiası yok */}
        <dl className="mt-11 flex w-full flex-wrap items-start justify-center gap-x-12 gap-y-7 border-t border-dc-line pt-7 sm:gap-x-16">
          <div>
            <dt className="text-[16.5px] font-bold text-dc-ink">
              Maks. 4 kişilik canlı grup
            </dt>
            <dd className="mt-0.5 text-[13.5px] text-dc-ink-faint">
              ya da birebir özel ders
            </dd>
          </div>
          <div>
            <dt className="text-[16.5px] font-bold text-dc-ink">LGS ve YKS</dt>
            <dd className="mt-0.5 text-[13.5px] text-dc-ink-faint">
              denemede LGS, TYT, AYT
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
