import Link from "next/link";
import { Check } from "lucide-react";
import { first30 } from "@/lib/site-content";

export function First30Days() {
  return (
    <section id="ilk-30-gun" className="scroll-mt-24 bg-white">
      <div className="site-container py-24 sm:py-36">
        <h2 className="mx-auto max-w-5xl text-center font-display text-[clamp(2.8rem,6.2vw,5.8rem)] leading-[.98] text-[var(--site-ink)]">
          Matematikte <span className="site-hl">ilk 30 günde</span><br />ne değişir?
        </h2>

        <div className="mt-20 flex items-center gap-3" aria-hidden="true">
          {first30.timeline.map((label, index) => (
            <div key={label} className="flex min-w-0 flex-1 items-center gap-3 last:flex-none">
              <span className={`whitespace-nowrap rounded-full px-5 py-2.5 text-[14px] font-semibold sm:px-7 sm:text-[17px] ${index === 0 ? "bg-[var(--site-ink)] text-white" : "bg-[#f4f4f3] text-[var(--site-muted)]"}`}>{label}</span>
              {index < first30.timeline.length - 1 ? <span className="h-px flex-1 bg-[var(--site-line)]" /> : null}
            </div>
          ))}
        </div>

        <div className="mt-10 grid overflow-hidden rounded-[36px] border border-[var(--site-line)] bg-white shadow-[0_30px_70px_-54px_rgba(20,20,15,.35)] md:grid-cols-3">
          {first30.columns.map((column, index) => (
            <article key={column.title} className={`p-8 sm:p-11 lg:p-14 ${index ? "border-t border-[var(--site-line)] md:border-l md:border-t-0" : ""}`}>
              <h3 className="text-center text-[20px] font-bold text-[var(--site-ink)] sm:text-[23px]">{column.title}</h3>
              <ul className="mt-9 space-y-6">
                {column.items.map((item) => (
                  <li key={item} className="flex items-start gap-4 text-[15px] leading-7 text-[var(--site-body)] sm:text-[17px]">
                    <Check size={20} strokeWidth={2.5} className="mt-1 shrink-0 text-[var(--brand-orange)]" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link href={first30.cta.href} className="site-btn site-btn-primary site-btn-lg px-10 py-5 text-[17px]">{first30.cta.label}</Link>
        </div>
      </div>
    </section>
  );
}
