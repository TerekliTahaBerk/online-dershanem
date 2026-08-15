import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { ProductClosingCta } from "@/components/product/product-sections";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  title: "Hakkımızda | Öğrenciyi yalnız bırakmayan bir sistem",
  description:
    "Online Dershanem canlı dersle başladı. Bugün ders, koçluk ve deneme analizi aynı çatı altında; üçü birbirinden haberdar çalışıyor.",
  canonical: "/hakkimizda/",
});

const principles = [
  {
    title: "Küçük grup, gerçek etkileşim",
    body: "Kalabalık sınıf yerine maks. 4 kişilik canlı gruplar; öğretmen her öğrenciyle ilgilenebiliyor.",
  },
  {
    title: "İnsan koç merkezde",
    body: "Planı kuran, öğrenciyi tanıyan ve sorumluluk alan bir insan. Yapay zekâ bu işi devralmıyor.",
  },
  {
    title: "Ölçmeden ilerlemiyoruz",
    body: "Deneme sonucu bir not değil, sıradaki adımın gerekçesi. Veli de aynı resmi görüyor.",
  },
];

/**
 * HAKKIMIZDA — onaylı tasarım (Web.dc.html → isAbout).
 *
 * BİLİNÇLİ SAPMA (§54): tasarımdaki "Ekip" bölümünde kesik çizgili
 * "ÖĞRETMEN / KOÇ / ÜRÜN EKİBİ FOTOĞRAFI" kutuları var. Bunlar prototip yer
 * tutucusudur; üretimde gerçek kullanıcıya boş fotoğraf kutusu gösterilmez.
 * Bölümün dürüst metni korundu, kutular çıkarıldı — izinli fotoğraflar
 * geldiğinde ızgara buraya eklenir.
 */
export default function HakkimizdaPage() {
  return (
    <div className="site-scope">
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className="site-container pt-14 sm:pt-[72px]">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
            <div>
              <p className="dc-eyebrow">Hakkımızda</p>
              <h1 className="mt-4 font-display text-[length:var(--public-display)] leading-[1.08] tracking-[-0.03em] text-dc-ink">
                Öğrenciyi yalnız
                <br />
                bırakmayan bir sistem.
              </h1>
              <p className="mt-4 max-w-[520px] text-[17px] leading-[1.65] text-dc-ink-body sm:text-[18px]">
                Online Dershanem canlı dersle başladı. Bugün ders, koçluk ve deneme
                analizi aynı çatı altında: öğrenci ne öğreneceğini, ne zaman
                çalışacağını ve nerede durduğunu aynı yerde görüyor.
              </p>
              <Link
                href="/misyonumuz/"
                className="mt-5 inline-block text-[15px] font-bold text-dc-brand-strong hover:text-dc-brand-hover"
              >
                Misyonumuzu ayrıntılı okuyun →
              </Link>
            </div>

            <div className="relative h-[280px] sm:h-[340px]">
              <div
                aria-hidden="true"
                className="absolute inset-5 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle at 50% 50%,#E8F5EF,rgba(243,249,246,0) 70%)",
                }}
              />
              <Image
                src="/design/dino-mascot.png"
                alt=""
                aria-hidden="true"
                width={1319}
                height={1193}
                sizes="(max-width: 1023px) 60vw, 320px"
                className="absolute bottom-0 left-[14%] w-[68%] max-w-[320px] lg:left-20"
              />
            </div>
          </div>
        </section>

        <section className="mt-16 border-y border-dc-line-soft bg-white">
          <div className="site-container py-[var(--dc-section-tight)]">
            <h2 className="font-display text-[length:var(--public-title)] leading-[1.1] tracking-[-0.025em] text-dc-ink">
              Nasıl çalışıyoruz?
            </h2>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {principles.map((p) => (
                <div key={p.title} className="rounded-[20px] border border-dc-line p-6">
                  <h3 className="text-[20px] font-bold text-dc-ink">{p.title}</h3>
                  <p className="mt-2.5 text-[15px] leading-[1.6] text-dc-ink-muted">
                    {p.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="site-container pt-[var(--dc-section-tight)]">
          <div className="max-w-[640px]">
            <h2 className="font-display text-[28px] leading-[1.14] tracking-[-0.02em] text-dc-ink sm:text-[36px]">
              Ekip
            </h2>
            <p className="mt-3.5 text-[16.5px] leading-[1.65] text-dc-ink-body">
              Dersleri alanında deneyimli öğretmenler veriyor, planı insan koçlar
              kuruyor. Öğretmen adlarını ve fotoğraflarını, her biri kendi izniyle
              onaylamadan yayınlamıyoruz.
            </p>
          </div>
        </section>

        <ProductClosingCta
          title="Sistemi öğrenciye göre kuralım."
          body="İhtiyacın olan ürünleri birlikte belirleyelim."
        />
      </main>
      <SiteFooter />
    </div>
  );
}
