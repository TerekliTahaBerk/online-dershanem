import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { BuyerInfoForm } from "@/components/checkout/buyer-info-form";
import {
  OrderSummaryCard,
  CheckoutPageHeader,
  parseTRYToCents,
} from "@/components/checkout/order-summary-card";

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

  const defaults = {
    fullName: "", email: "", phone: "", city: "", district: "",
    schoolName: "", classLevel: "", department: "", examType: category,
    targetSchool: "", parentFullName: "", parentPhone: "",
  };

  return (
    <>
      <Navbar />
      <main className="od-public min-h-screen bg-[var(--od-cream)] py-10">
        <div className="mx-auto max-w-[1080px] px-5 sm:px-8">
          <nav className="text-[12px] text-[var(--od-ink-soft)] mb-4 uppercase tracking-wider">
            <Link href="/#matematik-ders-paketi" className="hover:text-[var(--od-ink)]">
              Matematik Ders Paketi
            </Link>
            <span className="mx-2">/</span>
            <span className="text-[var(--od-ink)]">Ödeme</span>
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
              />
            </div>

            <OrderSummaryCard
              items={[
                {
                  category: category || undefined,
                  name: subject || packageLabel,
                  subtitle: priceLabel === "Detay için iletişime geçin" ? priceLabel : undefined,
                  priceCents: parseTRYToCents(priceLabel),
                },
              ]}
              backHref="/paketler"
              backLabel="← Matematik dersine dön"
            />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
