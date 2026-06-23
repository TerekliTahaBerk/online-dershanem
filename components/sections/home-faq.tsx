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

        <ul className="mt-14 overflow-hidden rounded-[24px] border border-[var(--od-line)] bg-white">
          {items.map((it, idx) => {
            const isOpen = open === idx;
            return (
              <li key={it.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-6 px-5 py-6 text-left transition hover:bg-[var(--od-sky-soft)]/55 sm:px-6"
                >
                  <span className="font-display text-[18px] font-normal text-[var(--od-ink)] sm:text-[20px]">
                    {it.q}
                  </span>
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--od-line)] text-[var(--od-ink)] transition ${
                      isOpen ? "bg-[var(--od-olive)] text-white" : "bg-white"
                    }`}
                  >
                    {isOpen ? <Minus size={14} /> : <Plus size={14} />}
                  </span>
                </button>
                {isOpen ? (
                  <p className="px-5 pb-7 text-[15px] leading-[1.85] text-[var(--od-ink-soft)] sm:px-6">{it.a}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
