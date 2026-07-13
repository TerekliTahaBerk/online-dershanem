import Image from "next/image";
import { BarChart3, Compass, HeartHandshake, Layers, MessageCircle, Target } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { FooterCta } from "@/components/marketing/footer-cta";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  title: "Hakkımızda",
  description:
    "Online Dershanem; küçük grup canlı ders, öğretmen takibi ve sade veli bilgilendirmesini bir araya getirir.",
  canonical: "/hakkimizda",
});

const approach = [
  {
    icon: HeartHandshake,
    title: "Birebir ilgi",
    body: "En fazla 4 kişilik grupta öğrenci görünür kalır; soru sorar, çözümünü gösterir.",
  },
  {
    icon: BarChart3,
    title: "Düzenli takip",
    body: "İşlenen konu, verilen ödev ve sonraki hedef kısa öğretmen notlarıyla görünür kalır.",
  },
  {
    icon: Compass,
    title: "Seviyeye göre plan",
    body: "Öğrencinin seviyesi ve sınav hedefi dikkate alınır; sıradaki çalışma yönü netleşir.",
  },
];

const different = [
  { title: "Tek sistem", body: "Ders, plan, ödev ve veli bilgilendirmesi tek bir düzende yürür." },
  { title: "Görünür ilerleme", body: "İşlenen konu, zorlanılan nokta ve sıradaki hedef haftalık olarak görünür." },
  { title: "Seviyeye göre plan", body: "Çalışma yönü öğrencinin seviyesi ve sınav hedefine göre güncellenir." },
  { title: "Düzenli geri bildirim", body: "Öğrenciye öğretmen notu, veliye kısa gelişim özeti." },
];

