import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { PaytrIframeShell } from "@/components/checkout/paytr-iframe-shell";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { createOdCheckoutSession } from "@/lib/od/checkout";
import { getClientIp, isPaytrConfigured } from "@/lib/odk/paytr";

type Search = Promise<{ orderId?: string }>;

export const metadata: Metadata = {
  title: "Güvenli Ödeme · Online Dershanem",
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

  // Guest checkout: login zorunlu değil. Order'ı id ile çek; sahiplik kontrolü:
  //  - Guest order (userId=null) → cuid orderId tahmin edilemez bir bearer'dır,
  //    id ile erişime izin verilir.
  //  - Kullanıcıya bağlı order → yalnızca o kullanıcı görebilir (başkasının
  //    order'ı okunamaz). Aksi halde 404.
  const session = await getServerAuthSession();
  const order = await prisma.odOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
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

  if (order.userId && order.userId !== session?.user?.id) {
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
        userEmail:
          buyer.email ||
          session?.user?.email ||
          `order-${order.id}@onlinedershanem.com`,
        userName: buyer.fullName || session?.user?.name || "Müşteri",
        userPhone: buyer.phone || "+905555555555",
        userAddress:
          [buyer.district, buyer.city].filter(Boolean).join(", ") || "Türkiye",
        userIp,
        origin,
      })
    : null;

  const editHref = `/paketler/satin-al?${new URLSearchParams({
    cat: order.category || "",
    subj: order.subject || "",
    name: order.packageName,
  }).toString()}`;

  return (
    <>
      <Navbar />
      <main className="bg-[var(--od-cream)] min-h-screen py-10 sm:py-14">
        <PaytrIframeShell
          breadcrumb={[
            { label: "Paketler", href: "/paketler" },
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
