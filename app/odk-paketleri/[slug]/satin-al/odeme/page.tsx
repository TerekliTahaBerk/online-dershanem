import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
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

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

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
      <main className="bg-slate-50 min-h-screen py-10">
        <div className="max-w-3xl mx-auto px-4">
          <nav className="text-sm text-slate-500 mb-4">
            <Link href="/deneme-kulubu" className="hover:underline">
              ODK Paketleri
            </Link>
            <span className="mx-2">/</span>
            <Link
              href={`/odk-paketleri/${slug}/satin-al`}
              className="hover:underline"
            >
              Bilgiler
            </Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700">Ödeme</span>
          </nav>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              {order.package.title}
            </h1>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-indigo-600">
                {formatPrice(order.totalCents)}
              </span>
              <Link
                href={`/odk-paketleri/${slug}/satin-al`}
                className="text-xs text-slate-500 hover:underline"
              >
                Bilgilerimi düzenle
              </Link>
            </div>
          </div>

          {!paytrReady && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-amber-900">
              <h2 className="font-semibold mb-1">
                Ödeme sistemi şu anda yapılandırılıyor
              </h2>
              <p className="text-sm">
                Lütfen kısa süre içinde tekrar deneyin veya{" "}
                <Link href="/iletisim" className="underline">
                  bizimle iletişime geçin
                </Link>
                .
              </p>
            </div>
          )}

          {checkout && !checkout.ok && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 text-rose-900">
              <h2 className="font-semibold mb-1">Ödeme başlatılamadı</h2>
              <p className="text-sm">{checkout.userMessage}</p>
              <p className="text-xs mt-2 opacity-70">
                Sorun devam ederse{" "}
                <Link href="/iletisim" className="underline">
                  iletişime geçin
                </Link>
                .
              </p>
            </div>
          )}

          {checkout && checkout.ok && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <iframe
                src={checkout.iframeUrl}
                title="PayTR Güvenli Ödeme"
                scrolling="no"
                style={{ width: "100%", minHeight: 700, border: 0 }}
              />
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
                Ödeme işleminiz PayTR güvenli ödeme altyapısı üzerinden
                gerçekleştirilmektedir. Kart bilgileriniz sitemizde saklanmaz.
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
