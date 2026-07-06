import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { CartCheckoutClient } from "@/components/cart/cart-checkout-client";

export const metadata: Metadata = {
  title: "Güvenli Ödeme",
  alternates: { canonical: "/sepet/satin-al" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CartCheckoutPage() {
  const defaults = {
    fullName: "", email: "", phone: "", city: "", district: "",
    schoolName: "", classLevel: "", department: "", examType: "",
    targetSchool: "", parentFullName: "", parentPhone: "",
  };

  return (
    <>
      <Navbar />
      <main className="od-public min-h-screen bg-[var(--od-cream)] py-10">
        <div className="mx-auto max-w-[1080px] px-5 sm:px-8">
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
