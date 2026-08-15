import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

/**
 * ÜRÜN SAYFASI ORTAK BÖLÜMLERİ — onaylı tasarım (Web.dc.html → isOD / isOK / isDK).
 *
 * Üç ürün sayfası da aynı iskeleti paylaşır: hero + görsel kart, akış kartları,
 * Dino AI bandı, "Bunu da eklediğinde ne değişir?" + tek ürün fiyat kartı,
 * SSS ve kapanış banner'ı. Bu yüzden bölümler burada bir kez yazılır.
 */

/** Tasarımdaki taralı yer tutucu panel (ekran görüntüsü gelene kadar). */
export function HatchPanel({
  label,
  className = "",
  height = "h-[330px]",
}: {
  label: ReactNode;
  className?: string;
  height?: string;
}) {
  return (
    <div
      className={`grid place-items-center rounded-xl text-center font-mono text-[11px] font-semibold leading-[1.6] text-[var(--dc-ink-faint)] ${height} ${className}`}
      style={{
        background: "repeating-linear-gradient(135deg,#E3EDE8 0 9px,#EDF4F0 9px 18px)",
      }}
    >
      {label}
    </div>
  );
}

export function ProductHero({
  eyebrow,
  title,
  body,
  tracks,
  note,
  secondaryCta = { label: "Ücretsiz Görüşme", href: "/iletisim/" },
  visual,
}: {
  eyebrow: string;
  title: string;
  body: string;
  tracks: readonly string[];
  note?: string;
  secondaryCta?: { label: string; href: string };
  visual: ReactNode;
}) {
  return (
    <section className="site-container pt-14 sm:pt-[72px]">
      <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
        <div>
          <p className="dc-eyebrow">{eyebrow}</p>
          <h1 className="mt-4 font-display text-[length:var(--public-display)] leading-[1.1] tracking-[-0.03em] text-dc-ink">
            {title}
          </h1>
          <p className="mt-4 max-w-[480px] text-[17px] leading-[1.65] text-dc-ink-body sm:text-[18px]">
            {body}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/paketler/" className="site-btn site-btn-primary site-btn-lg">
              Paketini Oluştur
            </Link>
            <Link
              href={secondaryCta.href}
              className="rounded-full border border-[#DDE4E0] bg-white px-6 py-[15px] text-[16px] font-bold text-dc-ink transition-colors hover:border-dc-brand"
            >
              {secondaryCta.label}
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3.5">
            {tracks.map((t) => (
              <span
                key={t}
                className="rounded-full bg-dc-brand-soft px-3.5 py-2 text-[13px] font-bold text-dc-brand-hover"
              >
                {t}
              </span>
            ))}
            {note ? <span className="text-[14px] text-dc-ink-muted">{note}</span> : null}
          </div>
        </div>

        <div>{visual}</div>
      </div>
    </section>
  );
}

