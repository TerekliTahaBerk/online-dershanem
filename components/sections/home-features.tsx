"use client";

import { useState } from "react";
import {
  Video,
  ListChecks,
  LineChart,
  CalendarClock,
  Users,
  type LucideIcon,
} from "lucide-react";

type Tab = {
  key: string;
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Render a small illustrative mockup for the active tab. */
  Visual: () => JSX.Element;
};

const TABS: Tab[] = [
  {
    key: "live",
    label: "Canlı Ders",
    title: "Maksimum dört kişilik gruplar.",
    description:
      "Ekrandan değil, sıradan derse girer gibi: hocan adınla seslenir, soru sorabilir, anlık cevap alabilirsin.",
    icon: Video,
    Visual: () => <LiveMock />,
  },
  {
    key: "bank",
    label: "Soru Bankası",
    title: "Doğru soru, doğru zamanda.",
    description:
      "Her konunun ardından seviyene göre seçilmiş sorular. Yanlış yapınca anında video çözüm açılır.",
    icon: ListChecks,
    Visual: () => <BankMock />,
  },
  {
    key: "analytics",
    label: "Deneme Analizi",
    title: "Net değil, neden önemli.",
    description:
      "Her denemen konu-konu analiz edilir; güçlü kasların ve eksik kalan halkalar grafiklerle görünür hale gelir.",
    icon: LineChart,
    Visual: () => <AnalyticsMock />,
  },
  {
    key: "plan",
    label: "Haftalık Plan",
    title: "Hafta, hocan tarafından kurulur.",
    description:
      "Dersler, ödevler ve denemeler kişisel takvimine işlenir; ne zaman ne çalışacağını düşünmek zorunda kalmazsın.",
    icon: CalendarClock,
    Visual: () => <PlanMock />,
  },
  {
    key: "parent",
    label: "Veli Paneli",
    title: "Ailene de şeffaf.",
    description:
      "Velin haftalık özet rapor alır: derslere katılım, ödev tamamlama oranı, deneme sonuçları — fazlası değil.",
    icon: Users,
    Visual: () => <ParentMock />,
  },
];

