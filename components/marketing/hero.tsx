import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { hero } from "@/lib/site-content";
import { lessonPackage } from "@/lib/pricing-content";
import { HeroLessonMockup } from "@/components/marketing/mockups";

export function Hero() {
  return (
    <section className="overflow-hidden bg-white pb-16 pt-16 sm:pb-20 sm:pt-24">
      <div className="site-container text-center">
        <p className="site-kicker">{hero.pill}</p>
        <h1 className="mx-auto mt-5 max-w-[980px] text-[clamp(2.8rem,7vw,4.75rem)] font-semibold leading-[.98] tracking-[-.055em] text-[var(--site-ink)]">
          Matematiği verimli ve erişilebilir <span className="relative whitespace-nowrap"><span className="relative z-10">öğrenmenin yolu.</span><span aria-hidden="true" className="absolute inset-x-0 bottom-1 -z-0 h-3 bg-[var(--brand-yellow)]/55 sm:h-4" /></span>
        </h1>
        <p className="mx-auto mt-7 max-w-[700px] text-[17px] leading-8 text-[var(--site-body)] sm:text-[19px]">
          En fazla dört kişilik canlı ders, her ders sonrasında net çalışma yönü ve veliye sade gelişim özeti.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href={hero.primary.href} className="site-btn site-btn-primary site-btn-lg w-full sm:w-auto">
            Ders paketlerini incele <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <Link href={hero.secondary.href} className="site-btn site-btn-secondary site-btn-lg w-full sm:w-auto">
            Ücretsiz ön görüşme
          </Link>
        </div>
        <div className="mx-auto mt-7 flex w-full max-w-[560px] flex-col items-center justify-between gap-3 rounded-[20px] border border-[var(--site-line)] bg-[var(--brand-olive-tint)] px-5 py-4 text-left sm:flex-row sm:px-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.08em] text-[var(--brand-olive)]">LGS veya YKS matematik</p>
            <p className="mt-1 text-[13px] font-medium text-[var(--site-body)]">Ayda {lessonPackage.lessonsPerMonth} × {lessonPackage.lessonDurationMinutes} dakika · Taahhüt yok</p>
          </div>
          <div className="shrink-0 text-center sm:text-right">
            {lessonPackage.oldPriceLabel ? <p className="text-[12px] text-[var(--site-muted)] line-through">{lessonPackage.oldPriceLabel}</p> : null}
            <p className="mt-0.5 text-[26px] font-semibold leading-none tracking-[-.04em] text-[var(--site-ink)]">{lessonPackage.priceLabel}</p>
          </div>
        </div>
        <div className="relative mt-12 sm:mt-16">
          <HeroLessonMockup />
        </div>
      </div>
    </section>
  );
}