/** Numaralı akış kartları — 3/4/5 kolonluk varyantlar tasarımda kullanılıyor. */
export function StepCards({
  title,
  steps,
  columns = 4,
}: {
  title: string;
  steps: readonly { title: string; body: string }[];
  columns?: 3 | 4 | 5;
}) {
  const grid =
    columns === 5
      ? "sm:grid-cols-2 lg:grid-cols-5"
      : columns === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <section className="site-container pt-[var(--dc-section-tight)]">
      <h2 className="max-w-[560px] font-display text-[length:var(--public-title)] leading-[1.1] tracking-[-0.025em] text-dc-ink">
        {title}
      </h2>
      <ol className={`mt-8 grid gap-4 ${grid}`}>
        {steps.map((s, i) => (
          <li
            key={s.title}
            className="rounded-[18px] border border-dc-line bg-white p-5 sm:p-[22px]"
          >
            <span
              className={`font-mono text-[11px] font-semibold ${
                i === 0 ? "text-dc-brand-strong" : "text-[var(--dc-ink-faint)]"
              }`}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-2.5 text-[17px] font-bold text-dc-ink sm:text-[18px]">
              {s.title}
            </h3>
            <p className="mt-2 text-[14.5px] leading-[1.6] text-dc-ink-muted">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Dino AI bandı — solda metin, sağda maskotlu örnek kart. */
export function ProductDinoBand({
  eyebrow,
  title,
  body,
  quote,
  quoteBody,
  onWhite = false,
}: {
  eyebrow: string;
  title: string;
  body: string;
  quote: string;
  quoteBody: string;
  onWhite?: boolean;
}) {
  const inner = (
    <div className="site-container grid items-center gap-10 lg:grid-cols-2">
      <div>
        <p className="dc-eyebrow">{eyebrow}</p>
        <h2 className="mt-3.5 font-display text-[28px] leading-[1.14] tracking-[-0.02em] text-dc-ink sm:text-[36px]">
          {title}
        </h2>
        <p className="mt-3.5 text-[16.5px] leading-[1.65] text-dc-ink-body">{body}</p>
      </div>

      <div className="flex items-center gap-4 rounded-[20px] border border-dc-brand-soft-line bg-dc-brand-soft p-5 sm:gap-[18px] sm:p-6">
        <Image
          src="/design/dino-mascot.png"
          alt=""
          aria-hidden="true"
          width={1319}
          height={1193}
          sizes="96px"
          className="w-[72px] flex-none sm:w-24"
        />
        <div>
          <p className="text-[17px] font-bold text-dc-brand-deep">{quote}</p>
          <p className="mt-2 text-[14.5px] leading-[1.6] text-[#3F5C51]">{quoteBody}</p>
          <p className="mt-2.5 text-[12px] font-medium text-[var(--dc-ink-muted)]">
            Örnek metin — gerçek çıktı öğrencinin kendi verisinden üretilir.
          </p>
        </div>
      </div>
    </div>
  );

  return onWhite ? (
    <section className="border-y border-dc-line-soft bg-white py-[var(--dc-section-tight)]">
      {inner}
    </section>
  ) : (
    <section className="pt-[var(--dc-section-tight)]">{inner}</section>
  );
}

/**
 * "Bunu da eklediğinde ne değişir?" + tek ürün fiyat kartı.
 *
 * Fiyat `priceLabel` ile dışarıdan verilir; tanımlı değilse rakam basılmaz
 * (tasarımdaki "X TL / Y TL / Z TL" yer tutucudur — §54).
 */
export function CrossSellWithPrice({
  cards,
  advantageNote,
  price,
  priceSuffix,
  features,
  priceFootnote,
}: {
  cards: readonly { eyebrow: string; title: string; body: string }[];
  advantageNote: string;
  /** `null` ise rakam basılmaz. `listPrice` yalnızca gerçek liste fiyatıdır. */
  price: { price: string; listPrice: string | null } | null;
  priceSuffix: string;
  features: readonly string[];
  priceFootnote: string;
}) {
  return (
    <section className="site-container grid items-start gap-6 pt-[var(--dc-section-tight)] lg:grid-cols-[1fr_400px]">
      <div>
        <h2 className="font-display text-[28px] leading-[1.12] tracking-[-0.02em] text-dc-ink sm:text-[36px]">
          Bunu da eklediğinde ne değişir?
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {cards.map((c) => (
            <div
              key={c.eyebrow}
              className="rounded-[18px] border border-dc-line bg-white p-5 sm:p-[22px]"
            >
              <p className="font-mono text-[11px] font-semibold uppercase text-dc-brand-strong">
                {c.eyebrow}
              </p>
              <h3 className="mt-2.5 text-[19px] font-bold text-dc-ink">{c.title}</h3>
              <p className="mt-2 text-[14.5px] leading-[1.6] text-dc-ink-muted">{c.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-4.5 pt-4 text-[15px] font-semibold text-dc-brand-hover">
          {advantageNote}
        </p>
      </div>

      <aside className="rounded-dc-card border-2 border-dc-brand bg-white p-6 shadow-[0_12px_30px_rgba(20,151,107,.10)]">
        <p className="font-mono text-[11px] font-semibold uppercase text-[var(--dc-ink-faint)]">
          Tek ürün fiyatı
        </p>

        {price ? (
          <>
            {price.listPrice ? (
              <p className="mt-2 flex items-center gap-2">
                <span className="text-[15px] font-semibold text-dc-ink-faint line-through">
                  {price.listPrice}
                </span>
                <span className="rounded-full bg-dc-brand-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-dc-brand-hover">
                  İndirimli
                </span>
              </p>
            ) : null}
            <p className="mt-2.5 flex items-baseline gap-2">
              <span className="font-display text-[40px] tracking-[-0.02em] text-dc-ink">
                {price.price}
              </span>
              <span className="text-[14px] font-medium text-dc-ink-faint">{priceSuffix}</span>
            </p>
          </>
        ) : (
          <p className="mt-2.5 text-[15px] font-semibold leading-[1.5] text-dc-ink">
            Fiyat ön görüşmede netleşir
          </p>
        )}

        <div className="my-4.5 h-px bg-dc-line-soft" />

        <ul className="flex flex-col gap-2 text-[14.5px] font-medium text-[var(--pd-ink-3)]">
          {features.map((f) => (
            <li key={f}>✓ {f}</li>
          ))}
        </ul>

        <Link href="/paketler/" className="site-btn site-btn-primary mt-5 w-full">
          Paketini Oluştur
        </Link>
        <p className="mt-2.5 text-center text-[12.5px] font-medium text-dc-ink-faint">
          {priceFootnote}
        </p>
      </aside>
    </section>
  );
}

export function ProductFaq({
  items,
  title = "Sık sorulanlar",
}: {
  items: readonly { q: string; a: string }[];
  title?: string;
}) {
  return (
    <section className="site-container grid gap-10 pt-[var(--dc-section-tight)] lg:grid-cols-[340px_1fr] lg:gap-12">
      <h2 className="font-display text-[28px] leading-[1.1] tracking-[-0.02em] text-dc-ink sm:text-[34px]">
        {title}
      </h2>
      <div className="flex flex-col gap-2.5">
        {items.map(({ q, a }) => (
          <details
            key={q}
            className="dc-faq rounded-dc-card-sm border border-dc-line bg-white px-5 py-[18px]"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-bold text-dc-ink">
              {q}
              <span
                aria-hidden="true"
                className="dc-faq-plus flex-none text-[20px] font-normal leading-none text-dc-brand-strong transition-transform"
              >
                +
              </span>
            </summary>
            <p className="mt-3 text-[15px] leading-[1.65] text-dc-ink-muted">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function ProductClosingCta({
  title,
  body,
  variant = "soft",
}: {
  title: string;
  body: string;
  variant?: "soft" | "deep";
}) {
  const deep = variant === "deep";
  return (
    <section className="site-container pb-[var(--dc-section-tight)] pt-[var(--dc-section-tight)]">
      <div
        className={`flex flex-col items-start gap-8 rounded-dc-banner px-8 py-12 sm:px-14 lg:flex-row lg:items-center ${
          deep ? "bg-dc-brand-deep" : "border border-dc-brand-soft-line bg-dc-brand-soft"
        }`}
      >
        <div className="flex-1">
          <h2
            className={`font-display text-[28px] leading-[1.14] tracking-[-0.02em] sm:text-[34px] ${
              deep ? "text-white" : "text-dc-brand-deep"
            }`}
          >
            {title}
          </h2>
          <p
            className={`mt-3 max-w-[560px] text-[16px] leading-[1.65] ${
              deep ? "text-[#B6CEC4]" : "text-[#3F5C51]"
            }`}
          >
            {body}
          </p>
        </div>
        <Link
          href="/paketler/"
          className={
            deep
              ? "flex-none rounded-full bg-white px-[30px] py-[17px] text-[16px] font-bold text-dc-brand-deep transition-opacity hover:opacity-90"
              : "site-btn site-btn-primary site-btn-lg flex-none"
          }
        >
          Paketini Oluştur →
        </Link>
      </div>
    </section>
  );
}
