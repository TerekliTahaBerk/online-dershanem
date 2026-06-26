"use client";

import { useId, useState } from "react";
import { Plus, Minus } from "lucide-react";

type FaqItem = { q: string; a: string };
type FaqCategory = { category: string; items: FaqItem[] };

/**
 * Kategori bazlı, erişilebilir SSS accordion'u. Her soru bir <button> (klavye ile
 * native çalışır), aria-expanded + aria-controls ile cevabına bağlanır; cevap
 * panelinin id + role="region" ve aria-labelledby'si vardır.
 */
export function FaqAccordion({ categories }: { categories: FaqCategory[] }) {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 sm:pb-32">
      <div className="space-y-12">
        {categories.map((cat) => (
          <section key={cat.category} aria-labelledby={`faq-cat-${slug(cat.category)}`}>
            <h2
              id={`faq-cat-${slug(cat.category)}`}
              className="font-display text-[24px] font-normal leading-tight tracking-tight text-[var(--od-ink)] sm:text-[28px]"
            >
              {cat.category}
            </h2>
            <ul className="mt-5 overflow-hidden rounded-[24px] border border-[var(--od-line)] bg-white">
              {cat.items.map((item) => (
                <FaqRow key={item.q} item={item} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function FaqRow({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);
  const baseId = useId();
  const buttonId = `${baseId}-btn`;
  const panelId = `${baseId}-panel`;

  return (
    <li className="border-b border-[var(--od-line)] last:border-b-0">
      <h3>
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-6 px-5 py-5 text-left transition hover:bg-[var(--od-sky-soft)]/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--od-olive)] focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:px-6"
        >
          <span className="font-display text-[17px] font-normal leading-snug text-[var(--od-ink)] sm:text-[19px]">
            {item.q}
          </span>
          <span
            aria-hidden="true"
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--od-line)] transition ${
              open ? "bg-[var(--od-olive)] text-white" : "bg-white text-[var(--od-ink)]"
            }`}
          >
            {open ? <Minus size={14} /> : <Plus size={14} />}
          </span>
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        hidden={!open}
        className="px-5 pb-6 text-[15px] leading-[1.8] text-[var(--od-ink-soft)] sm:px-6"
      >
        {item.a}
      </div>
    </li>
  );
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
