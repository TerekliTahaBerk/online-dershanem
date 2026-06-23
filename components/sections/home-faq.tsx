"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { faq } from "@/lib/content";

export function HomeFAQ() {
  const items = faq.slice(0, 8);
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="bg-[var(--od-cream)] py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-5">
        <header className="text-center">
          <h2 className="font-display text-[32px] font-normal leading-[1.15] tracking-tight text-[var(--od-ink)] sm:text-[40px]">
            Merak edilenler.
          </h2>
        </header>

        <ul className="mt-14 divide-y divide-[#E5E5E0] border-y border-[var(--od-line)]">
          {items.map((it, idx) => {
            const isOpen = open === idx;
            return (
              <li key={it.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-6 py-6 text-left transition hover:bg-[var(--od-cream-2)]/50"
                >
                  <span className="font-display text-[18px] font-normal text-[var(--od-ink)] sm:text-[20px]">
                    {it.q}
                  </span>
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--od-line)] text-[var(--od-ink)] transition ${
                      isOpen ? "bg-[#0E0E10] text-white" : "bg-white"
                    }`}
                  >
                    {isOpen ? <Minus size={14} /> : <Plus size={14} />}
                  </span>
                </button>
                {isOpen ? (
                  <p className="pb-7 text-[15px] leading-[1.85] text-[var(--od-ink-soft)]">{it.a}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
