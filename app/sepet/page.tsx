import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { CartPageClient } from "@/components/cart/cart-page-client";

export const metadata: Metadata = {
  title: "Sepetim",
  description: "Online Dershanem matematik ders paketi sepetinizi güvenle gözden geçirin.",
  alternates: { canonical: "/sepet" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function SepetPage() {
  return (
    <div className="site-scope">
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="min-h-screen bg-[var(--site-bg-warm)]">
        <CartPageClient />
      </main>
      <SiteFooter />
    </div>
  );
}
