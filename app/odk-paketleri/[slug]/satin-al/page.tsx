import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { prisma } from "@/lib/prisma";
import { BuyerInfoForm } from "@/components/checkout/buyer-info-form";
import {
  OrderSummaryCard,
  CheckoutPageHeader,
} from "@/components/checkout/order-summary-card";

type Params = Promise<{ slug: string }>;

export const metadata: Metadata = {
  title: "Satın Al · ODK",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export default async function OdkCheckoutFormPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;

  const pkg = await prisma.odkPackage.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true,
      slug: true,
      title: true,
      priceCents: true,
      durationDays: true,
      description: true,
    },
  });

  if (!pkg) {
    notFound();
  }

  const defaults = {
    fullName: "", email: "", phone: "", city: "", district: "",
    schoolName: "", classLevel: "", department: "", examType: "",
    targetSchool: "", parentFullName: "", parentPhone: "",
  };

  return (
    <div className="site-scope">
      <SiteHeader />
      <main className="min-h-screen bg-[var(--site-bg-warm)] py-10">
        <div className="mx-auto max-w-[1080px] px-5 sm:px-8">
          <nav className="text-[12px] text-[var(--site-body)] mb-4 uppercase tracking-wider">
            <Link href="/deneme-kulubu" className="hover:text-[var(--site-ink)]">
              ODK Paketleri
            </Link>
            <span className="mx-2">/</span>
            <span className="text-[var(--site-ink)]">Satın Al</span>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
            <div>
              <CheckoutPageHeader
                subtitle={
                  <>
                    {pkg.durationDays ? `${pkg.durationDays} gün erişim · ` : ""}
                    Bilgilerinizi doldurun, güvenli ödemeye geçelim.
                  </>
                }
              />
              <BuyerInfoForm
                action="/api/odk/checkout/start"
                service="ODK"
                submitMode="redirect"
                submitLabel="Güvenli Ödemeye Geç"
                packageLabel={pkg.title}
                priceLabel={formatPrice(pkg.priceCents)}
                hiddenFields={{ packageId: pkg.id, packageSlug: pkg.slug }}
                defaults={defaults}
              />
            </div>

            <OrderSummaryCard
              items={[
                {
                  id: pkg.id,
                  category: "ODK",
                  name: pkg.title,
                  subtitle: pkg.durationDays
                    ? `${pkg.durationDays} gün erişim`
                    : undefined,
                  priceCents: pkg.priceCents,
                },
              ]}
              backHref={`/odk-paketleri/${slug}`}
              backLabel="← Pakete dön"
            />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
