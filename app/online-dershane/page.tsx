import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PageHero } from "@/components/site/page-hero";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { siteUrl } from "@/lib/content";

export const metadata: Metadata = {
  title: "Online Matematik Dershanesi | Butik Grup ve Gelişim Takibi",
  description:
    "En fazla 4 öğrencilik canlı matematik dersi, derste soru-cevap, ders sonrası çalışma yönü ve veliye kısa gelişim notu.",
  alternates: {
    canonical: "/online-dershane"
  },
  openGraph: {
    title: "Online Matematik Dershanesi | Online Dershanem",
    description:
      "Küçük grupta canlı matematik dersi, ders sonrası çalışma yönü ve veliye kısa bilgilendirme notu.",
    url: `${siteUrl}/online-dershane`
  }
};

export default function OnlineDershanePage() {
  return (
    <div className="site-scope">
      <SchemaJsonLd
        schema={breadcrumbJsonLd([
          { name: "Ana Sayfa", url: "/" },
          { name: "Online Dershane", url: "/online-dershane/" },
        ])}
      />
      <SiteHeader />
      <main>
        <PageHero
          eyebrow="Online Matematik Dershanesi"
          align="left"
          title={
            <>
              Online matematik dershanesi, öğrencinin derste{" "}
              <span className="site-hl">kaybolmadığı</span> kadar küçük olmalı.
            </>
          }
          subtitle="Bu sistem klasik kalabalık online ders değil. Öğrenci matematikte en fazla 4 öğrencilik küçük grupta ilerler; soru sorar, çözümünü gösterir ve ders sonunda ne çalışacağını bilir."
          actions={
            <>
              <LeadFunnelTrigger
                source="online_dershane_hero_cta"
                eventName="landing_cta_click"
                href="/#matematik-ders-paketi"
                className="site-btn site-btn-primary site-btn-lg"
              >
                Ders Paketini İncele
              </LeadFunnelTrigger>
              <Link href="/paketler/" className="site-btn site-btn-secondary site-btn-lg">
                Fiyatı gör
              </Link>
            </>
          }
        />

        <section className="site-container py-16 sm:py-20">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              "En fazla 4 öğrencilik matematik grubu ile derste bireysel temas",
              "Canlı ders, ödevlendirme ve öğretmen notu",
              "Veliye çocuğunun nerede zorlandığını anlatan kısa özet",
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
              Online matematik dershanesi kimler için uygun?
            </h2>
            <ul className="mt-5 space-y-3">
              {[
                "Matematikte tek başına çalışırken planını sürdüremeyen öğrenciler",
                "Derste soru sormaya ve çözümünü gösterebilmeye ihtiyaç duyan LGS ve YKS adayları",
                "Hafta sonunda ne çalışacağını bilmek isteyen öğrenciler",
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
              Matematik dersine başlamadan önce
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link
                href="/blog/online-dershane-nedir/"
                className="group flex items-center justify-between gap-3 rounded-2xl border border-[var(--site-line)] bg-white p-5 text-[15px] font-semibold text-[var(--site-ink)] transition-colors hover:border-[var(--brand-orange)]"
              >
                Online dershane nedir?
                <ArrowRight size={17} className="shrink-0 text-[var(--brand-orange-ink)] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <Link
                href="/blog/online-ozel-ders-mi-dershane-mi/"
                className="group flex items-center justify-between gap-3 rounded-2xl border border-[var(--site-line)] bg-white p-5 text-[15px] font-semibold text-[var(--site-ink)] transition-colors hover:border-[var(--brand-orange)]"
              >
                Online özel ders mi dershane mi?
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
