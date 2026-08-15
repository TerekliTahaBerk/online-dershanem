"use client";

import { useState } from "react";

/**
 * 06 DERS KEŞFİ — onaylı tasarım (Web.dc.html).
 * LGS/YKS geçişi, altında 5 kolonluk ders ızgarası. Mobilde yatay kaydırma
 * yerine 2 kolona iner (dokunma hedefi ve okunabilirlik için).
 *
 * DÜRÜSTLÜK: tasarımın kendi metni bu listenin bir yerleşim örneği olduğunu
 * söylüyor ("kesin katalog onaylandığında güncellenecek"). Bu uyarı ekranda
 * korunur; liste satılabilir ders vaadi değildir.
 */

const catalog = {
  LGS: {
    primary: ["Matematik", "Türkçe", "Fen Bilimleri", "İnkılap Tarihi", "İngilizce"],
    secondary: ["Geometri", "Din Kültürü", "Paragraf", "Deneme Analizi", "Yeni Nesil Sorular"],
  },
  YKS: {
    primary: ["Matematik", "Türkçe", "Fizik", "Kimya", "Biyoloji"],
    secondary: ["Geometri", "Tarih", "Coğrafya", "İngilizce", "Felsefe"],
  },
} as const;

type Track = keyof typeof catalog;

export function CourseDiscovery() {
  const [track, setTrack] = useState<Track>("LGS");
  const { primary, secondary } = catalog[track];

  return (
    <section className="border-y border-dc-line-soft bg-white">
      <div className="site-container py-[var(--dc-section-tight)]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[12px] font-semibold tracking-[0.08em] text-[var(--dc-ink-faint)]">
              ONLINE DERSHANEM İÇİNDE
            </p>
            <h3 className="mt-3 font-display text-[26px] leading-[1.15] tracking-[-0.02em] text-dc-ink sm:text-[32px]">
              Hangi dersi alacağını sen seçiyorsun
            </h3>
            <p className="mt-2.5 max-w-[520px] text-[15.5px] leading-[1.6] text-dc-ink-muted">
              Paket fiyatına bir ders dahil; istersen ek ders eklersin. Aşağıdaki liste
              yerleşim örneğidir, kesin katalog onaylandığında güncellenecek.
            </p>
          </div>

          <div role="group" aria-label="Sınav seçimi" className="flex gap-2">
            {(Object.keys(catalog) as Track[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTrack(t)}
                aria-pressed={track === t}
                className={`rounded-full px-4 py-2.5 text-[13px] font-bold transition-colors ${
                  track === t
                    ? "bg-dc-brand-strong text-white"
                    : "border border-[#DDE4E0] bg-white text-dc-ink hover:border-dc-brand"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <ul className="mt-7 grid grid-cols-2 border-t border-dc-line sm:grid-cols-3 lg:grid-cols-5">
          {primary.map((name) => (
            <li key={name} className="border-b border-dc-line py-[18px] pr-5">
              <span className="text-[16px] font-bold text-dc-ink">{name}</span>
            </li>
          ))}
          {secondary.map((name) => (
            <li key={name} className="py-[18px] pr-5">
              <span className="text-[15px] text-dc-ink-faint">{name}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
