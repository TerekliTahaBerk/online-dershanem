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
      <div className="site-container py-24 text-center sm:py-32">
        <h2 className="mx-auto max-w-3xl font-display text-[clamp(2.4rem,6vw,4.5rem)] leading-[1.03] tracking-[-0.03em] text-[var(--site-ink)]">
          {title}
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-[16.5px] leading-7 text-[var(--site-body)]">{subtitle}</p>
        <div className="mt-9">
          <Link href={ctaHref} className="site-btn site-btn-primary site-btn-lg">
            {ctaLabel}
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
