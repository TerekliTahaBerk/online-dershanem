import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { BuyerInfoForm } from "@/components/checkout/buyer-info-form";
import {
  OrderSummaryCard,
  CheckoutPageHeader,
} from "@/components/checkout/order-summary-card";

type Params = Promise<{ slug: string }>;

export const metadata: Metadata = {
  title: "Satın Al · ODK",
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

export default async function OdkCheckoutFormPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;

  const pkg = await prisma.odkPackage.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true,
      slug: true,
      title: true,
      priceCents: true,
      durationDays: true,
      description: true,
    },
  });

  if (!pkg) {
    notFound();
  }

  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    redirect(`/giris?callbackUrl=/odk-paketleri/${slug}/satin-al`);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      student: {
        select: {
          fullName: true,
          phone: true,
          city: true,
          district: true,
          schoolName: true,
          classLevel: true,
          department: true,
          examType: true,
          targetSchool: true,
          parentFullName: true,
          parentPhone: true,
        },
      },
    },
  });

  if (!user) {
    redirect(`/giris?callbackUrl=/odk-paketleri/${slug}/satin-al`);
  }

  const defaults = {
    fullName: user.student?.fullName || user.name || "",
    email: user.email || "",
    phone: user.student?.phone || "",
    city: user.student?.city || "",
    district: user.student?.district || "",
    schoolName: user.student?.schoolName || "",
    classLevel: user.student?.classLevel || "",
    department: user.student?.department || "",
    examType: user.student?.examType || "",
    targetSchool: user.student?.targetSchool || "",
    parentFullName: user.student?.parentFullName || "",
    parentPhone: user.student?.parentPhone || "",
  };

  return (
    <>
      <Navbar />
      <main className="bg-[var(--od-cream)] min-h-screen py-10">
        <div className="max-w-6xl mx-auto px-4">
          <nav className="text-[12px] text-[var(--od-ink-soft)] mb-4 uppercase tracking-wider">
            <Link href="/deneme-kulubu" className="hover:text-[var(--od-ink)]">
              ODK Paketleri
            </Link>
            <span className="mx-2">/</span>
            <span className="text-[var(--od-ink)]">Satın Al</span>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
            <div>
              <CheckoutPageHeader
                subtitle={
                  <>
                    {pkg.durationDays ? `${pkg.durationDays} gün erişim · ` : ""}
                    Bilgilerinizi doldurun, güvenli ödemeye geçelim.
                  </>
                }
              />
              <BuyerInfoForm
                action="/api/odk/checkout/start"
                service="ODK"
                submitMode="redirect"
                submitLabel="Güvenli Ödemeye Geç"
                packageLabel={pkg.title}
                priceLabel={formatPrice(pkg.priceCents)}
                hiddenFields={{ packageId: pkg.id, packageSlug: pkg.slug }}
                defaults={defaults}
              />
            </div>

            <OrderSummaryCard
              items={[
                {
                  id: pkg.id,
                  category: "ODK",
                  name: pkg.title,
                  subtitle: pkg.durationDays
                    ? `${pkg.durationDays} gün erişim`
                    : undefined,
                  priceCents: pkg.priceCents,
                },
              ]}
              backHref={`/odk-paketleri/${slug}`}
              backLabel="← Pakete dön"
            />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
