import type { Metadata } from "next";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { getServerAuthSession } from "@/lib/auth";
import { CartPageClient } from "@/components/cart/cart-page-client";

export const metadata: Metadata = {
  title: "Sepetim · Online Dershanem",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SepetPage() {
  const session = await getServerAuthSession();
  const isLoggedIn = !!session?.user?.id;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[var(--od-cream)]">
        <CartPageClient isLoggedIn={isLoggedIn} />
      </main>
      <Footer />
    </>
  );
}
