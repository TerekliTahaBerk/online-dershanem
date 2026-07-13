import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { CheckoutResultCard } from "@/components/checkout/checkout-result-card";

type Params = Promise<{ slug: string }>;
type Search = Promise<{ status?: string }>;

export const metadata: Metadata = {
  title: "Ödeme Sonucu · ODK",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function OdkCheckoutResultPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { slug } = await params;
  const { status } = await searchParams;
  const isSuccess = status === "success";

  return (
    <div className="site-scope">
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="min-h-screen bg-[var(--site-bg-warm)] py-16">
        <div className="px-4">
          {isSuccess ? (
            <CheckoutResultCard
              status="success"
              eyebrow="Deneme Kulübü"
              title="Ödemeniz alındı"
              description="Ödemeniz kaydedildi. Sipariş detayları e-posta adresinize gönderilecektir."
              nextStepNote={
                <>
                  <strong>Sıradaki adım:</strong> Deneme planınızı
                  kişiselleştirmek için <strong>hocalarımız 24 saat içinde</strong>{" "}
                  sizinle iletişime geçecektir. Şimdilik bir aksiyon almanıza
                  gerek yok.
                </>
              }
              primaryAction={{
                href: `/odk-paketleri/${slug}`,
                label: "Pakete Dön",
                variant: "primary",
              }}
              secondaryAction={{
                href: "/iletisim",
                label: "İletişim",
              }}
            />
          ) : (
            <CheckoutResultCard
              status="failed"
              eyebrow="Deneme Kulübü"
              description="İşleminiz banka tarafından onaylanmadı ya da yarıda kaldı. Hesabınızdan herhangi bir tutar çekilmediyse tekrar deneyebilirsiniz."
              primaryAction={{
                href: `/odk-paketleri/${slug}/satin-al`,
                label: "Tekrar Dene",
                variant: "primary",
              }}
              secondaryAction={{ href: "/iletisim", label: "Destek" }}
            />
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
