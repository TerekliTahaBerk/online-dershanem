import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { hero } from "@/lib/site-content";

export function Hero() {
  return (
    <section className="overflow-hidden bg-white pb-16 pt-16 sm:pb-24 sm:pt-24">
      <div className="site-container text-center">
        <p className="site-kicker">Online Dershanem · Online Koçum · Online Deneme Kulübüm</p>
        <h1 className="mx-auto mt-5 max-w-[980px] text-[clamp(2.8rem,7vw,4.75rem)] font-semibold leading-[.98] tracking-[-.055em] text-[var(--site-ink)]">
          <span className="relative whitespace-nowrap"><span className="relative z-10">Ders, plan</span><span aria-hidden="true" className="absolute inset-x-0 bottom-1 z-0 h-3 bg-[var(--brand-yellow)] opacity-55 sm:h-4" /></span>{" "}
          ve deneme <span className="text-[var(--brand-olive)]">aynı hedef</span> için çalışsın.
        </h1>
        <p className="mx-auto mt-7 max-w-[700px] text-[17px] leading-8 text-[var(--site-body)] sm:text-[19px]">
          LGS ve YKS yolculuğunda <strong className="font-semibold text-[var(--site-ink)]">canlı ders</strong>,{" "}
          <strong className="font-semibold text-[var(--site-ink)]">kişisel çalışma düzeni</strong> ve{" "}
          <strong className="font-semibold text-[var(--site-ink)]">online deneme</strong> için üç açık ürün.
        </p>
        <div className="mx-auto mt-10 flex max-w-[760px] flex-wrap justify-center gap-2" aria-label="Desteklenen sınav düzeyleri">
          {["LGS", "YKS", "TYT", "AYT"].map((label) => (
            <span key={label} className="rounded-full border border-[var(--site-line)] bg-[var(--site-bg-warm)] px-4 py-2 text-[12px] font-bold text-[var(--site-body)]">{label}</span>
          ))}
        </div>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href={hero.primary.href} className="site-btn site-btn-primary site-btn-lg w-full sm:w-auto">
            Ürünleri keşfet <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <Link href={hero.secondary.href} className="site-btn site-btn-secondary site-btn-lg w-full sm:w-auto">
            Ücretsiz ön görüşme
          </Link>
        </div>
      </div>
    </section>
  );
}