export default function AboutPage() {
  return (
    <div className="site-scope">
      <SchemaJsonLd
        schema={breadcrumbJsonLd([
          { name: "Ana Sayfa", url: "/" },
          { name: "Hakkımızda", url: "/hakkimizda/" },
        ])}
      />
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        {/* Başlık */}
        <section className="bg-white pt-16 sm:pt-24">
          <div className="site-container text-center">
            <p className="site-eyebrow justify-center">Hakkımızda</p>
            <h1 className="mx-auto mt-4 max-w-4xl font-display text-[clamp(2.5rem,6.5vw,4.75rem)] leading-[1.02] text-[var(--site-ink)]">
              Öğrencinin matematikte yalnız kalmadığı bir sistem.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-[16.5px] leading-7 text-[var(--site-body)]">
              Online Dershanem; küçük grup canlı ders, öğretmen takibi ve sade veli bilgilendirmesini bir araya getirir.
            </p>
          </div>
        </section>

        {/* Misyon */}
        <section className="bg-white">
          <div className="site-container py-16 sm:py-20">
            <div className="grid items-center gap-8 overflow-hidden rounded-[28px] border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-8 sm:p-12 lg:grid-cols-2 lg:gap-14">
              <div>
                <p className="site-eyebrow mb-4">Misyonumuz</p>
                <h2 className="font-display text-[clamp(1.9rem,3.6vw,2.8rem)] leading-[1.1] tracking-[-0.02em] text-[var(--site-ink)]">
                  Hedefe giden yolu <span className="site-hl">sadeleştirmek.</span>
                </h2>
                <p className="mt-5 max-w-[46ch] text-[15.5px] leading-7 text-[var(--site-body)]">
                  Öğrencinin derste görünür kaldığı, ne çalışacağını bildiği ve gelişiminin aile için
                  de anlaşılır olduğu sürdürülebilir bir çalışma düzeni kurmak.
                </p>
              </div>
              <div className="overflow-hidden rounded-[24px] border border-[var(--site-line)] bg-white p-4 shadow-[0_24px_55px_-34px_rgba(20,20,15,.28)]">
                <div className="aspect-[35/24] overflow-hidden rounded-[18px] bg-[var(--site-bg-warm)]">
                  <Image
                    src="/founders.webp"
                    alt="Online Dershanem kurucu ekibi çizimi"
                    width={420}
                    height={288}
                    sizes="(max-width: 1024px) 80vw, 520px"
                    className="h-full w-full object-cover object-center"
                  />
                </div>
                <div className="px-2 pb-2 pt-4">
                  <p className="text-[13px] font-bold text-[var(--site-ink)]">Online Dershanem ekibi</p>
                  <p className="mt-1 text-[12.5px] leading-5 text-[var(--site-body)]">
                    Küçük grup matematik modelini öğrenci, öğretmen ve veli için daha açık hâle getirmek üzere çalışıyoruz.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Yaklaşım */}
        <section className="bg-white">
          <div className="site-container pb-8">
            <h2 className="text-center font-display text-[clamp(1.9rem,4vw,2.8rem)] leading-[1.1] tracking-[-0.02em] text-[var(--site-ink)]">
              Yaklaşımımız
            </h2>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {approach.map((a) => {
                const Icon = a.icon;
                return (
                  <article key={a.title} className="rounded-[24px] border border-[var(--site-line)] bg-white p-8">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-orange-soft)] text-[var(--brand-orange-ink)]">
                      <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <h3 className="mt-6 font-display text-[24px] tracking-[-0.01em] text-[var(--site-ink)]">{a.title}</h3>
                    <p className="mt-3 text-[14.5px] leading-6 text-[var(--site-body)]">{a.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Neden farklı */}
        <section className="bg-[var(--site-bg-warm)]">
          <div className="site-container grid gap-12 py-20 sm:py-24 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="site-eyebrow mb-4">Neden farklı?</p>
              <h2 className="font-display text-[clamp(1.9rem,3.8vw,3rem)] leading-[1.08] tracking-[-0.02em] text-[var(--site-ink)]">
                İlerleme, küçük ama tutarlı adımlarla gelir.
              </h2>
              <p className="mt-5 max-w-md text-[15px] leading-7 text-[var(--site-body)]">
                Kısa vadeli, kanıtlanmamış vaatler yerine; uygulanabilir bir çalışma düzenine ve
                ölçülebilir gelişime odaklanırız.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {different.map((d) => (
                <div key={d.title} className="rounded-[20px] border border-[var(--site-line)] bg-white p-6">
                  <div className="flex items-center gap-2 text-[var(--brand-orange-ink)]">
                    <Layers size={16} aria-hidden="true" />
                    <h3 className="text-[15px] font-bold text-[var(--site-ink)]">{d.title}</h3>
                  </div>
                  <p className="mt-2.5 text-[14px] leading-6 text-[var(--site-body)]">{d.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Öğretmenler teaser */}
        <section className="bg-white">
          <div className="site-container py-20 text-center sm:py-24">
            <Target className="mx-auto text-[var(--brand-orange)]" size={30} aria-hidden="true" />
            <h2 className="mx-auto mt-5 max-w-2xl font-display text-[clamp(1.9rem,4vw,3rem)] leading-[1.1] tracking-[-0.02em] text-[var(--site-ink)]">
              Öğretmen eşleşmesini öğrencinin seviyesine göre yapıyoruz.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15.5px] leading-7 text-[var(--site-body)]">
              Küçük grup dersini yürütecek öğretmen seçiminde matematik alan bilgisi, anlatım yaklaşımı
              ve öğrencinin seviyesi birlikte değerlendirilir. Uygun eşleşmeyi ön görüşmede netleştiririz.
            </p>
            <a
              href="/iletisim/"
              className="mt-8 inline-flex items-center gap-2 text-[15px] font-semibold text-[var(--brand-orange-ink)] hover:underline"
            >
              <MessageCircle size={16} aria-hidden="true" />
              Bize ulaş
            </a>
          </div>
        </section>

        <FooterCta
          title="Hedefini birlikte planlayalım."
          subtitle="Kısa bir ücretsiz görüşmede öğrencinin seviyesini ve hedefini konuşalım."
          ctaLabel="Ücretsiz görüşme"
          ctaHref="/iletisim/"
        />
      </main>
      <SiteFooter />
    </div>
  );
}
