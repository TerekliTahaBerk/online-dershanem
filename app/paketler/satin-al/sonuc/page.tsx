import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { CheckoutResultCard } from "@/components/checkout/checkout-result-card";
import { ClearCartOnPaymentSuccess } from "@/components/cart/clear-cart-on-payment-success";
import { prisma } from "@/lib/prisma";
import { resolveOdCheckoutResultStatus } from "@/lib/od/payment-result";
import { log } from "@/lib/logger";
import { OdStartTimeline } from "@/components/checkout/od-start-timeline";

type Search = Promise<{ status?: string; orderId?: string }>;

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
  const { status, orderId: rawOrderId } = await searchParams;
  const orderId = rawOrderId?.trim() || null;
  const providerStatus =
    status === "success" || status === "failed" ? status : null;
  const order = orderId
    ? await prisma.odOrder
        .findUnique({
          where: { id: orderId },
          select: {
            id: true,
            status: true,
            buyerInfo: true,
            payments: {
              orderBy: { updatedAt: "desc" },
              take: 1,
              select: { status: true },
            },
          },
        })
        .catch((error) => {
          log.error("od.checkout.result_lookup_failed", error, { orderId });
          return null;
        })
    : null;

  const normalizedStatus = order
    ? resolveOdCheckoutResultStatus({
        orderStatus: order.status,
        paymentStatus: order.payments[0]?.status,
        providerStatus,
      })
    : null;
  const refreshHref = order
    ? `/paketler/satin-al/sonuc?orderId=${encodeURIComponent(order.id)}${providerStatus ? `&status=${providerStatus}` : ""}`
    : "/sepet";

  return (
    <div className="site-scope">
      <SiteHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="min-h-screen bg-[var(--site-bg-warm)] py-16"
      >
        <div className="px-4">
          {!order && (
            <CheckoutResultCard
              status="failed"
              title="Sipariş doğrulanamadı"
              description="Ödeme sonucunu doğrulayabilmek için geçerli bir sipariş bilgisi gerekir. Sepetinize dönüp işlemi yeniden başlatabilir veya destek ekibimizle iletişime geçebilirsiniz."
              primaryAction={{
                href: "/sepet",
                label: "Sepete Dön",
                variant: "primary",
              }}
              secondaryAction={{ href: "/iletisim", label: "Destek" }}
            />
          )}

          {order && normalizedStatus === "success" && (
            <>
              <ClearCartOnPaymentSuccess />
              <CheckoutResultCard
                status="success"
                eyebrow="Online Dershanem"
                description="Ödemeniz alındı. Ekibimiz sizinle iletişime geçip ilk ders planlamasını yapacak."
                nextStepNote={<OdStartTimeline buyerInfo={order.buyerInfo} />}
                primaryAction={{
                  href: "/",
                  label: "Ana Sayfa",
                  variant: "primary",
                }}
                secondaryAction={{ href: "/iletisim", label: "İletişim" }}
              />
            </>
          )}

          {order && normalizedStatus === "pending" && (
            <CheckoutResultCard
              status="pending"
              eyebrow="Online Dershanem"
              title="Ödeme onayı bekleniyor"
              description="Bankanızdan gelen ödeme onayı kontrol ediliyor. Başarı ekranı yalnızca siparişiniz PayTR bildirimiyle doğrulandıktan sonra gösterilir."
              primaryAction={{
                href: refreshHref,
                label: "Durumu Yenile",
                variant: "primary",
              }}
              secondaryAction={{ href: "/iletisim", label: "İletişim" }}
            />
          )}

          {order && normalizedStatus === "failed" && (
            <CheckoutResultCard
              status="failed"
              eyebrow="Online Dershanem"
              primaryAction={{
                href: `/paketler/satin-al/odeme?orderId=${encodeURIComponent(order.id)}`,
                label: "Ödemeyi Tekrar Dene",
                variant: "primary",
              }}
              secondaryAction={{ href: "/sepet", label: "Sepete Dön" }}
            />
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
