"use client";

import { useRef } from "react";
import { ArrowLeft, ArrowRight, Target } from "lucide-react";
import { stories } from "@/lib/site-content";

export function TestimonialsCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const move = (direction: 1 | -1) =>
    trackRef.current?.scrollBy({
      left: direction * 420,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });

  return (
    <section id="ogrenci-deneyimi" className="scroll-mt-24 overflow-hidden bg-white py-24 sm:py-36">
      <div className="site-container text-center">
        <p className="site-eyebrow justify-center">Örnek öğrenci deneyimi</p>
        <h2 className="mt-4 font-display text-[clamp(2.65rem,5.6vw,5.25rem)] leading-[.98] text-[var(--site-ink)]">Model öğrenciye nasıl yansır?</h2>
        <p className="mx-auto mt-5 max-w-2xl text-[15.5px] leading-7 text-[var(--site-body)] sm:text-[17px]">
          Bunlar müşteri yorumu değil; küçük grup ve düzenli takip modelinin günlük çalışmada hedeflediği somut senaryolardır.
        </p>
        <div className="mt-7 flex justify-center gap-2">
          <button type="button" onClick={() => move(-1)} aria-label="Önceki hikayeler" className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--site-line)] bg-white"><ArrowLeft size={18} aria-hidden="true" /></button>
          <button type="button" onClick={() => move(1)} aria-label="Sonraki hikayeler" className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--site-line)] bg-white"><ArrowRight size={18} aria-hidden="true" /></button>
        </div>
      </div>

      <div ref={trackRef} className="site-scrollx mt-14 flex snap-x snap-mandatory gap-5 overflow-x-auto px-[max(20px,calc((100vw-1480px)/2+48px))] pb-4" tabIndex={0} role="region" aria-label="Örnek öğrenci senaryoları; yatay kaydırılabilir">
        {stories.map((story, index) => (
          <article key={`${story.title}-${index}`} className="min-w-[82vw] snap-start sm:min-w-[360px] lg:min-w-[390px]">
            <div className="relative flex h-[320px] items-end overflow-hidden rounded-[28px] border border-[var(--site-line)] bg-[linear-gradient(145deg,var(--brand-orange-soft),#fff_58%,var(--brand-orange-tint))] p-6">
              <div aria-hidden="true" className="absolute -right-8 -top-12 h-56 w-56 rounded-full border-[42px] border-white/70" />
              <div aria-hidden="true" className="absolute left-7 top-8 font-display text-[112px] leading-none text-[var(--brand-orange)]/10">“</div>
              <span className="relative rounded-full bg-[var(--brand-orange)] px-4 py-2 text-[12px] font-semibold text-white">{story.tag}</span>
            </div>
            <Target size={20} className="mt-6 text-[var(--brand-orange)]" aria-hidden="true" />
            <h3 className="mt-3 font-display text-[21px] text-[var(--site-ink)]">{story.title}</h3>
            <p className="mt-3 min-h-[84px] text-[15px] leading-7 text-[var(--site-body)]">{story.body}</p>
            <p className="mt-1 text-[13px] text-[var(--site-muted)]">{story.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