export function HomeFeatures() {
  const [active, setActive] = useState<string>(TABS[0].key);
  const current = TABS.find((t) => t.key === active) ?? TABS[0];
  const Visual = current.Visual;

  return (
    <section className="border-t border-[#E5E5E0] bg-[#FAFAF7] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <header className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-[32px] font-normal leading-[1.1] tracking-tight text-[#0E0E10] sm:text-[44px]">
            Her şey <em className="italic text-[#3A4A2C]">tek</em> yerde.
          </h2>
          <p className="mt-4 text-[15.5px] leading-7 text-[#5A5A5F]">
            Notlar, sorular, denemeler, takvim, hocan ve ailen — sekme açıp
            kapatmadan tek bir akışta.
          </p>
        </header>

        {/* Tabs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-1 border-b border-[#E5E5E0]">
          {TABS.map((t) => {
            const isActive = t.key === active;
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActive(t.key)}
                className={`relative -mb-px inline-flex items-center gap-1.5 px-4 py-3 text-[14px] font-medium transition ${
                  isActive
                    ? "text-[#0E0E10]"
                    : "text-[#7A7A7F] hover:text-[#0E0E10]"
                }`}
              >
                <Icon size={15} strokeWidth={1.7} />
                {t.label}
                {isActive ? (
                  <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-[#0E0E10]" />
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Card */}
        <div className="mt-10 overflow-hidden rounded-3xl border border-[#E5E5E0] bg-white shadow-[0_24px_60px_-32px_rgba(14,14,16,0.18)]">
          <div className="grid gap-0 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="flex flex-col justify-center gap-4 p-8 sm:p-12">
              <h3 className="font-display text-[24px] font-normal leading-[1.15] tracking-tight text-[#0E0E10] sm:text-[30px]">
                {current.title}
              </h3>
              <p className="text-[15px] leading-7 text-[#5A5A5F]">{current.description}</p>
            </div>
            <div className="relative min-h-[320px] border-t border-[#E5E5E0] bg-[#F6F4EE] p-6 sm:p-8 lg:border-l lg:border-t-0">
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
    <div className="relative h-full w-full">
      <div className="rounded-2xl border border-[#E5E5E0] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 border-b border-[#EFECE4] pb-3">
          <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-[#E54848]" />
          <span className="text-[12px] font-medium text-[#0E0E10]">
            TYT Matematik · Türev Uygulamaları
          </span>
          <span className="ml-auto text-[11.5px] text-[#7A7A7F]">00:42:18</span>
        </div>
        <div className="grid gap-3 pt-4 sm:grid-cols-[1.5fr_1fr]">
          <div className="rounded-xl bg-[#0E0E10] p-4 font-mono text-[12.5px] leading-6 text-[#E8E8EA]">
            <div className="opacity-60">f(x) = 3x² − 12x + 7</div>
            <div>f&apos;(x) = 6x − 12</div>
            <div>6x − 12 = 0 ⇒ <span className="text-[#7BD8A6]">x = 2</span></div>
            <div className="mt-2 opacity-60">f&apos;&apos;(x) = 6 &gt; 0 → yerel min</div>
          </div>
          <ul className="space-y-1.5 text-[12px]">
            {["Merve Y.", "Ayşe D.", "Can Ö.", "Pelin A."].map((n, i) => (
              <li
                key={n}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                  i === 0 ? "bg-[#F4F1E8] text-[#0E0E10]" : "text-[#5A5A5F]"
                }`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0E0E10] text-[10px] font-medium text-white">
                  {n.charAt(0)}
                </span>
                {n}
                {i === 0 ? (
                  <span className="ml-auto inline-flex h-1.5 w-1.5 rounded-full bg-[#22A06B]" />
                ) : null}
              </li>
            ))}
          </ul>
        </div>
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
          className="flex items-center justify-between rounded-xl border border-[#E5E5E0] bg-white px-4 py-3 text-[13.5px]"
        >
          <span className="text-[#0E0E10]">{row.q}</span>
          {row.ok === true ? (
            <span className="rounded-full bg-[#E8F4ED] px-2 py-0.5 text-[11px] font-medium text-[#1E8C5C]">
              Doğru
            </span>
          ) : row.ok === false ? (
            <span className="rounded-full bg-[#FBEAEA] px-2 py-0.5 text-[11px] font-medium text-[#B5403F]">
              Tekrar gerekli
            </span>
          ) : (
            <span className="rounded-full bg-[#F2F2EF] px-2 py-0.5 text-[11px] font-medium text-[#7A7A7F]">
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
    <div className="rounded-2xl border border-[#E5E5E0] bg-white p-5">
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] font-medium uppercase tracking-wider text-[#7A7A7F]">
          Son 7 deneme · TYT
        </span>
        <span className="font-display text-[22px] text-[#0E0E10]">+14 net</span>
      </div>
      <div className="mt-5 flex items-end gap-2 h-32">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-md bg-gradient-to-t from-[#3A4A2C] to-[#7BD8A6]"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="mt-3 flex justify-between text-[10.5px] text-[#7A7A7F]">
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
    { d: 0, t: "TYT Matematik", c: "#0E0E10" },
    { d: 1, t: "AYT Fizik", c: "#3A4A2C" },
    { d: 1, t: "Soru Çözüm", c: "#7A7A7F" },
    { d: 3, t: "TYT Türkçe", c: "#0E0E10" },
    { d: 4, t: "Deneme", c: "#22A06B" },
    { d: 6, t: "Koçluk", c: "#3A4A2C" },
  ];
  return (
    <div className="rounded-2xl border border-[#E5E5E0] bg-white p-5">
      <div className="grid grid-cols-7 gap-2 text-center text-[10.5px] font-medium uppercase tracking-wider text-[#7A7A7F]">
        {days.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-2">
        {days.map((_, i) => (
          <div
            key={i}
            className="flex min-h-[88px] flex-col gap-1 rounded-lg bg-[#FAFAF7] p-1.5"
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

function ParentMock() {
  return (
    <div className="rounded-2xl border border-[#E5E5E0] bg-white p-5">
      <div className="text-[12px] font-medium uppercase tracking-wider text-[#7A7A7F]">
        Haftalık veli özeti · Berk
      </div>
      <ul className="mt-4 space-y-3 text-[13.5px]">
        <li className="flex justify-between">
          <span className="text-[#0E0E10]">Derse katılım</span>
          <span className="font-medium text-[#1E8C5C]">5 / 5</span>
        </li>
        <li className="flex justify-between">
          <span className="text-[#0E0E10]">Ödev tamamlama</span>
          <span className="font-medium text-[#1E8C5C]">%92</span>
        </li>
        <li className="flex justify-between">
          <span className="text-[#0E0E10]">Deneme net</span>
          <span className="font-medium text-[#0E0E10]">88 → 102</span>
        </li>
        <li className="flex justify-between">
          <span className="text-[#0E0E10]">Çalışma süresi</span>
          <span className="font-medium text-[#0E0E10]">14s 20dk</span>
        </li>
      </ul>
      <div className="mt-5 rounded-lg bg-[#F4F1E8] px-3 py-2 text-[12px] text-[#5A5A5F]">
        Hocadan not: <span className="text-[#0E0E10]">Geometri eksiklerine bu hafta odaklanıyoruz.</span>
      </div>
    </div>
  );
}
