import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { PaytrIframeShell } from "@/components/checkout/paytr-iframe-shell";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { createOdkCheckoutSession } from "@/lib/odk/checkout";
import { getClientIp, isPaytrConfigured } from "@/lib/odk/paytr";

type Params = Promise<{ slug: string }>;
type Search = Promise<{ orderId?: string }>;

export const metadata: Metadata = {
  title: "Güvenli Ödeme · ODK",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function OdkPaymentPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { slug } = await params;
  const { orderId } = await searchParams;

  if (!orderId) {
    redirect(`/odk-paketleri/${slug}/satin-al`);
  }

  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    redirect(`/giris?callbackUrl=/odk-paketleri/${slug}/satin-al/odeme?orderId=${orderId}`);
  }

  const order = await prisma.odkOrder.findFirst({
    where: { id: orderId, userId: session.user.id },
    select: {
      id: true,
      status: true,
      totalCents: true,
      buyerInfo: true,
      package: { select: { id: true, slug: true, title: true, isActive: true } },
    },
  });

  if (!order || !order.package || !order.package.isActive) {
    notFound();
  }

  if (order.package.slug !== slug) {
    redirect(`/odk-paketleri/${order.package.slug}/satin-al/odeme?orderId=${orderId}`);
  }

  // If already paid, jump to result success
  if (order.status === "PAID") {
    redirect(`/odk-paketleri/${slug}/satin-al/sonuc?status=success`);
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
    ? await createOdkCheckoutSession({
        userId: session.user.id,
        packageId: order.package.id,
        userEmail: buyer.email || session.user.email || `user-${session.user.id}@onlinedershanem.com`,
        userName: buyer.fullName || session.user.name || "ODK Üye",
        userPhone: buyer.phone || "+905555555555",
        userAddress:
          [buyer.address, buyer.district, buyer.city].filter(Boolean).join(", ") ||
          "Türkiye",
        userIp,
        origin,
      })
    : null;

  return (
    <>
      <Navbar />
      <main className="bg-[var(--od-cream)] min-h-screen py-10 sm:py-14">
        <PaytrIframeShell
          breadcrumb={[
            { label: "ODK Paketleri", href: "/deneme-kulubu" },
            { label: "Bilgiler", href: `/odk-paketleri/${slug}/satin-al` },
            { label: "Ödeme" },
          ]}
          eyebrow="Deneme Kulübü"
          title={order.package.title}
          totalCents={order.totalCents}
          editHref={`/odk-paketleri/${slug}/satin-al`}
          paytrReady={paytrReady}
          checkout={checkout}
        />
      </main>
      <Footer />
    </>
  );
}
