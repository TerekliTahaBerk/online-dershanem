import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { Container } from "@/components/ui/container";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";
import { siteUrl } from "@/lib/content";

export const metadata: Metadata = {
  title: "Online Matematik Özel Ders | Butik Küçük Grup Modeli",
  description:
    "Online matematik özel ders: butik canlı dersler, matematik deneme kulübü ve haftalık takip ile matematikte net artışını hızlandır.",
  alternates: {
    canonical: "/online-ozel-ders/"
  },
  openGraph: {
    title: "Online Matematik Özel Ders | Online Dershanem",
    description:
      "Matematikte öğrencinin seviyesine göre ders planı, butik grup desteği ve veliye açık gelişim takibi.",
    url: `${siteUrl}/online-ozel-ders/`
  }
};

export default function OnlineOzelDersPage() {
  return (
    <>
      <Navbar />
      <main className="bg-[var(--od-cream)] text-[var(--od-ink)] py-14 sm:py-20">
        <Container>
          <section className="rounded-3xl border border-line bg-white p-7 shadow-soft sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">Online Matematik Özel Ders</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Online Matematik Özel Ders ile Eksik Konularına Odaklan
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
              Matematikte öğrenci, eksik olduğu konudan başlar; en fazla 4 kişilik butik grupta
              daha fazla soru çözüm desteği alır ve veliye açık haftalık gelişim takibiyle ilerler.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <LeadFunnelTrigger
                source="online_ozel_ders_hero_cta"
                eventName="landing_cta_click"
                className="inline-flex rounded-full bg-anchor px-6 py-3 text-sm font-semibold text-white"
              >
                Paketleri İncele
              </LeadFunnelTrigger>
              <Link
                href="/paketler/"
                className="inline-flex rounded-full border border-line-strong px-6 py-3 text-sm font-semibold text-ink"
              >
                Ders Bazlı Paketleri İncele
              </Link>
            </div>
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              "Matematikte deneme, canlı ders veya ikisini birlikte seçebilme",
              "Maksimum 4 kişilik matematik grubunda daha yoğun soru-cevap imkanı",
              "Ders sonrası kısa analiz ve haftalık matematik ilerleme kontrolü"
            ].map((item) => (
              <article key={item} className="rounded-2xl border border-line bg-white p-5 text-sm font-medium text-muted shadow-soft">
                {item}
              </article>
            ))}
          </section>

          <section className="mt-8 rounded-3xl border border-line bg-white p-6 shadow-soft">
            <h2 className="text-2xl font-bold tracking-tight text-ink">Hangi Öğrenciler İçin Daha Uygun?</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
              <li>Belirli derslerde hızlı toparlanma ihtiyacı olanlar</li>
              <li>Soru çözüm ve yanlış analizi desteğini artırmak isteyenler</li>
              <li>Haftalık hedeflerini ölçülebilir şekilde takip etmek isteyen öğrenciler</li>
            </ul>
          </section>

          <section className="mt-8 rounded-3xl border border-brand/30 bg-mint p-6">
            <h2 className="text-2xl font-bold tracking-tight text-ink">İlgili Rehber Yazılar</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link href="/blog/online-ozel-ders-mi-dershane-mi/" className="rounded-2xl border border-line bg-white p-4 text-sm font-semibold text-ink">
                Online özel ders mi dershane mi?
              </Link>
              <Link href="/blog/yks-online-ders-calisma-plani/" className="rounded-2xl border border-line bg-white p-4 text-sm font-semibold text-ink">
                YKS online ders çalışma planı
              </Link>
            </div>
          </section>
        </Container>
      </main>
      <Footer />
    </>
  );
}
