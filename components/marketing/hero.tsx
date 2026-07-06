import Link from "next/link";
import { ArrowRight, Sparkles, CalendarCheck, LineChart, FileText } from "lucide-react";
import { hero } from "@/lib/site-content";
import { PlannerMockup } from "@/components/marketing/mockups";

const floatIcons = [CalendarCheck, LineChart, FileText];

/**
 * Hero — merkezde büyük serif başlık, turuncu highlight, iki CTA ve geniş
 * rounded hero container (CSS planner mockup + floating kartlar).
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-white pt-14 sm:pt-20">
      {/* Yumuşak turuncu arka plan parıltısı */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,var(--brand-orange-tint),transparent_70%)]"
      />
      <div className="site-container relative">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--site-line)] bg-white px-3.5 py-1.5 text-[13px] font-medium text-[var(--site-body)] shadow-sm">
            <Sparkles size={14} className="text-[var(--brand-orange)]" aria-hidden="true" />
            {hero.pill}
          </span>

          <h1 className="mt-6 font-display text-[clamp(2.6rem,7vw,5rem)] leading-[1.02] tracking-[-0.03em] text-[var(--site-ink)]">
            {hero.title[0]}{" "}
            <span className="site-hl">{hero.title[1]}</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-[16.5px] leading-7 text-[var(--site-body)] sm:text-[18px]">
            {hero.subtitle}
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={hero.primary.href} className="site-btn site-btn-primary site-btn-lg w-full sm:w-auto">
              {hero.primary.label}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link href={hero.secondary.href} className="site-btn site-btn-secondary site-btn-lg w-full sm:w-auto">
              {hero.secondary.label}
            </Link>
          </div>
        </div>

        {/* Hero görsel alanı */}
        <div className="relative mx-auto mt-14 max-w-4xl sm:mt-16">
          <div className="rounded-[32px] border border-[var(--site-line)] bg-gradient-to-b from-[var(--brand-orange-tint)] to-white p-4 shadow-[0_40px_80px_-40px_rgba(20,20,15,0.3)] sm:p-8">
            <PlannerMockup />
          </div>

          {/* Floating kartlar — masaüstünde konumlanır, mobilde grid'e döner */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:hidden">
            {hero.floatingCards.map((card, i) => {
              const Icon = floatIcons[i] ?? CalendarCheck;
              return (
                <div
                  key={card.title}
                  className="flex items-center gap-3 rounded-2xl border border-[var(--site-line)] bg-white p-3 shadow-sm"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-orange-soft)] text-[var(--brand-orange-ink)]">
                    <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-[13px] font-semibold text-[var(--site-ink)]">{card.title}</span>
                    <span className="block text-[11.5px] text-[var(--site-muted)]">{card.sub}</span>
                  </span>
                </div>
              );
            })}
          </div>

          {/* Masaüstü floating konumlar */}
          <FloatCard
            className="left-[-28px] top-14"
            icon={<CalendarCheck size={17} strokeWidth={1.8} aria-hidden="true" />}
            title={hero.floatingCards[0].title}
            sub={hero.floatingCards[0].sub}
          />
          <FloatCard
            className="right-[-28px] top-1/3"
            icon={<LineChart size={17} strokeWidth={1.8} aria-hidden="true" />}
            title={hero.floatingCards[1].title}
            sub={hero.floatingCards[1].sub}
          />
          <FloatCard
            className="bottom-10 left-8"
            icon={<FileText size={17} strokeWidth={1.8} aria-hidden="true" />}
            title={hero.floatingCards[2].title}
            sub={hero.floatingCards[2].sub}
          />
        </div>
      </div>
    </section>
  );
}

function FloatCard({
  className,
  icon,
  title,
  sub,
}: {
  className: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`absolute z-10 hidden items-center gap-3 rounded-2xl border border-[var(--site-line)] bg-white/95 p-3 shadow-[0_20px_40px_-20px_rgba(20,20,15,0.35)] backdrop-blur lg:flex ${className}`}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-orange-soft)] text-[var(--brand-orange-ink)]">
        {icon}
      </span>
      <span>
        <span className="block text-[13px] font-semibold text-[var(--site-ink)]">{title}</span>
        <span className="block text-[11.5px] text-[var(--site-muted)]">{sub}</span>
      </span>
    </div>
  );
}
