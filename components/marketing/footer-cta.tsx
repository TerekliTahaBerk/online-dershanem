import Link from "next/link";
import { ArrowRight } from "lucide-react";

type Props = { title?: string; subtitle?: string; ctaLabel?: string; ctaHref?: string };

export function FooterCta({
  title = "Öğrencinin matematik yolunu birlikte netleştirelim.",
  subtitle = "Sınıfını, hedefini ve uygun küçük grup ihtimalini ücretsiz ön görüşmede konuşalım.",
  ctaLabel = "Ön görüşme talebi",
  ctaHref = "/iletisim/",
}: Props) {
  return (
    <section className="bg-white">
      <div className="site-container py-20 text-center sm:py-28">
        <p className="site-kicker">Ücretsiz ön görüşme</p>
        <h2 className="mx-auto mt-4 max-w-4xl text-[clamp(2.5rem,6vw,4.25rem)] font-semibold leading-[1.02] tracking-[-.05em] text-[var(--site-ink)]">{title}</h2>
        <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-8 text-[var(--site-body)]">{subtitle}</p>
        <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href={ctaHref} className="site-btn site-btn-primary site-btn-lg">{ctaLabel}<ArrowRight size={17} aria-hidden="true" /></Link>
          <Link href="/ders-paketleri/" className="text-[14px] font-semibold text-[var(--brand-olive)] hover:underline">Paketleri incele</Link>
        </div>
      </div>
    </section>
  );
}
