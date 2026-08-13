import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { BuyerInfoForm } from "@/components/checkout/buyer-info-form";
import {
  OrderSummaryCard,
  CheckoutPageHeader,
} from "@/components/checkout/order-summary-card";
import { parsePriceToCents } from "@/lib/content";
import { getOdPlacementExpectation } from "@/lib/od/placement-server";

type Search = Promise<{
  cat?: string;
  subj?: string;
  name?: string;
  price?: string;
}>;

export const metadata: Metadata = {
  title: "Ödeme",
  alternates: { canonical: "/paketler/satin-al" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function OdCheckoutFormPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const sp = await searchParams;
  const category = (sp.cat || "").trim();
  const subject = (sp.subj || "").trim();
  const explicitName = (sp.name || "").trim();
  const priceLabel = (sp.price || "").trim() || "Detay için iletişime geçin";

  if (!category && !subject && !explicitName) {
    redirect("/paketler");
  }

  const packageLabel =
    explicitName ||
    [category, subject].filter(Boolean).join(" ").trim() ||
    "Paket";
  const placementExpectation = await getOdPlacementExpectation(category);

  const defaults = {
    fullName: "", email: "", phone: "", city: "", district: "",
    schoolName: "", classLevel: "", department: "", examType: category,
    targetSchool: "", parentFullName: "", parentPhone: "",
  };

  return (
    <div className="site-scope">
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="min-h-screen bg-[var(--site-bg-warm)] py-10">
        <div className="mx-auto max-w-[1080px] px-5 sm:px-8">
          <nav className="text-[12px] text-[var(--site-body)] mb-4 uppercase tracking-wider">
            <Link href="/ders-paketleri/" className="hover:text-[var(--site-ink)]">
              Matematik Ders Paketi
            </Link>
            <span className="mx-2">/</span>
            <span className="text-[var(--site-ink)]">Ödeme</span>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
            <div>
              <CheckoutPageHeader
                subtitle="Bilgilerinizi paylaştıktan sonra güvenli ödeme sayfası açılır."
              />
              <BuyerInfoForm
                action="/api/od/checkout/start"
                service="OD"
                submitMode="redirect"
                submitLabel="Güvenli Ödemeye Geç"
                packageLabel={packageLabel}
                priceLabel={priceLabel}
                hiddenFields={{
                  category,
                  subject,
                  packageName: packageLabel,
                  priceLabel,
                }}
                defaults={defaults}
                placementExpectation={placementExpectation}
              />
            </div>

            <OrderSummaryCard
              items={[
                {
                  category: category || undefined,
                  name: subject || packageLabel,
                  subtitle: priceLabel === "Detay için iletişime geçin" ? priceLabel : undefined,
                  priceCents: parsePriceToCents(priceLabel),
                },
              ]}
              backHref="/ders-paketleri/"
              backLabel="← Matematik dersine dön"
            />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
