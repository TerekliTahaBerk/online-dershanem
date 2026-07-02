import type { Metadata } from "next";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
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
    <>
      <Navbar />
      <main className="od-public min-h-screen bg-[var(--od-cream)]">
        <CartPageClient />
      </main>
      <Footer />
    </>
  );
}
