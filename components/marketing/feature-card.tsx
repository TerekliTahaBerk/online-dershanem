import type { ReactNode } from "react";

type FeatureCardProps = {
  eyebrow: string;
  title: ReactNode;
  body: ReactNode;
  visual: ReactNode;
  /** Görseli sola al (varsayılan: sağda). */
  reverse?: boolean;
  cta?: { label: string; node: ReactNode };
  /** Kart zemini: beyaz (varsayılan) veya çok açık krem. */
  tone?: "plain" | "warm";
};

/**
 * Büyük, ince gri border'lı, yumuşak köşeli özellik kartı.
 * Sol metin + sağ görsel (mockup) düzeni; referanstaki feature kartlarına yakın.
 */
export function FeatureCard({
  eyebrow,
  title,
  body,
  visual,
  reverse = false,
  cta,
  tone = "plain",
}: FeatureCardProps) {
  return (
    <article
      className={`grid items-center gap-8 overflow-hidden rounded-[28px] border border-[var(--site-line)] p-6 shadow-[0_1px_2px_rgba(20,20,15,0.03)] sm:p-9 lg:grid-cols-2 lg:gap-14 lg:p-12 ${
        tone === "warm" ? "bg-[var(--site-bg-warm)]" : "bg-white"
      }`}
    >
      <div className={reverse ? "lg:order-2" : ""}>
        <p className="site-eyebrow mb-4">{eyebrow}</p>
        <h3 className="font-display text-[clamp(1.75rem,3.4vw,2.6rem)] leading-[1.08] tracking-[-0.02em] text-[var(--site-ink)]">
          {title}
        </h3>
        <p className="mt-5 max-w-[46ch] text-[15.5px] leading-7 text-[var(--site-body)]">{body}</p>
        {cta ? <div className="mt-7">{cta.node}</div> : null}
      </div>

      <div className={reverse ? "lg:order-1" : ""}>{visual}</div>
    </article>
  );
}
