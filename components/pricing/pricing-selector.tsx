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
    key: "tyt",
    label: "TYT",
    description: "Temel matematik: konu eksiklerini kapatma, hız–doğruluk dengesi ve deneme analizi.",
  },
  {
    key: "ayt",
    label: "AYT",
    description: "İleri matematik: türev, integral, limit gibi konularda derinlik ve zorlu soru tipleri.",
  },
];

/**
 * Sınav/seviye seçici — referanstaki sınav seçimine benzer segmented toggle.
 * Yalnızca açıklama metnini günceller; FİYAT ve checkout kimliği DEĞİŞMEZ
 * (tek paket, tüm seviyeler için aynı fiyat).
 */
export function PricingSelector({ options = DEFAULT_OPTIONS }: { options?: Option[] }) {
  const [active, setActive] = useState(options[1]?.key ?? options[0].key);
  const current = options.find((o) => o.key === active) ?? options[0];

  return (
    <div>
      <div
        role="tablist"
        aria-label="Sınav seviyesi seçimi"
        className="inline-flex rounded-full border border-[var(--site-line)] bg-white p-1"
      >
        {options.map((o) => {
          const isActive = o.key === active;
          return (
            <button
              key={o.key}
              type="button"
              role="tab"
              aria-selected={isActive}
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
      <p className="mt-4 max-w-lg text-[14.5px] leading-6 text-[var(--site-body)]">{current.description}</p>
    </div>
  );
}
