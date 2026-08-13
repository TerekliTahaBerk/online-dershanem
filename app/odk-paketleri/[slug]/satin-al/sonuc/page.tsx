import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { CheckoutResultCard } from "@/components/checkout/checkout-result-card";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ slug: string }>;
type Search = Promise<{ status?: string; orderId?: string }>;

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
  const { status, orderId } = await searchParams;
  const order = orderId ? await prisma.odkOrder.findFirst({
    where: { id: orderId, package: { slug } },
    select: { status: true, provisioningStatus: true },
  }) : null;
  const isSuccess = status === "success" && order?.status === "PAID";
  const isPending = status === "success" && order?.status === "PENDING";

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
              description={order.provisioningStatus === "SUCCEEDED" ? "Ödemeniz kaydedildi ve Deneme Kulübü erişiminiz hazırlandı." : "Ödemeniz kaydedildi. Erişiminiz hazırlanıyor; tamamlandığında hesabınızdan giriş yapabilirsiniz."}
              nextStepNote={
                <>
                  <strong>Sıradaki adım:</strong> E-posta adresinizle oluşturulan öğrenci hesabına giriş yaparak paketinizdeki denemeleri görebilirsiniz.
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
          ) : isPending ? (
            <CheckoutResultCard
              status="pending"
              eyebrow="Deneme Kulübü"
              title="Ödeme doğrulanıyor"
              description="Banka bildirimi henüz ulaşmadı. Bu sayfayı kısa süre sonra yenileyin; doğrulama tamamlanmadan erişim açılmaz."
              primaryAction={{ href: `/odk-paketleri/${slug}/satin-al/sonuc?status=success&orderId=${orderId}`, label: "Durumu Yenile", variant: "primary" }}
              secondaryAction={{ href: "/iletisim", label: "Destek" }}
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
