import type { Metadata } from "next";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { CartPageClient } from "@/components/cart/cart-page-client";

export const metadata: Metadata = {
  title: "Sepetim · Online Dershanem",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function SepetPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[var(--od-cream)]">
        <CartPageClient />
      </main>
      <Footer />
    </>
  );
}
