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
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="sss" className={`scroll-mt-24 ${tone === "warm" ? "bg-[var(--site-bg-warm)]" : "bg-white"}`}>
      <div className="site-container py-24 sm:py-36">
        <h2 className="font-display text-[clamp(3rem,6vw,5.6rem)] leading-[.98] text-[var(--site-ink)]">
          {title}
        </h2>

        <div className="mt-20 divide-y divide-[var(--site-line)] border-b border-[var(--site-line)] bg-white">
          {items.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q}>
                <h3>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${i}`}
                    id={`faq-question-${i}`}
                    className="flex w-full items-center justify-between gap-6 py-8 text-left sm:py-10"
                  >
                    <span className="text-[18px] font-semibold text-[var(--site-ink)] sm:text-[22px]">
                      {item.q}
                    </span>
                    <span
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f5f5f4] text-[var(--site-body)] transition-transform duration-200 sm:h-14 sm:w-14 ${
                        isOpen ? "rotate-45 bg-[var(--brand-orange-soft)] text-[var(--brand-orange-ink)]" : ""
                      }`}
                      aria-hidden="true"
                    >
                      <Plus size={24} strokeWidth={1.6} />
                    </span>
                  </button>
                </h3>
                <div
                  id={`faq-answer-${i}`}
                  role="region"
                  aria-labelledby={`faq-question-${i}`}
                  hidden={!isOpen}
                  className="max-w-4xl pb-9 pr-16 text-[16px] leading-8 text-[var(--site-body)] sm:text-[18px]"
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
