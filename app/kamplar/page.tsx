import type { Metadata } from "next";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { Container } from "@/components/ui/container";
import { siteUrl } from "@/lib/content";
import { CampsPageContent } from "@/components/sections/camps-page-content";

export const metadata: Metadata = {
  title: "Matematik Kampları",
  description: "TYT, AYT ve LGS matematik için butik kamp planları: yoğun konu tekrarı, soru çözümü ve net artışı.",
  alternates: {
    canonical: "/kamplar/"
  },
  openGraph: {
    title: "Matematik Kampları | Online Dershanem",
    description: "Butik matematik kampları: yoğun konu tekrarı ve net artışı. İçerikleri inceleyin.",
    url: `${siteUrl}/kamplar/`
  }
};

export default function CampsPage() {
  return (
    <>
      <Navbar />
      <main className="bg-[var(--od-cream)] text-[var(--od-ink)] py-14 sm:py-20">
        <Container>
          <CampsPageContent />
        </Container>
      </main>
      <Footer />
    </>
  );
}
