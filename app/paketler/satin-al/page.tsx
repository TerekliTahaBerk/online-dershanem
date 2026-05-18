import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { BuyerInfoForm } from "@/components/checkout/buyer-info-form";

type Search = Promise<{
  cat?: string;
  subj?: string;
  name?: string;
  price?: string;
}>;

export const metadata: Metadata = {
  title: "Satın Al · Online Dershanem",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function OdCheckoutFormPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const sp = await searchParams;
  const category = (sp.cat || "").trim();
  const subject = (sp.subj || "").trim();
  const explicitName = (sp.name || "").trim();
  const priceLabel = (sp.price || "").trim() || "Detay için iletişime geçin";

  if (!category && !subject && !explicitName) {
    redirect("/paketler");
  }

  const packageLabel =
    explicitName ||
    [category, subject].filter(Boolean).join(" ").trim() ||
    "Paket";

  const session = await getServerAuthSession();
  const nextUrl = `/paketler/satin-al?${new URLSearchParams({
    cat: category,
    subj: subject,
    name: explicitName,
    price: priceLabel,
  }).toString()}`;

  if (!session?.user?.id) {
    redirect(`/giris?callbackUrl=${encodeURIComponent(nextUrl)}`);
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

  const defaults = {
    fullName: user?.student?.fullName || user?.name || "",
    email: user?.email || "",
    phone: user?.student?.phone || "",
    city: user?.student?.city || "",
    district: user?.student?.district || "",
    schoolName: user?.student?.schoolName || "",
    classLevel: user?.student?.classLevel || "",
    department: user?.student?.department || "",
    examType: user?.student?.examType || category || "",
    targetSchool: user?.student?.targetSchool || "",
    parentFullName: user?.student?.parentFullName || "",
    parentPhone: user?.student?.parentPhone || "",
  };

  return (
    <>
      <Navbar />
      <main className="bg-slate-50 min-h-screen py-10">
        <div className="max-w-3xl mx-auto px-4">
          <nav className="text-sm text-slate-500 mb-4">
            <Link href="/paketler" className="hover:underline">
              Paketler
            </Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700">Satın Al</span>
          </nav>

          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            Sepetiniz / Bilgiler
          </h1>
          <p className="text-sm text-slate-600 mb-6">
            Aşağıdaki bilgileri doldurun, güvenli ödeme sayfasına
            yönlendireceğiz.
          </p>

          <BuyerInfoForm
            action="/api/od/checkout/start"
            service="OD"
            submitMode="redirect"
            submitLabel="Güvenli Ödemeye Geç"
            packageLabel={packageLabel}
            priceLabel={priceLabel}
            hiddenFields={{
              category,
              subject,
              packageName: packageLabel,
              priceLabel,
            }}
            defaults={defaults}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
