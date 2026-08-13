import { ArrowRight } from "lucide-react";
import { hero } from "@/lib/site-content";
import { PublicBadge, PublicButton, PublicSection, TrustBand } from "@/components/public/primitives";

export function Hero() {
  return (
    <PublicSection space="hero" className="overflow-hidden">
      <div className="text-center">
        <p className="public-eyebrow">Online Dershanem · Online Koçum · Online Deneme Kulübüm</p>
        <h1 className="public-heading public-heading-display mx-auto max-w-[980px]">
          <span className="relative whitespace-nowrap"><span className="relative z-10">Ders, plan</span><span aria-hidden="true" className="absolute inset-x-0 bottom-1 z-0 h-3 bg-[var(--brand-yellow)] opacity-55 sm:h-4" /></span>{" "}
          ve deneme <span className="text-[var(--brand-olive)]">aynı hedef</span> için çalışsın.
        </h1>
        <p className="public-lede mx-auto max-w-[700px]">
          LGS ve YKS yolculuğunda <strong className="font-semibold text-[var(--site-ink)]">canlı ders</strong>,{" "}
          <strong className="font-semibold text-[var(--site-ink)]">kişisel çalışma düzeni</strong> ve{" "}
          <strong className="font-semibold text-[var(--site-ink)]">online deneme</strong> için üç açık ürün.
        </p>
        <div className="mx-auto mt-10 flex max-w-[760px] flex-wrap justify-center gap-2" aria-label="Desteklenen sınav düzeyleri">
          {["LGS", "YKS", "TYT", "AYT"].map((label) => (
            <PublicBadge key={label} tone="neutral">{label}</PublicBadge>
          ))}
        </div>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <PublicButton href={hero.primary.href} size="lg" mobileFull>
            Ürünleri keşfet <ArrowRight size={17} aria-hidden="true" />
          </PublicButton>
          <PublicButton href={hero.secondary.href} variant="secondary" size="lg" mobileFull>
            Ücretsiz ön görüşme
          </PublicButton>
        </div>
        <div className="mt-14 text-left sm:mt-20">
          <TrustBand title="Tek hedef için açık ve birleştirilebilir destek" items={[
            { value: "3", label: "ayrı eğitim ürünü" },
            { value: "LGS · YKS", label: "sınav yolculukları" },
            { value: "Tek", label: "öğrenme yönü" },
          ]} />
        </div>
      </div>
    </PublicSection>
  );
}
