import type { ReactNode } from "react";

type PageHeroProps = {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** CTA butonları vb. */
  actions?: ReactNode;
  align?: "center" | "left";
  /** Alt ayraç + krem zemin (varsayılan açık). */
  warm?: boolean;
};

/**
 * İkincil sayfalar için ortak hero — yeni public site dili:
 * küçük eyebrow etiketi + büyük serif başlık + sakin gövde metni.
 * Renkler `--site-*` / `--brand-*` tokenlarından gelir (marka yeşili).
 */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  actions,
  align = "center",
  warm = true,
}: PageHeroProps) {
  const centered = align === "center";
  return (
    <section
      className={
        warm
          ? "border-b border-dc-line-soft bg-dc-canvas"
          : "bg-dc-canvas"
      }
    >
      <div
        className={`site-container py-(--dc-section-tight) ${centered ? "text-center" : ""}`}
      >
        {eyebrow ? <span className="dc-eyebrow">{eyebrow}</span> : null}
        <h1
          className={`${eyebrow ? "mt-4" : ""} font-display text-(length:--public-display) leading-[1.08] tracking-[-0.03em] text-dc-ink ${
            centered ? "mx-auto max-w-3xl" : "max-w-3xl"
          }`}
        >
          {title}
        </h1>
        {subtitle ? (
          <p
            className={`mt-6 text-[17px] leading-[1.65] text-dc-ink-body ${
              centered ? "mx-auto max-w-2xl" : "max-w-2xl"
            }`}
          >
            {subtitle}
          </p>
        ) : null}
        {actions ? (
          <div
            className={`mt-8 flex flex-wrap gap-3 ${centered ? "justify-center" : ""}`}
          >
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
