"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Quote } from "lucide-react";
import { stories } from "@/lib/site-content";

/**
 * Başarı hikayeleri — yatay scroll carousel. Sahte kişi fotoğrafı kullanılmaz;
 * baş harf/etiket tabanlı premium kartlar. Prev/next butonları erişilebilir.
 */
export function TestimonialsCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const amount = Math.min(el.clientWidth * 0.9, 380);
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  return (
    <section id="basari-hikayeleri" className="scroll-mt-24 bg-[var(--site-bg-warm)]">
      <div className="site-container py-20 sm:py-28">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="site-eyebrow">Başarı hikayeleri</p>
            <h2 className="mt-4 font-display text-[clamp(2rem,4.6vw,3.25rem)] leading-[1.08] tracking-[-0.02em] text-[var(--site-ink)]">
              Öğrenciler hedeflerine <span className="site-hl">bizimle</span> yaklaştı.
            </h2>
            <p className="mt-4 max-w-lg text-[15.5px] leading-7 text-[var(--site-body)]">
              Öğrenci ve veli deneyimlerinden derlenen kısa notlar. Süreci birlikte, düzenli ve
              görünür şekilde yürüttük.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              aria-label="Önceki hikayeler"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--site-line)] bg-white text-[var(--site-ink)] transition-colors hover:border-[var(--brand-orange)] hover:text-[var(--brand-orange-ink)]"
            >
              <ArrowLeft size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label="Sonraki hikayeler"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--site-line)] bg-white text-[var(--site-ink)] transition-colors hover:border-[var(--brand-orange)] hover:text-[var(--brand-orange-ink)]"
            >
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div
          ref={trackRef}
          className="site-scrollx mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2"
          tabIndex={0}
          role="region"
          aria-label="Başarı hikayeleri; yatay kaydırılabilir"
        >
          {stories.map((story, i) => (
            <article
              key={i}
              className="flex min-w-[85%] snap-start flex-col rounded-[24px] border border-[var(--site-line)] bg-white p-7 sm:min-w-[360px]"
            >
              <div className="flex h-32 items-end rounded-[18px] bg-[linear-gradient(135deg,var(--brand-orange-soft),var(--site-bg-warm))] p-5">
                <span className="rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-[var(--brand-orange-ink)] shadow-sm">
                  {story.tag}
                </span>
              </div>
              <Quote size={22} className="mt-6 text-[var(--brand-orange)]" aria-hidden="true" />
              <blockquote className="mt-3 min-h-[92px] text-[15px] leading-7 text-[var(--site-body)]">
                {story.quote}
              </blockquote>
              <div className="mt-5 border-t border-[var(--site-line)] pt-4">
                <div className="font-display text-[18px] text-[var(--site-ink)]">{story.name}</div>
                <div className="mt-0.5 text-[12.5px] text-[var(--site-muted)]">{story.detail}</div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
