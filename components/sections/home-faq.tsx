"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { faq } from "@/lib/content";

export function HomeFAQ() {
  const items = faq.slice(0, 8);
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="border-t border-[#E5E5E0] bg-[#FAFAF7] py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-5">
        <header className="text-center">
          <span className="text-[12.5px] font-medium uppercase tracking-[0.18em] text-[#7A7A7F]">
            S.S.S.
          </span>
          <h2 className="mt-3 font-display text-[32px] font-normal leading-[1.1] tracking-tight text-[#0E0E10] sm:text-[40px]">
            Merak edilenler.
          </h2>
        </header>

        <ul className="mt-12 divide-y divide-[#E5E5E0] border-y border-[#E5E5E0]">
          {items.map((it, idx) => {
            const isOpen = open === idx;
            return (
              <li key={it.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-6 py-5 text-left transition hover:bg-[#F2F2EF]/50"
                >
                  <span className="font-display text-[18px] font-normal text-[#0E0E10] sm:text-[20px]">
                    {it.q}
                  </span>
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E5E5E0] text-[#0E0E10] transition ${
                      isOpen ? "bg-[#0E0E10] text-white" : "bg-white"
                    }`}
                  >
                    {isOpen ? <Minus size={14} /> : <Plus size={14} />}
                  </span>
                </button>
                {isOpen ? (
                  <p className="pb-6 text-[15px] leading-7 text-[#5A5A5F]">{it.a}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
