import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { Container } from "@/components/ui/container";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";
import { siteUrl } from "@/lib/content";

export const metadata: Metadata = {
  title: "Online Özel Ders | Ders Bazlı Küçük Grup Modeli",
  description:
    "Online özel ders yaklaşımında ders bazlı seçim, küçük grup etkileşimi ve haftalık takip ile hedef odaklı net artışını hızlandır.",
  alternates: {
    canonical: "/online-ozel-ders/"
  },
  openGraph: {
    title: "Online Özel Ders | Online Dershanem",
    description:
      "Online özel ders modelinde öğrencinin seviyesine göre ders planı, küçük grup desteği ve düzenli performans takibi.",
    url: `${siteUrl}/online-ozel-ders/`
  }
};

export default function OnlineOzelDersPage() {
  return (
    <>
      <Navbar />
      <main className="py-14 sm:py-20">
        <Container>
          <section className="rounded-3xl border border-line bg-white p-7 shadow-soft sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">Online Özel Ders</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Online Özel Ders ile İhtiyacın Olan Derse Odaklan
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
              Online özel ders modelinde öğrenci gereksiz toplu pakete girmez. Hangi derste eksik varsa o dersten başlar,
              küçük grupta daha fazla soru çözüm desteği alır ve haftalık performans raporuyla ilerler.
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
              "Matematik, fizik, kimya, biyoloji veya LGS derslerini ayrı seçebilme",
              "Maksimum 4 kişilik sınıfta daha yoğun soru-cevap imkanı",
              "Ders sonrası kısa analiz ve haftalık ilerleme kontrolü"
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
