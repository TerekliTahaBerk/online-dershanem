import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { Container } from "@/components/ui/container";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";
import { siteUrl } from "@/lib/content";

export const metadata: Metadata = {
  title: "Online Matematik Dershanesi | Butik Grup ve Gelişim Takibi",
  description:
    "Online matematik dershanesi: en fazla 4 kişilik butik grup, canlı matematik dersi, ders sonrası takip ve veliye açık bilgilendirmeyle matematikte düzenli ilerleme.",
  alternates: {
    canonical: "/online-dershane/"
  },
  openGraph: {
    title: "Online Matematik Dershanesi | Online Dershanem",
    description:
      "Butik grupta canlı matematik dersi, ders sonrası takip ve veliye açık bilgilendirme modeli.",
    url: `${siteUrl}/online-dershane/`
  }
};

export default function OnlineDershanePage() {
  return (
    <>
      <Navbar />
      <main className="bg-[var(--od-cream)] text-[var(--od-ink)] py-14 sm:py-20">
        <Container>
          <section className="rounded-3xl border border-line bg-white p-7 shadow-soft sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">Online Matematik Dershanesi</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Online Matematik Dershanesiyle Kalabalıktan Çık, Net Artışını Hızlandır
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
              Bu sistem klasik kalabalık online ders değil. Öğrenci matematikte en fazla 4 kişilik butik grupta ilerler,
              ders sonrası yönlendirme ve veliye açık gelişim takibiyle desteklenir.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <LeadFunnelTrigger
                source="online_dershane_hero_cta"
                eventName="landing_cta_click"
                href="/#matematik-ders-paketi"
                className="inline-flex rounded-full bg-anchor px-6 py-3 text-sm font-semibold text-white"
              >
                Matematik Dersini İncele
              </LeadFunnelTrigger>
              <Link
                href="/#matematik-ders-paketi"
                className="inline-flex rounded-full border border-line-strong px-6 py-3 text-sm font-semibold text-ink"
              >
                Ders Paketini Gör
              </Link>
            </div>
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              "Maksimum 4 kişilik butik matematik grubu ile bireysel geri bildirim",
              "Canlı ders, ödevlendirme ve öğretmen geri bildirimi",
              "Veliye açık matematik gelişim bilgilendirmesi"
            ].map((item) => (
              <article key={item} className="rounded-2xl border border-line bg-white p-5 text-sm font-medium text-muted shadow-soft">
                {item}
              </article>
            ))}
          </section>

          <section className="mt-8 rounded-3xl border border-line bg-white p-6 shadow-soft">
            <h2 className="text-2xl font-bold tracking-tight text-ink">Online Matematik Dershanesi Kimler İçin Uygun?</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
              <li>Matematikte tek başına çalışırken planını sürdüremeyen öğrenciler</li>
              <li>Matematikte eksik konuları biriken LGS ve YKS adayları</li>
              <li>Matematikte düzenli takip ve net hedefleriyle ilerlemek isteyenler</li>
            </ul>
          </section>

          <section className="mt-8 rounded-3xl border border-brand/30 bg-mint p-6">
            <h2 className="text-2xl font-bold tracking-tight text-ink">Matematik dersine başlamadan önce</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link href="/blog/online-dershane-nedir/" className="rounded-2xl border border-line bg-white p-4 text-sm font-semibold text-ink">
                Online dershane nedir?
              </Link>
              <Link href="/blog/online-ozel-ders-mi-dershane-mi/" className="rounded-2xl border border-line bg-white p-4 text-sm font-semibold text-ink">
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
