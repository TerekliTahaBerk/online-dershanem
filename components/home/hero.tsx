import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PreMeetingLink } from "@/components/forms/pre-meeting-link";

/**
 * 02 HERO + 03 FACT LINE — mesaj solda, üç ürünün panel parçalarından
 * esinlenen örnek bir "haftalık akış" sağda.
 *
 * Başlıktaki üç cümle üç ürüne denk gelir; her cümlenin altındaki işaret
 * çizgisi o ürünün panel vurgusunu (`--pn-accent-*`) taşır ve sağdaki kartla
 * eşleşir: OD canlı ders odası, Yön haftalık plan şeridi, Deneme Ligi
 * kayıp nedeni analizi. Kartlar dekoratif örnektir; rakam/başarı oranı
 * iddiası taşımaz ve ekran okuyucuya tek bir açıklama olarak sunulur.
 */

/* Panel ürün vurgularıyla aynı değerler (globals.css `.pn-scope`). */
const accent = {
  od: { ink: "#0C7C57", soft: "#EDF7F2", marker: "#14976B", line: "#D9EBE3" },
  yon: { ink: "#0754C9", soft: "#E8F1FE", marker: "#0673F5", line: "#CADDF8" },
  dl: { ink: "#5B2599", soft: "#F1EAFA", marker: "#6C35AC", line: "#E1D3F2" },
} as const;

type AccentKey = keyof typeof accent;

const headline: { text: string; tone: AccentKey }[] = [
  { text: "Canlı derste öğren.", tone: "od" },
  { text: "Haftanı planla.", tone: "yon" },
  { text: "Denemeyle ölç.", tone: "dl" },
];

export function HomeHero() {
  return (
    <section className="relative overflow-hidden">
      <HeroBackdrop />

      <div className="site-container relative grid items-center gap-14 pb-16 pt-14 sm:pb-[80px] sm:pt-[80px] lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:gap-12">
        <div className="flex flex-col items-start">
          <p className="dc-eyebrow inline-flex items-center gap-2.5">
            <span className="flex gap-1" aria-hidden="true">
              {(Object.keys(accent) as AccentKey[]).map((key) => (
                <span
                  key={key}
                  className="h-2 w-2 rounded-full"
                  style={{ background: accent[key].marker }}
                />
              ))}
            </span>
            Ders · Koçluk · Deneme
          </p>

          <h1 className="mt-5 font-display text-(length:--public-display) leading-[1.08] tracking-[-0.03em] text-dc-ink">
            {headline.map(({ text, tone }) => (
              <span key={text} className="block">
                <span
                  className="bg-no-repeat pb-0.5 [background-position:0_88%] [background-size:100%_0.2em]"
                  style={{
                    backgroundImage: `linear-gradient(${accent[tone].marker}38, ${accent[tone].marker}38)`,
                  }}
                >
                  {text}
                </span>
              </span>
            ))}
          </h1>

          <p className="mt-6 max-w-[520px] text-[17px] leading-[1.65] text-dc-ink-body text-pretty sm:text-[18.5px]">
            LGS ve YKS için canlı ders, eğitim koçluğu ve online deneme. İhtiyacın
            olan ürünü tek başına veya birlikte kullan.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <Link
              href="/paketler"
              className="site-btn site-btn-primary site-btn-lg"
            >
              Paketini Oluştur
              <ArrowRight size={17} strokeWidth={2.2} aria-hidden="true" />
            </Link>
            <PreMeetingLink
              source="home_hero"
              className="site-btn site-btn-secondary site-btn-lg"
            />
          </div>

          {/* Doğrulanmış, somut bilgi — rakam/başarı oranı iddiası yok */}
          <dl className="mt-10 grid w-full max-w-[520px] grid-cols-2 gap-x-8 border-t border-dc-line pt-6">
            <div>
              <dt className="text-[15.5px] font-bold text-dc-ink sm:text-[16.5px]">
                Maks. 4 kişilik canlı grup
              </dt>
              <dd className="mt-0.5 text-[13.5px] text-dc-ink-faint">
                ya da birebir özel ders
              </dd>
            </div>
            <div>
              <dt className="text-[15.5px] font-bold text-dc-ink sm:text-[16.5px]">
                LGS ve YKS
              </dt>
              <dd className="mt-0.5 text-[13.5px] text-dc-ink-faint">
                denemede LGS, TYT, AYT
              </dd>
            </div>
          </dl>
        </div>

        <HeroFlow />
      </div>
    </section>
  );
}

