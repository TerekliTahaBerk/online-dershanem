import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import {
  CheckoutResultCard,
  type CheckoutResultStatus,
} from "@/components/checkout/checkout-result-card";
import { ClearCartOnPaymentSuccess } from "@/components/cart/clear-cart-on-payment-success";

type Search = Promise<{ status?: string }>;

export const metadata: Metadata = {
  title: "Ödeme Sonucu",
  alternates: { canonical: "/paketler/satin-al/sonuc" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function OdCheckoutThankYouPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const { status } = await searchParams;
  const normalizedStatus: CheckoutResultStatus =
    status === "success" ? "success" : status === "failed" ? "failed" : "pending";

  return (
    <div className="site-scope">
      <SiteHeader />
      <main className="min-h-screen bg-[var(--site-bg-warm)] py-16">
        <div className="px-4">
          {normalizedStatus === "success" && (
            <>
              <ClearCartOnPaymentSuccess />
              <CheckoutResultCard
                status="success"
                eyebrow="Online Matematik Dershanesi"
                description="Ödemeniz alındı. Ekibimiz sizinle iletişime geçip ilk ders planlamasını yapacak."
                nextStepNote={
                  <>
                    <strong>Sıradaki adım:</strong> Satın alma için ayrıca hesap
                    açmanıza gerek yok. Ekibimiz <strong>24 saat içinde</strong>{" "}
                    sizinle iletişime geçerek öğrencinin seviyesini
                    değerlendirecek, uygun grubu belirleyecek ve ilk canlı dersi
                    birlikte planlayacak. Bilgilendirme telefon veya e-posta
                    üzerinden yapılacaktır.
                  </>
                }
                primaryAction={{ href: "/", label: "Ana Sayfa", variant: "primary" }}
                secondaryAction={{ href: "/iletisim", label: "İletişim" }}
              />
            </>
          )}

          {normalizedStatus === "pending" && (
            <CheckoutResultCard
              status="pending"
              eyebrow="Online Matematik Dershanesi"
              title="Bilgileriniz alındı"
              description="Talebiniz kayıt altına alındı. Ekibimiz 24 saat içinde sizinle iletişime geçecek."
              primaryAction={{ href: "/", label: "Ana Sayfa", variant: "primary" }}
              secondaryAction={{ href: "/iletisim", label: "İletişim" }}
            />
          )}

          {normalizedStatus === "failed" && (
            <CheckoutResultCard
              status="failed"
              eyebrow="Online Matematik Dershanesi"
              primaryAction={{
                href: "/#matematik-ders-paketi",
                label: "Matematik Dersine Dön",
                variant: "primary",
              }}
              secondaryAction={{ href: "/iletisim", label: "İletişim" }}
            />
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
