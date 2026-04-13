import Link from "next/link";
import { ShieldCheck, Sparkles } from "lucide-react";
import { Container } from "@/components/ui/container";

const trustItems = [
  { value: "1.200+", label: "Başarı yolculuğuna eşlik ettiğimiz öğrenci" },
  { value: "50+", label: "Sektörün en iyisi uzman eğitmen kadrosu" },
  { value: "%98", label: "Öğrenci ve veli memnuniyet oranı" },
  { value: "30.000+", label: "Tecrübeyle sabit canlı ders deneyimi" }
];

export function ConversionHeroSection() {
  return (
    <section className="relative overflow-hidden pb-14 pt-12 sm:pt-20 lg:pb-20">
      {/* Soft radial background */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_-10%_0%,_#d4ede3,_transparent_60%),radial-gradient(ellipse_60%_40%_at_110%_5%,_#e3f2ec,_transparent_55%),radial-gradient(ellipse_50%_60%_at_50%_100%,_#eaf0ed,_transparent_50%)]" />

      <Container>
        <div className="max-w-5xl">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-mint/30 px-3.5 py-1.5 text-xs font-semibold text-pine">
            <Sparkles className="h-3.5 w-3.5" />
            TYT · AYT · LGS — Türkiye'nin Her Şehrinden Online
          </div>

          {/* Headline */}
          <h1 className="mt-5 text-4xl font-bold leading-[1.18] tracking-tight text-ink sm:text-5xl lg:text-[3.5rem]">
            Sadece İhtiyacın Olan Derse Odaklan,{" "}
            <span className="text-brand">Hedefindeki Üniversiteyi/Liseyi</span> Şansa Bırakma.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            Toplu paket zorunluluğunu kaldırdık. TYT-AYT ve LGS yolculuğunda sadece eksik olduğun dersleri seç; seviyene uygun butik gruplarda, uzman eğitmenlerle başarıya ulaş.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="#seni-arayalim-formu"
              className="inline-flex items-center justify-center rounded-full bg-anchor px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_14px_-4px_rgba(9,20,19,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-pine hover:shadow-[0_6px_18px_-4px_rgba(9,20,19,0.4)]"
            >
              Hemen Formu Doldur, Seni Arayalım!
            </Link>
            <Link
              href="https://drive.google.com/file/d/164x3itpg_6l1-piwnCrevWM5Hz-SVhW5/view?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-line-strong bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:bg-soft"
              data-analytics-id="hero_view_programs"
            >
              Neden Buradayız?
            </Link>
          </div>

          <p className="mt-3 text-xs text-muted/80">Gizli ücret yok. Başvuru 1 dakikadan kısa sürer. Kısa ön görüşmeyle sana uygun grup planını netleştiriyoruz.</p>

          {/* Category pills */}
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/yks/" className="rounded-full border border-line-strong bg-white px-4 py-1.5 text-xs font-semibold text-ink transition hover:border-brand/40 hover:bg-soft hover:text-brand">
              TYT-AYT Paketleri
            </Link>
            <Link href="/lgs/" className="rounded-full border border-line-strong bg-white px-4 py-1.5 text-xs font-semibold text-ink transition hover:border-brand/40 hover:bg-soft hover:text-brand">
              LGS Paketleri
            </Link>
          </div>
        </div>

        {/* Trust grid */}
        <div className="mt-10 rounded-3xl border border-line bg-white/80 p-5 shadow-soft backdrop-blur-sm sm:p-6">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted/60">Rakamlarla Online Dershanem</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {trustItems.map((item, i) => (
              <article
                key={item.label}
                className={`rounded-2xl px-4 py-4 ${
                  i === 0 ? "bg-anchor text-white" : "border border-line-soft bg-soft"
                }`}
              >
                <p className={`text-2xl font-bold tracking-tight ${i === 0 ? "text-mint" : "text-ink"}`}>
                  {item.value}
                </p>
                <p className={`mt-1 text-xs font-medium leading-relaxed ${i === 0 ? "text-paper/70" : "text-muted/80"}`}>
                  {item.label}
                </p>
              </article>
            ))}
          </div>
        </div>

        {/* Trust badge */}
        <div className="mt-3 inline-flex w-full items-start gap-2 rounded-2xl bg-mint/50 px-3.5 py-2.5 text-[11px] font-semibold text-pine sm:w-auto sm:items-center sm:rounded-full sm:py-2">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 sm:mt-0" />
          Süreçten kopma! Detaylı öğrenci-veli raporlama sistemi ve geçmiş ders kayıtlarına 7/24 erişim imkanıyla her şey kontrolün altında.
        </div>
      </Container>
    </section>
  );
}