/** Yumuşak üç renkli ışık + ince nokta ızgarası; yalnız dekor. */
function HeroBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(20,32,28,0.07) 1px, transparent 0)",
          backgroundSize: "26px 26px",
          maskImage:
            "radial-gradient(ellipse 70% 80% at 75% 45%, black 20%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 80% at 75% 45%, black 20%, transparent 75%)",
        }}
      />
      <div
        className="absolute right-[18%] top-[6%] h-[340px] w-[340px] rounded-full blur-[90px]"
        style={{ background: `${accent.od.marker}24` }}
      />
      <div
        className="absolute right-[-4%] top-[34%] h-[320px] w-[320px] rounded-full blur-[90px]"
        style={{ background: `${accent.yon.marker}1F` }}
      />
      <div
        className="absolute bottom-[-6%] right-[24%] h-[300px] w-[300px] rounded-full blur-[90px]"
        style={{ background: `${accent.dl.marker}1F` }}
      />
    </div>
  );
}

/**
 * Sağ kolon: üç ürünün panelden tanıdık parçaları, birbirine bağlı bir akış
 * olarak. Mobilde başlığın altında tek kolon; masaüstünde hafif kaydırmalı.
 */
function HeroFlow() {
  return (
    <figure
      aria-label="Örnek akış: canlı derste konu işlenir, koç haftalık plana ekler, deneme sonucunda puan kaybının nedeni görülür."
      className="relative mx-auto w-full max-w-[460px] lg:mr-0"
    >
      {/* Kartları bağlayan dikey akış çizgisi */}
      <span
        aria-hidden="true"
        className="absolute bottom-10 left-[27px] top-10 w-px"
        style={{
          background: `linear-gradient(${accent.od.marker}, ${accent.yon.marker}, ${accent.dl.marker})`,
          opacity: 0.35,
        }}
      />

      <div aria-hidden="true" className="relative flex flex-col gap-4">
        <LiveLessonCard />
        <div className="lg:translate-x-7">
          <WeekPlanCard />
        </div>
        <div className="lg:-translate-x-3">
          <LeagueResultCard />
        </div>
      </div>
    </figure>
  );
}

