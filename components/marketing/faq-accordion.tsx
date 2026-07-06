"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { Faq } from "@/lib/site-content";

type FaqAccordionProps = {
  title?: string;
  items: Faq[];
  /** Bölüm zemini. */
  tone?: "plain" | "warm";
};

/**
 * Sade, erişilebilir FAQ accordion. Her başlık bir <button> (aria-expanded);
 * içerik id ile ilişkilendirilir. Klavye ile tam erişilebilir.
 */
export function FaqAccordion({ title = "Sıkça sorulan sorular", items, tone = "warm" }: FaqAccordionProps) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className={tone === "warm" ? "bg-[var(--site-bg-warm)]" : "bg-white"}>
      <div className="site-container py-20 sm:py-28">
        <h2 className="text-center font-display text-[clamp(2rem,4.6vw,3.4rem)] leading-[1.08] tracking-[-0.02em] text-[var(--site-ink)]">
          {title}
        </h2>

        <div className="mx-auto mt-12 max-w-3xl divide-y divide-[var(--site-line)] rounded-[24px] border border-[var(--site-line)] bg-white">
          {items.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q}>
                <h3>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    id={`faq-trigger-${i}`}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  >
                    <span className="text-[16px] font-semibold text-[var(--site-ink)] sm:text-[17px]">
                      {item.q}
                    </span>
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--site-line)] text-[var(--site-body)] transition-transform duration-200 ${
                        isOpen ? "rotate-45 border-[var(--brand-orange)] text-[var(--brand-orange-ink)]" : ""
                      }`}
                      aria-hidden="true"
                    >
                      <Plus size={18} strokeWidth={1.8} />
                    </span>
                  </button>
                </h3>
                <div
                  id={`faq-panel-${i}`}
                  role="region"
                  aria-labelledby={`faq-trigger-${i}`}
                  hidden={!isOpen}
                  className="px-6 pb-6 text-[15px] leading-7 text-[var(--site-body)]"
                >
                  {item.a}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
