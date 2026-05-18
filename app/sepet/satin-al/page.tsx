import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { CartCheckoutClient } from "@/components/cart/cart-checkout-client";

export const metadata: Metadata = {
  title: "Güvenli Ödeme · Online Dershanem",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CartCheckoutPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    redirect(`/giris?callbackUrl=${encodeURIComponent("/sepet")}`);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
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
    examType: user?.student?.examType || "",
    targetSchool: user?.student?.targetSchool || "",
    parentFullName: user?.student?.parentFullName || "",
    parentPhone: user?.student?.parentPhone || "",
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[var(--od-cream)] py-10">
        <div className="max-w-6xl mx-auto px-4">
          <nav className="text-[12px] text-[var(--od-ink-soft)] mb-4 uppercase tracking-wider">
            <Link href="/sepet" className="hover:text-[var(--od-ink)]">
              Sepet
            </Link>
            <span className="mx-2">/</span>
            <span className="text-[var(--od-ink)]">Güvenli Ödeme</span>
          </nav>
          <CartCheckoutClient defaults={defaults} />
        </div>
      </main>
      <Footer />
    </>
  );
}
