import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PageHero } from "@/components/site/page-hero";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  title: "Online Matematik Özel Ders",
  description:
    "Online matematik özel ders alternatifi: en fazla 4 öğrencilik canlı grup, yoğun soru-cevap, öğretmen geri bildirimi ve ders sonrası çalışma yönü.",
  canonical: "/online-ozel-ders",
});

export default function OnlineOzelDersPage() {
  return (
    <div className="site-scope">
      <SchemaJsonLd
        schema={breadcrumbJsonLd([
          { name: "Ana Sayfa", url: "/" },
          { name: "Online Matematik Özel Ders", url: "/online-ozel-ders/" },
        ])}
      />
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <PageHero
          eyebrow="Online Matematik Özel Ders"
          align="left"
          title={
            <>
              Özel derse yakın <span className="site-hl">ilgi</span>, küçük grubun temposuyla.
            </>
          }
          subtitle="Matematikte öğrenci zorlandığı yerden başlar; en fazla 4 öğrencilik grupta daha çok soru-cevap alanı bulur ve ders sonunda ne çalışacağını bilir."
          actions={
            <>
              <Link href="/ders-paketleri" className="site-btn site-btn-primary site-btn-lg">
                Paketleri incele
              </Link>
              <LeadFunnelTrigger
                source="online_ozel_ders_hero_cta"
                eventName="landing_cta_click"
                className="site-btn site-btn-secondary site-btn-lg"
              >
                Ücretsiz görüşme
              </LeadFunnelTrigger>
            </>
          }
        />

        <section className="site-container py-16 sm:py-20">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              "Canlı matematik dersi ve ders sonrası çalışma yönü",
              "En fazla 4 öğrencilik grupta daha yoğun soru-cevap alanı",
              "Ders sonrası öğretmen notu ve veliye kısa özet",
            ].map((item) => (
              <article
                key={item}
                className="flex items-start gap-3 rounded-[22px] border border-[var(--site-line)] bg-white p-6 text-[15px] font-medium leading-6 text-[var(--site-body)]"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-orange-soft)] text-[var(--brand-orange-ink)]">
                  <Check size={13} strokeWidth={2.5} aria-hidden="true" />
                </span>
                {item}
              </article>
            ))}
          </div>

          <div className="mt-4 rounded-[24px] border border-[var(--site-line)] bg-white p-7 sm:p-9">
            <h2 className="font-display text-[clamp(1.6rem,3vw,2.2rem)] leading-tight tracking-[-0.02em] text-[var(--site-ink)]">
              Hangi öğrenciler için daha uygun?
            </h2>
            <ul className="mt-5 space-y-3">
              {[
                "Matematikte belirli konularda hızlı toparlanma ihtiyacı olanlar",
                "Soru çözüm ve yanlış analizi desteğini artırmak isteyenler",
                "Ders sonunda belirli bir çalışma yönüyle devam etmek isteyen öğrenciler",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15.5px] leading-7 text-[var(--site-body)]">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[var(--brand-orange-ink)]" strokeWidth={2.4} aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 rounded-[24px] border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-7 sm:p-9">
            <h2 className="font-display text-[clamp(1.6rem,3vw,2.2rem)] leading-tight tracking-[-0.02em] text-[var(--site-ink)]">
              İlgili rehber yazılar
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link
                href="/matematik"
                className="group flex items-center justify-between gap-3 rounded-2xl border border-[var(--site-line)] bg-white p-5 text-[15px] font-semibold text-[var(--site-ink)] transition-colors hover:border-[var(--brand-orange)]"
              >
                Online matematik dersi rehberi
                <ArrowRight size={17} className="shrink-0 text-[var(--brand-orange-ink)] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <Link
                href="/blog/online-ozel-ders-mi-dershane-mi"
                className="group flex items-center justify-between gap-3 rounded-2xl border border-[var(--site-line)] bg-white p-5 text-[15px] font-semibold text-[var(--site-ink)] transition-colors hover:border-[var(--brand-orange)]"
              >
                Online özel ders mi dershane mi?
                <ArrowRight size={17} className="shrink-0 text-[var(--brand-orange-ink)] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <Link
                href="/blog/yks-online-ders-calisma-plani"
                className="group flex items-center justify-between gap-3 rounded-2xl border border-[var(--site-line)] bg-white p-5 text-[15px] font-semibold text-[var(--site-ink)] transition-colors hover:border-[var(--brand-orange)]"
              >
                YKS online ders çalışma planı
                <ArrowRight size={17} className="shrink-0 text-[var(--brand-orange-ink)] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
