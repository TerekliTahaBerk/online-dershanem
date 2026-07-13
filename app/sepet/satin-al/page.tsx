import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
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
    <div className="site-scope">
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="min-h-screen bg-[var(--site-bg-warm)] py-10">
        <div className="mx-auto max-w-[1080px] px-5 sm:px-8">
          <nav className="text-[12px] text-[var(--site-body)] mb-4 uppercase tracking-wider">
            <Link href="/sepet" className="hover:text-[var(--site-ink)]">
              Sepet
            </Link>
            <span className="mx-2">/</span>
            <span className="text-[var(--site-ink)]">Güvenli Ödeme</span>
          </nav>
          <CartCheckoutClient defaults={defaults} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
