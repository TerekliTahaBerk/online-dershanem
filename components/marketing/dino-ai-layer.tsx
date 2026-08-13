import { Bot, BrainCircuit, Sparkles } from "lucide-react";
import {
  publicProducts,
  sharedIntelligenceLayer,
} from "@/lib/product-architecture";

const signals = [
  "Ders geri bildirimi",
  "Haftalık çalışma planı",
  "Deneme ve kazanım analizi",
] as const;

export function DinoAiLayer() {
  return (
    <section className="bg-[var(--site-bg-warm)] py-20 sm:py-28">
      <div className="site-container">
        <div className="overflow-hidden rounded-[32px] border border-[var(--site-line)] bg-[var(--site-ink)] px-6 py-10 text-white sm:px-10 sm:py-14 lg:px-14">
          <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
            <div>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[var(--brand-yellow)]">
                <BrainCircuit size={23} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <p className="mt-7 text-[12px] font-bold uppercase tracking-[.12em] text-[var(--brand-yellow)]">
                Ortak zekâ katmanı
              </p>
              <h2 className="mt-4 text-[clamp(2.5rem,5vw,4rem)] font-semibold leading-[1.02] tracking-[-.05em]">
                {sharedIntelligenceLayer.name}, üç ürünün arasında bağ kurar.
              </h2>
              <p className="mt-6 max-w-2xl text-[16px] leading-8 text-white/70">
                {sharedIntelligenceLayer.description}
              </p>
            </div>

            <div className="rounded-[26px] border border-white/10 bg-white/[.06] p-5 sm:p-7">
              <div className="space-y-3">
                {signals.map((signal, index) => (
                  <div
                    key={signal}
                    className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[.04] px-4 py-4"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[var(--brand-yellow)]">
                      {index === 2 ? (
                        <Sparkles size={17} aria-hidden="true" />
                      ) : (
                        <Bot size={17} aria-hidden="true" />
                      )}
                    </span>
                    <span className="text-[14px] font-medium text-white/85">{signal}</span>
                  </div>
                ))}
              </div>
              <div className="my-5 flex items-center gap-3" aria-hidden="true">
                <span className="h-px flex-1 bg-white/10" />
                <span className="text-[11px] font-bold uppercase tracking-[.1em] text-white/45">Dino AI</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>
              <div className="flex flex-wrap gap-2" aria-label="Dino AI ile çalışan ürünler">
                {publicProducts.map((product) => (
                  <span key={product.slug} className="rounded-full bg-white px-3 py-2 text-[12px] font-semibold text-[var(--site-ink)]">
                    {product.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
