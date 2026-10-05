import { denemeLigiBrand } from "@/lib/deneme-ligi-brand";
import { yonBrand } from "@/lib/yon-brand";
import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PageHero } from "@/components/site/page-hero";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { TallyEmbed } from "@/components/forms/tally-embed";
import { builderContactContext } from "@/lib/commerce/builder-contact-context";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { contact } from "@/lib/content";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata = buildMarketingMetadata({
  title: "İletişim",
  description:
    "Canlı ders, koçluk veya deneme desteğini konuşmak için kısa ön görüşme formunu doldurun; WhatsApp, telefon veya e-posta ile de ulaşabilirsiniz.",
  canonical: "/iletisim",
  imageAlt: "onlinedershanem. iletişim ve ücretsiz ön görüşme",
});

const waHref = `https://wa.me/${contact.whatsapp.replace(/[^\d]/g, "")}`;

export default async function ContactPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const selection = builderContactContext(await searchParams);
  return (
    <div className="site-scope">
      <SchemaJsonLd
        schema={breadcrumbJsonLd([
          { name: "Ana Sayfa", url: "/" },
          { name: "İletişim", url: "/iletisim/" },
        ])}
      />
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <PageHero
          eyebrow="İletişim"
          align="left"
          title={
            <>
              Aklınızdakileri konuşalım.
            </>
          }
          subtitle="Canlı ders, koçluk veya deneme desteğinden hangisinin size uygun olduğunu birlikte belirleyelim. Kısa ön görüşme formunu doldurabilir veya bize doğrudan ulaşabilirsiniz."
        />

        <section className="site-container pb-20 pt-10 sm:pb-28 sm:pt-14">
          {/* Form odaklı yolculuk: mobilde form önce; masaüstünde sol kolon.
              Hızlı iletişim kanalları sağda ve mobilde formun ardından. */}
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 *:min-w-0">
            <section id="on-gorusme" aria-labelledby="on-gorusme-title" className="scroll-mt-24 lg:col-start-1 lg:row-span-2 lg:row-start-1">
              <h2 id="on-gorusme-title" className="font-display text-[26px] font-bold leading-tight text-dc-ink sm:text-[30px]">
                Ücretsiz Ön Görüşme
              </h2>
              <p className="mb-6 mt-3 text-[15px] leading-6 text-dc-ink-muted">
                onlinedershanem., onlinekoçum. × Yön Koçluk veya onlinedenemekulübüm. × Deneme Ligi için ihtiyacınızı paylaşın. Henüz karar vermediyseniz birlikte değerlendirebiliriz.
              </p>
              {selection ? (
                <aside aria-label="Seçiminiz" className="mb-6 rounded-dc-card-sm border border-dc-line bg-dc-surface-muted px-5 py-4">
                  <h3 className="text-[14px] font-bold text-dc-ink">Seçiminiz</h3>
                  <p className="mt-1 text-[14px] leading-6 text-dc-ink-body">
                    {[selection.exam, selection.products.map((name) => name === "onlinekoçum." ? yonBrand.name : name === "onlinedenemekulübüm." ? denemeLigiBrand.name : name).join(" + ")].filter(Boolean).join(" · ")}
                  </p>
                  {selection.format ? (
                    <p className="text-[14px] leading-6 text-dc-ink-muted">
                      {[selection.format, selection.subjects.join(" + ")].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                </aside>
              ) : null}
              <TallyEmbed formId="0QpdQB" title="onlinedershanem. Kısa Ön Görüşme Formu" height={820} />
            </section>

            {/* Sağ: kanallar */}
            <div className="flex flex-col gap-3.5 lg:col-start-2 lg:row-start-1">
              <a
                href={waHref}
                className="flex items-center gap-4 rounded-2xl border border-(--site-line) bg-(--brand-orange-soft) px-6 py-5 transition-colors hover:border-(--brand-orange)"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-(--brand-orange-ink)">
                  <MessageCircle
                    size={18}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </span>
                <div>
                  <div className="text-[16px] font-semibold text-(--site-ink)">
                    WhatsApp
                  </div>
                  <div className="text-[14px] text-(--site-body)">
                    En hızlısı — buradan yazabilirsiniz
                  </div>
                </div>
                <ArrowRight
                  size={18}
                  strokeWidth={1.8}
                  className="ml-auto text-(--brand-orange-ink)"
                  aria-hidden="true"
                />
              </a>

              <a
                href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}
                className="flex items-center gap-4 rounded-2xl border border-(--site-line) bg-white px-6 py-5 transition-colors hover:border-(--brand-orange)"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-(--site-bg-warm) text-(--brand-orange-ink)">
                  <Phone size={18} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <div>
                  <div className="text-[16px] font-semibold text-(--site-ink)">
                    Telefon
                  </div>
                  <div className="text-[14px] text-(--site-body)">
                    {contact.phone}
                  </div>
                </div>
                <ArrowRight
                  size={18}
                  strokeWidth={1.8}
                  className="ml-auto text-(--site-muted)"
                  aria-hidden="true"
                />
              </a>

              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-4 rounded-2xl border border-(--site-line) bg-white px-6 py-5 transition-colors hover:border-(--brand-orange)"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-(--site-bg-warm) text-(--brand-orange-ink)">
                  <Mail size={18} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="text-[16px] font-semibold text-(--site-ink)">
                    E-posta
                  </div>
                  <div className="truncate text-[14px] text-(--site-body)">
                    {contact.email}
                  </div>
                </div>
                <ArrowRight
                  size={18}
                  strokeWidth={1.8}
                  className="ml-auto shrink-0 text-(--site-muted)"
                  aria-hidden="true"
                />
              </a>

              <div className="flex items-center gap-4 rounded-2xl border border-(--site-line) bg-white px-6 py-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-(--site-bg-warm) text-(--brand-orange-ink)">
                  <MapPin size={18} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <div>
                  <div className="text-[16px] font-semibold text-(--site-ink)">
                    Konum
                  </div>
                  <div className="text-[14px] text-(--site-body)">
                    {contact.address}
                  </div>
                </div>
              </div>

            </div>

            {/* Cross-sell */}
            <div className="lg:col-start-2 lg:row-start-2">
              <div className="rounded-2xl border border-(--site-line) bg-(--site-bg-warm) px-6 py-6">
                <div className="mb-1.5 text-[15.5px] font-semibold text-(--site-ink)">
                  Önce paketi incelemek ister misiniz?
                </div>
                <p className="mb-4 text-[14.5px] leading-6 text-(--site-body)">
                  Canlı ders, koçluk ve deneme seçeneklerini karşılaştırıp size uygun paketi oluşturabilirsiniz.
                </p>
                <Link
                  href="/paketler"
                  className="inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-(--brand-orange-ink) hover:underline"
                >
                  Paketleri incele
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
