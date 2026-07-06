import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { PaytrIframeShell } from "@/components/checkout/paytr-iframe-shell";
import { prisma } from "@/lib/prisma";
import { createOdCheckoutSession } from "@/lib/od/checkout";
import { getClientIp, isPaytrConfigured } from "@/lib/odk/paytr";

type Search = Promise<{ orderId?: string }>;

export const metadata: Metadata = {
  title: "Güvenli Ödeme",
  alternates: { canonical: "/paketler/satin-al/odeme" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function OdPaymentPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const { orderId } = await searchParams;

  if (!orderId) {
    redirect("/paketler");
  }

  const order = await prisma.odOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      totalCents: true,
      packageName: true,
      category: true,
      subject: true,
      buyerInfo: true,
    },
  });

  if (!order) {
    notFound();
  }

  if (order.status === "PAID") {
    redirect("/paketler/satin-al/sonuc?status=success");
  }

  const hdrs = await headers();
  const userIp = getClientIp(hdrs);
  const host = hdrs.get("host") || "onlinedershanem.com";
  const protocol =
    hdrs.get("x-forwarded-proto") ||
    (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  const paytrReady = isPaytrConfigured();
  const buyer = (order.buyerInfo ?? {}) as Record<string, string | undefined>;

  const checkout = paytrReady
    ? await createOdCheckoutSession({
        orderId: order.id,
        userEmail: buyer.email || `order-${order.id}@onlinedershanem.com`,
        userName: buyer.fullName || "Müşteri",
        userPhone: buyer.phone || "+905555555555",
        userAddress:
          [buyer.district, buyer.city].filter(Boolean).join(", ") || "Türkiye",
        userIp,
        origin,
      })
    : null;

  // Sepet-merkezli akış: düzenleme sepette yapılır.
  const editHref = "/sepet";

  return (
    <>
      <Navbar />
      <main className="od-public min-h-screen bg-[var(--od-cream)] py-10 sm:py-14">
        <PaytrIframeShell
          breadcrumb={[
            { label: "Matematik Ders Paketi", href: "/#matematik-ders-paketi" },
            { label: "Bilgiler", href: editHref },
            { label: "Ödeme" },
          ]}
          eyebrow="Online Dershanem"
          title={order.packageName}
          totalCents={order.totalCents}
          editHref={editHref}
          paytrReady={paytrReady}
          checkout={checkout}
        />
      </main>
      <Footer />
    </>
  );
}