function FlowCard({
  tone,
  step,
  label,
  children,
}: {
  tone: AccentKey;
  step: string;
  label: string;
  children: ReactNode;
}) {
  const c = accent[tone];
  return (
    <div
      className="relative rounded-dc-card-sm border bg-white p-4 shadow-dc-canvas sm:p-[18px]"
      style={{ borderColor: c.line }}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className="grid h-[22px] w-[22px] place-items-center rounded-full font-mono text-[10.5px] font-bold text-white"
          style={{ background: c.marker }}
        >
          {step}
        </span>
        <span
          className="text-[12.5px] font-bold tracking-[-0.005em]"
          style={{ color: c.ink }}
        >
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

/** onlinedershanem. — canlı ders odası: tahta + en fazla dört katılımcı. */
function LiveLessonCard() {
  const c = accent.od;
  const people = ["E", "Z", "M", "A"];
  return (
    <FlowCard tone="od" step="1" label="onlinedershanem.">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-bold leading-tight text-dc-ink">
            Matematik · Üslü İfadeler
          </p>
          <p className="mt-1 text-[12.5px] text-dc-ink-faint">
            Canlı grup · 4 kişi
          </p>
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold"
          style={{ background: c.soft, color: c.ink }}
        >
          <span className="relative flex h-2 w-2">
            <span
              className="absolute inline-flex h-full w-full rounded-full opacity-60 motion-safe:animate-ping"
              style={{ background: c.marker }}
            />
            <span
              className="relative inline-flex h-2 w-2 rounded-full"
              style={{ background: c.marker }}
            />
          </span>
          Canlı
        </span>
      </div>

      <div className="mt-3.5 flex items-center gap-3">
        <div className="flex flex-1 flex-col gap-1.5 rounded-lg border border-dc-line-soft bg-dc-surface-muted px-3 py-2.5">
          <span className="h-1.5 w-[62%] rounded-full bg-[#CDE2D8]" />
          <span className="h-1.5 w-[84%] rounded-full bg-[#DCEAE3]" />
          <span
            className="h-1.5 w-[38%] rounded-full"
            style={{ background: c.marker }}
          />
        </div>
        <div className="flex -space-x-2">
          {people.map((p, i) => (
            <span
              key={p}
              className="grid h-8 w-8 place-items-center rounded-full border-2 border-white text-[11.5px] font-bold"
              style={{
                background: i === 0 ? c.marker : c.soft,
                color: i === 0 ? "#fff" : c.ink,
              }}
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    </FlowCard>
  );
}

/** Yön Koçluk — haftalık plan şeridi; bugün vurgulu, yeni görev plana eklenir. */
function WeekPlanCard() {
  const c = accent.yon;
  const days: { d: string; tasks: number; done: number; today?: boolean }[] = [
    { d: "Pzt", tasks: 3, done: 3 },
    { d: "Sal", tasks: 2, done: 2 },
    { d: "Çar", tasks: 3, done: 2, today: true },
    { d: "Per", tasks: 2, done: 0 },
    { d: "Cum", tasks: 3, done: 0 },
    { d: "Cmt", tasks: 2, done: 0 },
    { d: "Paz", tasks: 1, done: 0 },
  ];
  return (
    <FlowCard tone="yon" step="2" label="Yön Koçluk">
      <p className="text-[15px] font-bold leading-tight text-dc-ink">
        Bu haftanın planı
      </p>

      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {days.map(({ d, tasks, done, today }) => (
          <div
            key={d}
            className="flex flex-col items-center gap-1.5 rounded-lg px-0.5 py-2"
            style={
              today
                ? { background: c.soft, boxShadow: `inset 0 0 0 1.5px ${c.marker}` }
                : undefined
            }
          >
            <span
              className="text-[10.5px] font-semibold"
              style={{ color: today ? c.ink : "var(--dc-ink-faint)" }}
            >
              {d}
            </span>
            <span className="flex flex-col gap-1">
              {Array.from({ length: tasks }, (_, i) => (
                <span
                  key={i}
                  className="h-1.5 w-4 rounded-full"
                  style={{
                    background: i < done ? c.marker : "#DCE6F5",
                  }}
                />
              ))}
            </span>
          </div>
        ))}
      </div>

      <div
        className="mt-3 flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-[12.5px]"
        style={{ borderColor: c.line, color: c.ink }}
      >
        <span className="font-bold">+ Perşembe</span>
        <span className="text-dc-ink-body">Üslü İfadeler tekrar · 30 dk</span>
      </div>
    </FlowCard>
  );
}

/** Deneme Ligi — deneme sonucu: net yerine puan kaybının nedeni. */
function LeagueResultCard() {
  const c = accent.dl;
  const reasons = [
    { label: "Bilgi eksiği", width: "52%", color: c.marker },
    { label: "İşlem hatası", width: "30%", color: "#A684D3" },
    { label: "Süre", width: "18%", color: "#D9C8EE" },
  ];
  return (
    <FlowCard tone="dl" step="3" label="Deneme Ligi">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[15px] font-bold leading-tight text-dc-ink">
          TYT Matematik
        </p>
        <span className="text-[12.5px] text-dc-ink-faint">
          Kayıp nedeni
        </span>
      </div>

      <div className="mt-3 flex h-2.5 overflow-hidden rounded-full">
        {reasons.map((r) => (
          <span
            key={r.label}
            className="h-full"
            style={{ width: r.width, background: r.color }}
          />
        ))}
      </div>

      <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
        {reasons.map((r) => (
          <li
            key={r.label}
            className="flex items-center gap-1.5 text-[12px] font-medium text-dc-ink-body"
          >
            <span
              className="h-2 w-2 rounded-[3px]"
              style={{ background: r.color }}
            />
            {r.label}
          </li>
        ))}
      </ul>

      <div
        className="mt-3 flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-[12.5px]"
        style={{ background: c.soft }}
      >
        <span className="text-dc-ink-body">
          En çok kaybettiğin konu
        </span>
        <span className="font-bold" style={{ color: c.ink }}>
          Üslü İfadeler →
        </span>
      </div>
    </FlowCard>
  );
}
