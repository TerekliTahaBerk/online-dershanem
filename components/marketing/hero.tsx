import Link from "next/link";
import { ArrowRight, CalendarCheck, FileText, LineChart, Sparkles, Video } from "lucide-react";
import { hero } from "@/lib/site-content";
import { HeroLessonMockup } from "@/components/marketing/mockups";

const floatingCards = [
  { icon: CalendarCheck, title: hero.floatingCards[0].title, sub: hero.floatingCards[0].sub, className: "left-[7%] top-[62%]" },
  { icon: LineChart, title: hero.floatingCards[1].title, sub: hero.floatingCards[1].sub, className: "right-[7%] top-[64%]" },
  { icon: FileText, title: hero.floatingCards[2].title, sub: hero.floatingCards[2].sub, className: "left-[18%] bottom-[8%]" },
];

export function Hero() {
  return (
    <section className="bg-white py-5 sm:py-7">
      <div className="site-container">
        <div className="relative min-h-[760px] overflow-hidden rounded-[40px] border border-[var(--site-line)] bg-[linear-gradient(180deg,#fbfcfa_0%,#ffffff_37%,var(--brand-orange-tint)_100%)] px-5 pb-0 pt-14 sm:min-h-[900px] sm:px-10 sm:pt-16 lg:min-h-[980px] lg:pt-20">
          <div className="relative z-20 mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--site-line)] bg-white px-5 py-2.5 text-[13px] font-medium text-[var(--site-body)] shadow-sm sm:text-[15px]">
              <Sparkles size={15} className="text-[var(--brand-orange)]" aria-hidden="true" />
              {hero.pill}
              <ArrowRight size={15} className="text-[var(--site-muted)]" aria-hidden="true" />
            </span>

            <h1 className="mt-9 font-display text-[clamp(3.05rem,7vw,6.25rem)] leading-[0.94] text-[var(--site-ink)]">
              {hero.title[0]}{" "}<br />{hero.title[1]}
            </h1>
            <p className="mx-auto mt-6 hidden max-w-2xl text-[15.5px] leading-7 text-[var(--site-body)] sm:block sm:text-[18px]">
              {hero.subtitle}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href={hero.primary.href} className="site-btn site-btn-primary site-btn-lg w-full sm:w-auto">
                {hero.primary.label}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link href={hero.secondary.href} className="site-btn site-btn-secondary site-btn-lg w-full sm:w-auto">
                <Video size={17} aria-hidden="true" />
                {hero.secondary.label}
              </Link>
            </div>
          </div>

          <div className="relative z-10 mx-auto mt-10 max-w-5xl sm:mt-12 lg:absolute lg:inset-x-[8%] lg:bottom-[-180px] lg:mt-0 lg:max-w-none">
            <div className="rounded-t-[34px] border border-b-0 border-[var(--site-line)] bg-white/92 p-4 shadow-[0_30px_90px_-40px_rgba(20,20,15,.3)] backdrop-blur sm:p-7 lg:p-10">
              <HeroLessonMockup />
            </div>
          </div>

          {floatingCards.map(({ icon: Icon, title, sub, className }) => (
            <div key={title} className={`absolute z-20 hidden items-center gap-3 rounded-[18px] border border-[var(--site-line)] bg-white/95 px-4 py-3.5 shadow-[0_18px_45px_-20px_rgba(20,20,15,.35)] backdrop-blur lg:flex ${className}`}>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-orange-soft)] text-[var(--brand-orange-ink)]">
                <Icon size={18} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-[13px] font-semibold text-[var(--site-ink)]">{title}</span>
                <span className="mt-0.5 block text-[11.5px] text-[var(--site-muted)]">{sub}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
