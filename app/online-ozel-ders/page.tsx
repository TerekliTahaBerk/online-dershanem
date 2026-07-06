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
  title: "Online Matematik Özel Ders | Butik Küçük Grup Modeli",
  description:
    "Online matematik desteği arayanlar için en fazla 4 öğrencilik grup, derste soru-cevap ve ders sonrası çalışma yönü.",
  alternates: {
    canonical: "/online-ozel-ders"
  },
  openGraph: {
    title: "Online Matematik Özel Ders | Online Dershanem",
    description:
      "Matematikte öğrencinin seviyesine göre küçük grup desteği, ders içi soru-cevap ve veliye kısa gelişim notu.",
    url: `${siteUrl}/online-ozel-ders`
  }
};

export default function OnlineOzelDersPage() {
  return (
    <>
      <SchemaJsonLd
        schema={breadcrumbJsonLd([
          { name: "Ana Sayfa", url: "/" },
          { name: "Online Özel Ders", url: "/online-ozel-ders/" },
        ])}
      />
      <Navbar />
      <main className="od-public bg-[var(--od-cream)] py-14 text-[var(--od-ink)] sm:py-20">
        <Container>
          <section className="rounded-[24px] border border-[var(--od-line)] bg-[var(--od-blush)]/55 p-7 sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--od-olive)]">Online Matematik Özel Ders</p>
            <h1 className="mt-3 text-3xl font-bold tracking-normal text-[var(--od-ink)] sm:text-4xl">
              Özel derse yakın ilgi, küçük grubun temposuyla.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[var(--od-ink-soft)] sm:text-base">
              Matematikte öğrenci zorlandığı yerden başlar; en fazla 4 öğrencilik
              grupta daha çok soru-cevap alanı bulur ve ders sonunda ne çalışacağını bilir.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <LeadFunnelTrigger
                source="online_ozel_ders_hero_cta"
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
              "Canlı matematik dersi ve ders sonrası çalışma yönü",
              "En fazla 4 öğrencilik grupta daha yoğun soru-cevap alanı",
              "Ders sonrası öğretmen notu ve veliye kısa özet"
            ].map((item) => (
              <article key={item} className="rounded-2xl border border-[var(--od-line)] bg-white p-5 text-sm font-medium text-[var(--od-ink-soft)] shadow-[0_16px_40px_-34px_rgba(20,20,15,0.18)]">
                {item}
              </article>
            ))}
          </section>

          <section className="mt-8 rounded-[24px] border border-[var(--od-line)] bg-white p-6 shadow-[0_16px_40px_-34px_rgba(20,20,15,0.18)]">
            <h2 className="text-2xl font-bold tracking-normal text-[var(--od-ink)]">Hangi Öğrenciler İçin Daha Uygun?</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--od-ink-soft)]">
              <li>Matematikte belirli konularda hızlı toparlanma ihtiyacı olanlar</li>
              <li>Soru çözüm ve yanlış analizi desteğini artırmak isteyenler</li>
              <li>Ders sonunda belirli bir çalışma yönüyle devam etmek isteyen öğrenciler</li>
            </ul>
          </section>

          <section className="mt-8 rounded-[24px] border border-[var(--od-line)] bg-[var(--od-mint)]/65 p-6">
            <h2 className="text-2xl font-bold tracking-normal text-[var(--od-ink)]">İlgili Rehber Yazılar</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link href="/blog/online-ozel-ders-mi-dershane-mi/" className="rounded-2xl border border-[var(--od-line)] bg-white p-4 text-sm font-semibold text-[var(--od-ink)]">
                Online özel ders mi dershane mi?
              </Link>
              <Link href="/blog/yks-online-ders-calisma-plani/" className="rounded-2xl border border-[var(--od-line)] bg-white p-4 text-sm font-semibold text-[var(--od-ink)]">
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
