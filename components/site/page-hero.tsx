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
        warm ? "border-b border-[var(--site-line)] bg-[var(--site-bg-warm)]" : "bg-[var(--site-bg)]"
      }
    >
      <div className={`site-container py-16 sm:py-24 ${centered ? "text-center" : ""}`}>
        {eyebrow ? <span className="site-eyebrow">{eyebrow}</span> : null}
        <h1
          className={`${eyebrow ? "mt-4" : ""} font-display text-[clamp(2.3rem,5.5vw,3.9rem)] leading-[1.04] text-[var(--site-ink)] ${
            centered ? "mx-auto max-w-3xl" : "max-w-3xl"
          }`}
        >
          {title}
        </h1>
        {subtitle ? (
          <p
            className={`mt-6 text-[17px] leading-8 text-[var(--site-body)] ${
              centered ? "mx-auto max-w-2xl" : "max-w-2xl"
            }`}
          >
            {subtitle}
          </p>
        ) : null}
        {actions ? (
          <div className={`mt-8 flex flex-wrap gap-3 ${centered ? "justify-center" : ""}`}>
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
