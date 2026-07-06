import Link from "next/link";
import { Check } from "lucide-react";
import { first30 } from "@/lib/site-content";

/**
 * "İlk 30 günde neler değişir?" — üstte timeline (Bugün / 7. Gün / 30. Gün),
 * altında 3 kolon. Referanstaki timeline/kolon yapısına yakın, statik & erişilebilir.
 */
export function First30Days() {
  return (
    <section className="bg-[var(--site-bg-warm)]">
      <div className="site-container py-20 sm:py-28">
        <h2 className="mx-auto max-w-2xl text-center font-display text-[clamp(2rem,4.6vw,3.25rem)] leading-[1.08] tracking-[-0.02em] text-[var(--site-ink)]">
          {first30.title[0]} <span className="site-hl">{first30.title[1]}</span>
        </h2>

        {/* Timeline */}
        <div className="mx-auto mt-12 flex max-w-4xl items-center gap-2" aria-hidden="true">
          {first30.timeline.map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-2 last:flex-none">
              <span
                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold ${
                  i === 0
                    ? "bg-[var(--site-ink)] text-white"
                    : "bg-white text-[var(--site-muted)] ring-1 ring-[var(--site-line)]"
                }`}
              >
                {label}
              </span>
              {i < first30.timeline.length - 1 ? (
                <span className="h-px flex-1 bg-[var(--site-line)]" />
              ) : null}
            </div>
          ))}
        </div>

        {/* Kolonlar */}
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {first30.columns.map((col) => (
            <div
              key={col.title}
              className="rounded-[24px] border border-[var(--site-line)] bg-white p-7 shadow-[0_1px_2px_rgba(20,20,15,0.03)]"
            >
              <h3 className="text-[17px] font-bold text-[var(--site-ink)]">{col.title}</h3>
              <ul className="mt-5 flex flex-col gap-3.5">
                {col.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[14.5px] leading-6 text-[var(--site-body)]">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--brand-orange-soft)] text-[var(--brand-orange-ink)]">
                      <Check size={12} strokeWidth={3} aria-hidden="true" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link href={first30.cta.href} className="site-btn site-btn-primary site-btn-lg">
            {first30.cta.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
