import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { hero } from "@/lib/site-content";
import { lessonPackage } from "@/lib/pricing-content";

export function Hero() {
  return (
    <section className="overflow-hidden bg-white pb-16 pt-16 sm:pb-20 sm:pt-24">
      <div className="site-container text-center">
        <p className="site-kicker">{hero.pill}</p>
        <h1 className="mx-auto mt-5 max-w-[980px] text-[clamp(2.8rem,7vw,4.75rem)] font-semibold leading-[.98] tracking-[-.055em] text-[var(--site-ink)]">
          <span className="relative whitespace-nowrap"><span className="relative z-10">Matematiği</span><span aria-hidden="true" className="absolute inset-x-0 bottom-1 z-0 h-3 bg-[var(--brand-yellow)] opacity-55 sm:h-4" /></span>{" "}
          <span className="text-[var(--brand-olive)]">verimli</span> ve <span className="text-[var(--brand-olive)]">erişilebilir</span>{" "}
          öğrenmenin yolu.
        </h1>
        <p className="mx-auto mt-7 max-w-[700px] text-[17px] leading-8 text-[var(--site-body)] sm:text-[19px]">
          En fazla <strong className="font-semibold text-[var(--site-ink)]">dört kişilik canlı ders</strong>, her ders sonrasında{" "}
          <strong className="font-semibold text-[var(--site-ink)]">net çalışma yönü</strong> ve veliye sade gelişim özeti.
        </p>
        <div className="mx-auto mt-10 w-full max-w-[620px] rounded-[24px] border border-[var(--site-line)] bg-[var(--brand-olive-tint)] px-6 py-7 sm:px-8">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[.08em] text-[var(--brand-olive)]">LGS veya YKS matematik</span>
            {lessonPackage.discountLabel ? (
              <span className="rounded-full bg-[var(--brand-yellow)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.06em] text-[var(--site-ink)]">
                {lessonPackage.discountLabel}
              </span>
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap items-baseline justify-center gap-x-4 gap-y-1">
            {lessonPackage.oldPriceLabel ? (
              <span className="text-[22px] font-medium text-[var(--site-muted)] line-through decoration-[var(--brand-olive)]/60 decoration-2">
                {lessonPackage.oldPriceLabel}
              </span>
            ) : null}
            <span className="text-[clamp(2.6rem,8vw,4rem)] font-semibold leading-none tracking-[-.05em] text-[var(--brand-olive)]">
              {lessonPackage.priceLabel}
            </span>
          </div>
          <p className="mt-4 text-[14px] font-medium text-[var(--site-body)]">
            Ayda {lessonPackage.lessonsPerMonth} × {lessonPackage.lessonDurationMinutes} dakika · {lessonPackage.commitment}
          </p>
        </div>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href={hero.primary.href} className="site-btn site-btn-primary site-btn-lg w-full sm:w-auto">
            Ders paketlerini incele <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <Link href={hero.secondary.href} className="site-btn site-btn-secondary site-btn-lg w-full sm:w-auto">
            Ücretsiz ön görüşme
          </Link>
        </div>
      </div>
    </section>
  );
}
