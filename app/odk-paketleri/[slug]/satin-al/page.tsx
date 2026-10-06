import { denemeLigiBrand } from "@/lib/deneme-ligi-brand";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyerInfoForm } from "@/components/checkout/buyer-info-form";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { formatOdkPrice } from "@/components/odk/public-package-card";
import { loadCheckoutAccount } from "@/lib/commerce/checkout-account";
import {
  getPublicOdkPackage,
  odkAvailabilityLabel,
} from "@/lib/odk/public-commerce-server";

type Params = Promise<{ slug: string }>;
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `Satın Alma Bilgileri · ${denemeLigiBrand.shortName}`,
  robots: { index: false, follow: false },
};

export default async function OdkCheckoutPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [item, checkoutAccount] = await Promise.all([getPublicOdkPackage(slug), loadCheckoutAccount()]);
  if (!item) notFound();
  return (
    <div className="site-scope">
      <SiteHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="min-h-screen bg-(--site-bg-warm) py-10"
      >
        <div className="mx-auto max-w-[860px] px-5 sm:px-8">
          <nav className="mb-5 text-xs uppercase tracking-wider text-(--site-body)">
            <Link
              href={`/odk-paketleri/${slug}`}
              className="hover:text-(--site-ink)"
            >
              {item.contract.package.title}
            </Link>
            <span className="mx-2">/</span>
            <span>Satın alma</span>
          </nav>
          {item.availability.allowed ? (
            <BuyerInfoForm
              action="/api/odk/checkout/start"
              packageLabel={item.contract.package.title}
              priceLabel={formatOdkPrice(item.contract.package.priceCents)}
              hiddenFields={{ packageSlug: slug }}
              submitMode="redirect"
              submitLabel="Güvenli Ödemeye Geç"
              service="ODK"
              defaults={checkoutAccount?.defaults}
              account={checkoutAccount?.account ?? null}
            />
          ) : (
            <section className="rounded-[28px] border border-amber-200 bg-white p-8 text-center">
              <h1 className="font-display text-3xl">
                {odkAvailabilityLabel(item.availability.reason)}
              </h1>
              <p className="mx-auto mt-4 max-w-xl leading-7 text-(--site-body)">
                Bu paket için yeni sipariş açmıyoruz. Eksik veya kapalı bir
                akışa ödeme göndermemek için checkout güvenli biçimde
                durduruldu.
              </p>
              <Link
                href={`/odk-paketleri/${slug}`}
                className="site-btn site-btn-secondary mt-7"
              >
                Paket detayına dön
              </Link>
            </section>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
