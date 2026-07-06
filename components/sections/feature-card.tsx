import type { ReactNode } from "react";

export function FeatureCard({ eyebrow, title, body, visual, reverse = false }: {
  eyebrow: string;
  title: ReactNode;
  body: string;
  visual: ReactNode;
  reverse?: boolean;
}) {
  return (
    <article className="grid min-h-[520px] overflow-hidden rounded-2xl border border-[var(--od-line)] bg-[var(--od-paper)] lg:grid-cols-2">
      <div className={`flex flex-col justify-center p-8 sm:p-12 lg:p-16 ${reverse ? "lg:order-2" : ""}`}>
        <span className="text-sm font-semibold text-[var(--od-olive-soft)]">{eyebrow}</span>
        <h3 className="mt-5 font-display text-4xl leading-[1.02] sm:text-6xl">{title}</h3>
        <p className="mt-6 max-w-lg leading-7 text-[var(--od-ink-soft)]">{body}</p>
      </div>
      <div className={`flex min-h-[320px] items-end justify-center bg-gradient-to-br from-[#f8f7f3] to-[#efede7] p-6 sm:p-10 ${reverse ? "lg:order-1" : ""}`}>
        {visual}
      </div>
    </article>
  );
}
