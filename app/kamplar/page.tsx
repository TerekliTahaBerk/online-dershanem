import type { Metadata } from "next";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { Container } from "@/components/ui/container";
import { siteUrl } from "@/lib/content";
import { CampsPageContent } from "@/components/sections/camps-page-content";

export const metadata: Metadata = {
  title: "Kamplar",
  description: "YKS ve LGS için butik kamp planları: planlanan kamplar, içerik detayları ve ön başvuru.",
  alternates: {
    canonical: "/kamplar/"
  },
  openGraph: {
    title: "Kamplar | Online Dershanem",
    description: "Geleceğin başarı planı: butik kamplarımız. İçerikleri inceleyip ön başvuru yapın.",
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
