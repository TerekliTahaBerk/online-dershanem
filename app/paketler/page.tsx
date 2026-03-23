import type { Metadata } from "next";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { PurchaseIntentForm } from "@/components/sections/purchase-intent-form";
import { Container } from "@/components/ui/container";
import { FadeIn } from "@/components/ui/fade-in";
import { contact, getPackagePaymentLink, siteUrl, subjectPackageGroups } from "@/lib/content";
import { ContactLink } from "@/components/ui/contact-link";
import { PurchaseFunnelTrigger } from "@/components/ui/purchase-funnel-trigger";
import { Check, MessageCircleMore, PhoneCall } from "lucide-react";

export const metadata: Metadata = {
  title: "Ders Bazlı Grup Özel Ders Paketleri",
  description: "TYT-AYT ve LGS için ders bazlı Grup Özel Ders paketlerini inceleyin.",
  alternates: {
    canonical: "/paketler/"
  },
  openGraph: {
    title: "Ders Bazlı Grup Özel Ders Paketleri | Online Dershanem",
    description: "TYT-AYT ve LGS için ders bazlı Grup Özel Ders paketlerini inceleyin.",
    url: `${siteUrl}/paketler/`
  }
};

export default function PackagesPage() {
  return (
    <>
      <Navbar />
      <main className="py-14 sm:py-20">
        <Container>
          <FadeIn>
            <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl">Ders Bazlı Grup Özel Ders Paketleri</h1>
            <p className="mt-3 max-w-3xl text-muted">
              Bu sayfa klasik tüm dersleri içeren paket listesi değildir. Her kart tek bir dersi temsil eder. TYT-AYT ve LGS
              kategorilerinde ihtiyacın olan dersi ayrı seçebilir, küçük gruplu ve seviyeye göre kurgulanan ders modeline katılabilirsin.
            </p>
          </FadeIn>

          <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="space-y-10">
              {subjectPackageGroups.map((group) => (
                <section key={group.key} className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-ink">{group.title}</h2>
                    <p className="text-sm text-muted">{group.subtitle}</p>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    {group.packages.map((pkg) => (
                      <article key={`${group.key}-${pkg.subject}`} className="rounded-3xl border border-line bg-white p-6 shadow-soft">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted/80">{pkg.category}</p>
                            <h3 className="mt-1 text-xl font-bold text-ink">{pkg.subject}</h3>
                          </div>
                          {pkg.badge ? <span className="rounded-full bg-mint px-3 py-1 text-[11px] font-semibold text-pine">{pkg.badge}</span> : null}
                        </div>

                        <div className="mt-4 rounded-2xl border border-line bg-soft p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand">{pkg.discountLabel}</p>
                          <p className="mt-1 inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                            {pkg.quota}
                          </p>
                          <p className="mt-1 text-sm text-muted line-through">{pkg.oldPrice}</p>
                          <p className="mt-1 text-2xl font-bold text-anchor">{pkg.discountedPrice}</p>
                          <p className="mt-1 text-xs font-semibold text-muted">{pkg.perLessonPrice}</p>
                        </div>

                        <ul className="mt-4 space-y-2 text-sm text-muted">
                          {pkg.features.map((feature) => (
                            <li key={feature} className="flex items-start gap-2">
                              <Check className="mt-0.5 h-4 w-4 text-brand" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>

                        <PurchaseFunnelTrigger
                          source={`packages_page_${group.key}_${pkg.subject}`}
                          packageName={`${pkg.category} ${pkg.subject}`}
                          paymentLink={getPackagePaymentLink(pkg.category, pkg.subject) ?? ""}
                          className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-anchor px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-pine"
                          analyticsId={`packages_page_${group.key}_${pkg.subject}`}
                        >
                          {pkg.cta}
                        </PurchaseFunnelTrigger>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-3xl border border-line bg-white p-5 shadow-soft">
                <p className="text-sm font-semibold text-ink">Ders Seçim Desteği</p>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  Kararsız kaldıysan danışman ekibimiz öğrencinin seviyesine göre önce hangi dersle başlanması gerektiğini netleştirir.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <ContactLink
                    href={`tel:${contact.phone}`}
                    channel="phone"
                    placement="packages_page"
                    className="inline-flex items-center justify-center rounded-xl bg-anchor px-4 py-2 text-xs font-semibold text-white transition hover:bg-pine"
                  >
                    <PhoneCall className="mr-2 h-3.5 w-3.5" /> Hemen Ara
                  </ContactLink>
                  <ContactLink
                    href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`}
                    channel="whatsapp"
                    placement="packages_page"
                    className="inline-flex items-center justify-center rounded-xl border border-line-strong px-4 py-2 text-xs font-semibold text-ink transition hover:bg-soft"
                  >
                    <MessageCircleMore className="mr-2 h-3.5 w-3.5" /> WhatsApp'tan Yaz
                  </ContactLink>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </main>
      <PurchaseIntentForm />
      <Footer />
    </>
  );
}
