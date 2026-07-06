import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

type FooterCtaProps = {
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

/**
 * Büyük footer öncesi CTA bölümü — referanstaki "Hedefine bir adım daha yaklaş"
 * yapısı: geniş beyaz alan, büyük serif başlık, tek turuncu buton.
 */
export function FooterCta({
  title = "Hedefine bir adım daha yaklaş.",
  subtitle = "Bugün başla, ilk adımı at. Gerisini birlikte planlayalım.",
  ctaLabel = "Hemen başla",
  ctaHref = "/paketler/",
}: FooterCtaProps) {
  return (
    <section className="bg-white">
      <div className="site-container py-28 text-center sm:py-44">
        <h2 className="mx-auto max-w-5xl font-display text-[clamp(3rem,7vw,6.2rem)] leading-[.96] tracking-[-0.045em] text-[var(--site-ink)]">
          {title}
        </h2>
        <p className="mx-auto mt-8 max-w-2xl text-[16.5px] leading-7 text-[var(--site-body)] sm:text-[19px]">{subtitle}</p>
        <div className="mt-11">
          <Link href={ctaHref} className="site-btn site-btn-primary site-btn-lg px-10 py-5 text-[17px]">
            {ctaLabel}
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
