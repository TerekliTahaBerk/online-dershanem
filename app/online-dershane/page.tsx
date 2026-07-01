import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { Container } from "@/components/ui/container";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { siteUrl } from "@/lib/content";

export const metadata: Metadata = {
  title: "Online Matematik Dershanesi | Butik Grup ve Gelişim Takibi",
  description:
    "En fazla 4 öğrencilik canlı matematik dersi, derste soru-cevap, ders sonrası çalışma yönü ve veliye kısa gelişim notu.",
  alternates: {
    canonical: "/online-dershane/"
  },
  openGraph: {
    title: "Online Matematik Dershanesi | Online Dershanem",
    description:
      "Küçük grupta canlı matematik dersi, ders sonrası çalışma yönü ve veliye kısa bilgilendirme notu.",
    url: `${siteUrl}/online-dershane/`
  }
};

export default function OnlineDershanePage() {
  return (
    <>
      <SchemaJsonLd
        schema={breadcrumbJsonLd([
          { name: "Ana Sayfa", url: "/" },
          { name: "Online Dershane", url: "/online-dershane/" },
        ])}
      />
      <Navbar />
      <main className="od-public bg-[var(--od-cream)] py-14 text-[var(--od-ink)] sm:py-20">
        <Container>
          <section className="rounded-[24px] border border-[var(--od-line)] bg-[var(--od-sky-soft)]/70 p-7 sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--od-olive)]">Online Matematik Dershanesi</p>
            <h1 className="mt-3 text-3xl font-bold tracking-normal text-[var(--od-ink)] sm:text-4xl">
              Online matematik dershanesi, öğrencinin derste kaybolmadığı kadar küçük olmalı.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[var(--od-ink-soft)] sm:text-base">
              Bu sistem klasik kalabalık online ders değil. Öğrenci matematikte en fazla
              4 öğrencilik küçük grupta ilerler; soru sorar, çözümünü gösterir ve
              ders sonunda ne çalışacağını bilir.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <LeadFunnelTrigger
                source="online_dershane_hero_cta"
                eventName="landing_cta_click"
                href="/#matematik-ders-paketi"
                className="inline-flex rounded-full bg-[var(--od-olive)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2E3B24]"
              >
                Ders Paketini İncele
              </LeadFunnelTrigger>
              <Link
                href="/#matematik-ders-paketi"
                className="inline-flex rounded-full border border-[var(--od-ink)]/15 bg-white px-6 py-3 text-sm font-semibold text-[var(--od-ink)]"
              >
                Fiyatı Gör
              </Link>
            </div>
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              "En fazla 4 öğrencilik matematik grubu ile derste bireysel temas",
              "Canlı ders, ödevlendirme ve öğretmen notu",
              "Veliye çocuğunun nerede zorlandığını anlatan kısa özet"
            ].map((item) => (
              <article key={item} className="rounded-2xl border border-[var(--od-line)] bg-white p-5 text-sm font-medium text-[var(--od-ink-soft)] shadow-[0_16px_40px_-34px_rgba(20,20,15,0.18)]">
                {item}
              </article>
            ))}
          </section>

          <section className="mt-8 rounded-[24px] border border-[var(--od-line)] bg-white p-6 shadow-[0_16px_40px_-34px_rgba(20,20,15,0.18)]">
            <h2 className="text-2xl font-bold tracking-normal text-[var(--od-ink)]">Online Matematik Dershanesi Kimler İçin Uygun?</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--od-ink-soft)]">
              <li>Matematikte tek başına çalışırken planını sürdüremeyen öğrenciler</li>
              <li>Derste soru sormaya ve çözümünü gösterebilmeye ihtiyaç duyan LGS ve YKS adayları</li>
              <li>Hafta sonunda ne çalışacağını bilmek isteyen öğrenciler</li>
            </ul>
          </section>

          <section className="mt-8 rounded-[24px] border border-[var(--od-line)] bg-[var(--od-mint)]/65 p-6">
            <h2 className="text-2xl font-bold tracking-normal text-[var(--od-ink)]">Matematik dersine başlamadan önce</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link href="/blog/online-dershane-nedir/" className="rounded-2xl border border-[var(--od-line)] bg-white p-4 text-sm font-semibold text-[var(--od-ink)]">
                Online dershane nedir?
              </Link>
              <Link href="/blog/online-ozel-ders-mi-dershane-mi/" className="rounded-2xl border border-[var(--od-line)] bg-white p-4 text-sm font-semibold text-[var(--od-ink)]">
                Online özel ders mi dershane mi?
              </Link>
            </div>
          </section>
        </Container>
      </main>
      <Footer />
    </>
  );
}
