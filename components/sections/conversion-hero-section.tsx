import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Container } from "@/components/ui/container";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";

const trustItems = [
  { value: "1.200+", label: "Öğrenci" },
  { value: "50+", label: "Uzman Eğitmen" },
  { value: "%98", label: "Memnuniyet" },
  { value: "30.000+", label: "Canlı Ders Saati" }
];

export function ConversionHeroSection() {
  return (
    <section className="relative overflow-hidden pb-12 pt-14 sm:pt-20 lg:pb-16">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_10%,_#d9efe5,_transparent_45%),radial-gradient(circle_at_90%_10%,_#e6f5ed,_transparent_38%),radial-gradient(circle_at_50%_90%,_#e8eceb,_transparent_45%)]" />
      <Container>
        <div className="max-w-5xl">
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl lg:text-6xl">
            YKS ve LGS'de ihtiyacın olan dersi seç, küçük grupta daha hızlı ilerle
          </h1>
          <p className="mt-5 max-w-4xl text-base leading-relaxed text-muted sm:text-lg">
            Toplu paket zorunluluğu yok. TYT-AYT ve LGS derslerini ihtiyacına göre tek tek seçersin; seviyene uygun küçük grupta
            canlı derse girer, haftalık takip ile düzenli ilerlersin.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <LeadFunnelTrigger
              source="hero_primary"
              eventName="hero_cta_click"
              className="inline-flex items-center justify-center rounded-full bg-anchor px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-pine"
            >
              Ücretsiz Deneme Dersi Al
            </LeadFunnelTrigger>
            <a
              href="#paket-karsilastirma"
              className="inline-flex items-center justify-center rounded-full border border-line-strong bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:bg-soft"
              data-analytics-id="hero_view_programs"
            >
              Paketleri ve Fiyatları Gör
            </a>
          </div>

          <p className="mt-3 text-xs text-muted">Gizli ücret yok. Başvuru 1 dakikadan kısa sürer. Kısa ön görüşmeyle sana uygun grup planını netleştiriyoruz.</p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/yks" className="rounded-full border border-line-strong bg-white px-4 py-1.5 text-xs font-semibold text-ink transition hover:bg-soft">
              TYT-AYT Paketleri
            </Link>
            <Link href="/lgs" className="rounded-full border border-line-strong bg-white px-4 py-1.5 text-xs font-semibold text-ink transition hover:bg-soft">
              LGS Paketleri
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-3 rounded-3xl border border-line bg-white p-4 shadow-soft sm:grid-cols-4 sm:p-6">
          {trustItems.map((item) => (
            <article key={item.label} className="rounded-2xl border border-line-soft bg-soft px-4 py-3 text-center">
              <p className="text-2xl font-bold tracking-tight text-ink">{item.value}</p>
              <p className="mt-1 text-xs font-semibold text-muted/80">{item.label}</p>
            </article>
          ))}
        </div>

        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-mint px-3 py-1 text-[11px] font-semibold text-pine">
          <ShieldCheck className="h-3.5 w-3.5" /> Öğrenci-veli süreci düzenli raporlanır ve ders kayıtları panelde saklanır.
        </div>
      </Container>
    </section>
  );
}
