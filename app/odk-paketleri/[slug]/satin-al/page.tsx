import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { BuyerInfoForm } from "@/components/checkout/buyer-info-form";

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
      <main className="bg-slate-50 min-h-screen py-10">
        <div className="max-w-3xl mx-auto px-4">
          <nav className="text-sm text-slate-500 mb-4">
            <Link href="/deneme-kulubu" className="hover:underline">
              ODK Paketleri
            </Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700">Satın Al</span>
          </nav>

          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            Sepetiniz / Bilgiler
          </h1>
          <p className="text-sm text-slate-600 mb-6">
            {pkg.durationDays ? `${pkg.durationDays} gün erişim · ` : ""}
            Bilgilerinizi doldurun, güvenli ödemeye geçelim.
          </p>

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
      </main>
      <Footer />
    </>
  );
}
