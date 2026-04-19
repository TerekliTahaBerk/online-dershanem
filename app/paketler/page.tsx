import type { Metadata } from "next";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { PurchaseIntentForm } from "@/components/sections/purchase-intent-form";
import { Container } from "@/components/ui/container";
import { siteUrl } from "@/lib/content";
import { PackagesPageContent } from "@/components/sections/packages-page-content";

export const metadata: Metadata = {
  title: "Ders Bazlı Grup Özel Ders Paketleri",
  description: "TYT-AYT ve LGS için ders bazlı Grup Özel Ders paketlerini inceleyin.",
  alternates: {
    canonical: "/paketler/"
  },
  openGraph: {
    title: "Ders Bazlı Grup Özel Ders Paketleri | Online Dershanem",
    description: "TYT-AYT ve LGS için ders bazlı Grup Özel Ders paketlerini inceleyin.",
    url: `${siteUrl}/paketler/`
  }
};

export default function PackagesPage() {
  return (
    <>
      <Navbar />
      <main className="py-14 sm:py-20">
        <Container>
          <PackagesPageContent />
        </Container>
      </main>
      <PurchaseIntentForm />
      <Footer />
    </>
  );
}
