"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { faq } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { FadeIn } from "@/components/ui/fade-in";

function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <FadeIn delay={index * 0.04}>
      <div
        className={`overflow-hidden rounded-2xl border transition-colors duration-200 ${
          open ? "border-brand/30 bg-white shadow-soft" : "border-line bg-white hover:border-line-strong"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left"
          aria-expanded={open}
        >
          <span className="text-sm font-semibold leading-snug text-ink">{q}</span>
          <span
            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ${
              open
                ? "border-brand/30 bg-brand/10 text-brand"
                : "border-line-strong bg-soft text-muted"
            }`}
          >
            {open ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          </span>
        </button>

        <div
          className={`grid transition-all duration-300 ease-in-out ${
            open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <p className="px-5 pb-5 text-sm leading-relaxed text-muted">{a}</p>
          </div>
        </div>
      </div>
    </FadeIn>
  );
}

export function FAQSection() {
  return (
    <section id="sss" className="py-16 sm:py-24">
      <Container>
        <FadeIn>
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">SSS</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Sık Sorulan Sorular</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted">
              Ders bazlı Grup Özel Ders modeli, küçük grup yapısı, seviye yerleşimi ve ders seçimi hakkında en çok sorulan başlıkları net şekilde yanıtladık.
            </p>
          </div>
        </FadeIn>

        <div className="mx-auto mt-10 max-w-3xl space-y-2.5">
          {faq.map((item, i) => (
            <FAQItem key={item.q} q={item.q} a={item.a} index={i} />
          ))}
        </div>
      </Container>
    </section>
  );
}
