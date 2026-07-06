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
      className={`grid items-center gap-10 overflow-hidden rounded-[36px] border border-[var(--site-line)] p-7 shadow-[0_24px_80px_-64px_rgba(20,20,15,0.28)] sm:p-10 lg:min-h-[520px] lg:grid-cols-2 lg:gap-16 lg:p-16 ${
        tone === "warm" ? "bg-[var(--brand-orange-tint)]" : "bg-[#fcfcfb]"
      }`}
    >
      <div className={reverse ? "lg:order-2" : ""}>
        <p className="site-eyebrow mb-4">{eyebrow}</p>
        <h3 className="font-display text-[clamp(2rem,3.8vw,3.25rem)] leading-[1.04] tracking-[-0.025em] text-[var(--site-ink)]">
          {title}
        </h3>
        <p className="mt-6 max-w-[44ch] text-[16px] leading-7 text-[var(--site-body)]">{body}</p>
        {cta ? <div className="mt-7">{cta.node}</div> : null}
      </div>

      <div className={`${reverse ? "lg:order-1" : ""} lg:scale-[1.06]`}>{visual}</div>
    </article>
  );
}
