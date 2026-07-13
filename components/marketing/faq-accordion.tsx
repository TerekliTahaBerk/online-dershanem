import Link from "next/link";
import { Plus } from "lucide-react";
import type { Faq } from "@/lib/site-content";

type Props = { title?: string; items: Faq[]; tone?: "plain" | "warm"; showAllLink?: boolean };

export function FaqAccordion({ title = "Karar vermeden önce merak edilenler.", items, tone = "warm", showAllLink = false }: Props) {
  return (
    <section id="sss" className={`scroll-mt-24 ${tone === "warm" ? "bg-[var(--brand-olive-tint)]" : "bg-white"}`}>
      <div className="site-container site-section">
        <div className="grid gap-10 lg:grid-cols-[.65fr_1.35fr] lg:gap-20">
          <div>
            <p className="site-kicker">Sıkça sorulanlar</p>
            <h2 className="mt-4 text-[clamp(2.3rem,5vw,3.6rem)] font-semibold leading-[1.03] tracking-[-.04em] text-[var(--site-ink)]">{title}</h2>
            {showAllLink ? <Link href="/sss/" className="mt-7 inline-flex text-[14px] font-semibold text-[var(--brand-olive)] hover:underline">Tüm soruları gör</Link> : null}
          </div>
          <div className="divide-y divide-[var(--site-line)] border-y border-[var(--site-line)]">
            {items.map((item) => (
              <details key={item.q} className="group">
                <summary className="flex min-h-[68px] cursor-pointer list-none items-center justify-between gap-5 py-5 text-[16px] font-semibold text-[var(--site-ink)] [&::-webkit-details-marker]:hidden">
                  {item.q}<Plus size={20} className="shrink-0 transition-transform duration-200 group-open:rotate-45" aria-hidden="true" />
                </summary>
                <p className="max-w-3xl pb-6 pr-10 text-[15px] leading-7 text-[var(--site-body)]">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
