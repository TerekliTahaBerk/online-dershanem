"use client";

import { useState } from "react";

type Option = { key: string; label: string; description: string };

const DEFAULT_OPTIONS: Option[] = [
  {
    key: "lgs",
    label: "LGS",
    description: "8. sınıf öğrencileri için: yeni nesil sorular, temel kavramlar ve sınav matematiği.",
  },
  {
    key: "yks",
    label: "YKS",
    description: "TYT ve AYT matematiğini birlikte götüren: temel, hız, derinlik ve deneme analizi.",
  },
];

/**
 * Sınav/seviye seçici — LGS ve YKS paket dilini hızlı açıklar.
 */
export function PricingSelector({ options = DEFAULT_OPTIONS }: { options?: Option[] }) {
  const [active, setActive] = useState(options[0].key);
  const current = options.find((o) => o.key === active) ?? options[0];

  return (
    <div>
      <div
        role="group"
        aria-label="Sınav seviyesi seçimi"
        className="inline-flex rounded-full border border-[var(--site-line)] bg-white p-1"
      >
        {options.map((o) => {
          const isActive = o.key === active;
          return (
            <button
              key={o.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActive(o.key)}
              className={`rounded-full px-5 py-2 text-[14px] font-semibold transition-colors ${
                isActive
                  ? "bg-[var(--brand-orange)] text-white"
                  : "text-[var(--site-body)] hover:text-[var(--site-ink)]"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className="mt-4 max-w-lg text-[14.5px] leading-6 text-[var(--site-body)]">
        {current.description}
      </p>
    </div>
  );
}
