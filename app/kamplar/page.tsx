import type { Metadata } from "next";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { Container } from "@/components/ui/container";
import { siteUrl } from "@/lib/content";

export const metadata: Metadata = {
  title: "Kamplar",
  description: "Kamplarımızı sizin için özenle hazırlıyoruz.",
  alternates: {
    canonical: "/kamplar/"
  },
  openGraph: {
    title: "Kamplar | Online Dershanem",
    description: "Kamplarımızı sizin için özenle hazırlıyoruz.",
    url: `${siteUrl}/kamplar/`
  }
};

export default function CampsPage() {
  return (
    <>
      <Navbar />
      <main className="py-16 sm:py-24">
        <Container>
          <section className="mx-auto max-w-3xl rounded-3xl border border-line bg-white p-8 text-center shadow-soft sm:p-12">
            <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Kamplar</h1>
            <p className="mt-4 text-base leading-relaxed text-muted">Kamplarımızı sizin için özenle hazırlıyoruz.</p>
          </section>
        </Container>
      </main>
      <Footer />
    </>
  );
}
