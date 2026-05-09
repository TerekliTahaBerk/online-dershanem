"use client";

import { useState } from "react";
import {
  Video,
  ListChecks,
  LineChart,
  CalendarClock,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

type Tab = {
  key: string;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  icon: LucideIcon;
  Visual: () => JSX.Element;
};

const TABS: Tab[] = [
  {
    key: "live",
    label: "Canlı Ders",
    eyebrow: "Maks. 4 kişilik",
    title: "Sıradan derse girer gibi.",
    description:
      "Ekrandan değil; hocan sana adınla seslenir, anında soru sorabilir, kara tahtayı birlikte doldurursunuz. Birebir yakınlığıyla grup ekonomisini birleştirdik.",
    bullets: [
      "Google Meet üzerinden HD canlı yayın",
      "Hocan sana özel mikrofon süresi ayırır",
      "Her ders kayda alınır, istediğin zaman izlersin",
    ],
    icon: Video,
    Visual: () => <LiveMock />,
  },
  {
    key: "bank",
    label: "Soru Bankası",
    eyebrow: "Akıllı seçki",
    title: "Doğru soru, doğru zamanda.",
    description:
      "Konunun ardından seviyene göre seçilmiş sorular gelir. Yanlış yapınca anında video çözüm açılır; tekrar etmen gereken kavram bir sonraki güne planlanır.",
    bullets: [
      "Konu × zorluk eşleştirmesi",
      "Yanlışta otomatik video çözüm",
      "Eksik kavramlar takvimine düşer",
    ],
    icon: ListChecks,
    Visual: () => <BankMock />,
  },
  {
    key: "analytics",
    label: "Deneme Analizi",
    eyebrow: "Net değil, neden",
    title: "Sayıların arkasındaki hikâye.",
    description:
      "Her denemen konu-konu çözümlenir. Güçlü kasların, eksik halkaların ve zaman yönetimin grafiklerle netleşir; bir sonraki haftan buna göre kurulur.",
    bullets: [
      "Konu bazlı net haritası",
      "Soru bazlı süre analizi",
      "Hocandan yazılı haftalık yorum",
    ],
    icon: LineChart,
    Visual: () => <AnalyticsMock />,
  },
  {
    key: "plan",
    label: "Haftalık Plan",
    eyebrow: "Hocan kurar, sen takip et",
    title: "Hangi gün ne çalışacağını düşünme.",
    description:
      "Dersler, ödevler ve denemeler kişisel takvimine işlenir. Sabah uyandığında o günün listesi karşında; biten her şey kapanır, kalan hatırlatılır.",
    bullets: [
      "Akıllı haftalık takvim",
      "Telefonuna anlık hatırlatma",
      "Eksiklere göre haftalık güncelleme",
    ],
    icon: CalendarClock,
    Visual: () => <PlanMock />,
  },
];

export function HomeFeatures() {
  const [active, setActive] = useState<string>(TABS[0].key);
  const current = TABS.find((t) => t.key === active) ?? TABS[0];
  const Visual = current.Visual;

  return (
    <section className="relative overflow-hidden bg-[var(--od-cream)] py-24 sm:py-32">
      {/* Faint ruled-paper backdrop, like Opennote's "Built for how you learn" */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, transparent 0, transparent 31px, rgba(20,20,15,0.045) 32px)",
          backgroundSize: "100% 32px",
        }}
      />

      <div className="mx-auto max-w-6xl px-5">
        <header className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--od-line)] bg-white/70 px-3 py-1 text-[12px] font-medium text-[var(--od-olive)] backdrop-blur">
            <Sparkles size={12} />
            Her şey tek yerde
          </span>
          <h2 className="mt-6 font-display text-[34px] font-normal leading-[1.12] tracking-tight text-[var(--od-ink)] sm:text-[48px]">
            Hazırlığın için ihtiyacın olan
            <br />
            her şey, <em className="italic text-[var(--od-olive)]">tek</em> bir akışta.
          </h2>
          <p className="mt-6 text-[15.5px] leading-[1.85] text-[var(--od-ink-soft)]">
            Notlar, sorular, denemeler, takvim ve hocan — sekme açıp kapatmadan
            tek bir ekranda. Sen sadece çalış; gerisini biz kuruyoruz.
          </p>
        </header>

        {/* Tabs */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-1 border-b border-[var(--od-line)]">
          {TABS.map((t) => {
            const isActive = t.key === active;
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActive(t.key)}
                className={`relative -mb-px inline-flex items-center gap-1.5 px-5 py-3 text-[14px] font-medium transition ${
                  isActive
                    ? "text-[var(--od-ink)]"
                    : "text-[#8B8B7E] hover:text-[var(--od-ink)]"
                }`}
              >
                <Icon size={15} strokeWidth={1.7} />
                {t.label}
                {isActive ? (
                  <span className="absolute inset-x-3 -bottom-px h-[2px] rounded-full bg-[var(--od-ink)]" />
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Card */}
        <div className="mt-12 overflow-hidden rounded-[36px] border border-[var(--od-line)] bg-white shadow-[0_40px_90px_-40px_rgba(20,20,15,0.18)]">
          <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="flex flex-col justify-center gap-5 p-8 sm:p-12">
              <span className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-[var(--od-olive)]">
                {current.eyebrow}
              </span>
              <h3 className="font-display text-[28px] font-normal leading-[1.12] tracking-tight text-[var(--od-ink)] sm:text-[34px]">
                {current.title}
              </h3>
              <p className="text-[15px] leading-7 text-[var(--od-ink-soft)]">
                {current.description}
              </p>
              <ul className="mt-1 space-y-2.5 text-[13.5px] text-[var(--od-ink)]">
                {current.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--od-olive)]" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative min-h-[340px] border-t border-[var(--od-line)] bg-[var(--od-cream-2)] p-6 sm:p-8 lg:border-l lg:border-t-0">
              <Visual />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Mock illustrations ─────────────────────────────────────────── */

function LiveMock() {
  return (
    <div className="rounded-2xl border border-[var(--od-line)] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 border-b border-[#EFECE0] pb-3">
        <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-[#E54848]" />
        <span className="text-[12px] font-medium text-[var(--od-ink)]">
          TYT Matematik · Türev Uygulamaları
        </span>
        <span className="ml-auto text-[11.5px] text-[#8B8B7E]">00:42:18</span>
      </div>
      <div className="grid gap-3 pt-4 sm:grid-cols-[1.5fr_1fr]">
        <div className="rounded-xl bg-[var(--od-ink)] p-4 font-mono text-[12.5px] leading-6 text-[#E8E8DA]">
          <div className="opacity-60">f(x) = 3x² − 12x + 7</div>
          <div>f&apos;(x) = 6x − 12</div>
          <div>
            6x − 12 = 0 ⇒ <span className="text-[#F4D86A]">x = 2</span>
          </div>
          <div className="mt-2 opacity-60">
            f&apos;&apos;(x) = 6 &gt; 0 → yerel min
          </div>
        </div>
        <ul className="space-y-1.5 text-[12px]">
          {["Merve Y.", "Ayşe D.", "Can Ö.", "Pelin A."].map((n, i) => (
            <li
              key={n}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                i === 0
                  ? "bg-[var(--od-yellow-soft)] text-[var(--od-ink)]"
                  : "text-[var(--od-ink-soft)]"
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--od-ink)] text-[10px] font-medium text-white">
                {n.charAt(0)}
              </span>
              {n}
              {i === 0 ? (
                <span className="ml-auto inline-flex h-1.5 w-1.5 rounded-full bg-[var(--od-olive)]" />
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function BankMock() {
  return (
    <div className="space-y-3">
      {[
        { q: "Türev tanımı — temel limit", ok: true },
        { q: "Zincir kuralı — orta", ok: true },
        { q: "Maksimum-minimum — uygulama", ok: false },
        { q: "Konkavlık ve büküm noktaları", ok: null },
      ].map((row) => (
        <div
          key={row.q}
          className="flex items-center justify-between rounded-xl border border-[var(--od-line)] bg-white px-4 py-3 text-[13.5px]"
        >
          <span className="text-[var(--od-ink)]">{row.q}</span>
          {row.ok === true ? (
            <span className="rounded-full bg-[#E8F4ED] px-2 py-0.5 text-[11px] font-medium text-[#1E8C5C]">
              Doğru
            </span>
          ) : row.ok === false ? (
            <span className="rounded-full bg-[#FBEAEA] px-2 py-0.5 text-[11px] font-medium text-[#B5403F]">
              Tekrar gerekli
            </span>
          ) : (
            <span className="rounded-full bg-[var(--od-cream-2)] px-2 py-0.5 text-[11px] font-medium text-[#8B8B7E]">
              Bekliyor
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function AnalyticsMock() {
  const bars = [55, 72, 38, 84, 60, 90, 48];
  return (
    <div className="rounded-2xl border border-[var(--od-line)] bg-white p-5">
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] font-medium uppercase tracking-wider text-[#8B8B7E]">
          Son 7 deneme · TYT
        </span>
        <span className="font-display text-[22px] text-[var(--od-ink)]">
          +14 net
        </span>
      </div>
      <div className="mt-5 flex h-32 items-end gap-2">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-md bg-gradient-to-t from-[var(--od-olive)] to-[#B7CCA0]"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="mt-3 flex justify-between text-[10.5px] text-[#8B8B7E]">
        {["1", "2", "3", "4", "5", "6", "7"].map((d) => (
          <span key={d}>D{d}</span>
        ))}
      </div>
    </div>
  );
}

function PlanMock() {
  const days = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
  const events = [
    { d: 0, t: "TYT Matematik", c: "var(--od-ink)" },
    { d: 1, t: "AYT Fizik", c: "var(--od-olive)" },
    { d: 1, t: "Soru Çözüm", c: "#8B8B7E" },
    { d: 3, t: "TYT Türkçe", c: "var(--od-ink)" },
    { d: 4, t: "Deneme", c: "#1E8C5C" },
    { d: 6, t: "Koçluk", c: "var(--od-olive)" },
  ];
  return (
    <div className="rounded-2xl border border-[var(--od-line)] bg-white p-5">
      <div className="grid grid-cols-7 gap-2 text-center text-[10.5px] font-medium uppercase tracking-wider text-[#8B8B7E]">
        {days.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-2">
        {days.map((_, i) => (
          <div
            key={i}
            className="flex min-h-[88px] flex-col gap-1 rounded-lg bg-[var(--od-cream-2)] p-1.5"
          >
            {events
              .filter((e) => e.d === i)
              .map((e, idx) => (
                <div
                  key={idx}
                  className="rounded-md px-1.5 py-1 text-[10px] font-medium text-white"
                  style={{ background: e.c }}
                >
                  {e.t}
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
