import type { Metadata } from "next";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { Container } from "@/components/ui/container";
import { InlineLeadCaptureCard } from "@/components/sections/inline-lead-capture-card";
import { siteUrl } from "@/lib/content";

export const metadata: Metadata = {
  title: "Seni Arayalım",
  description: "Kısa başvuru formunu doldur, danışman ekibimiz seni arasın.",
  alternates: {
    canonical: "/seni-arayalim/"
  },
  robots: {
    index: false,
    follow: false
  },
  openGraph: {
    title: "Seni Arayalım | Online Dershanem",
    description: "Kısa başvuru formunu doldur, danışman ekibimiz seni arasın.",
    url: `${siteUrl}/seni-arayalim/`
  }
};

export default function CallRequestPage() {
  return (
    <>
      <Navbar />
      <main className="py-14 sm:py-20">
        <Container>
          <div className="mx-auto max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">Hızlı Başvuru</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Bilgilerini Bırak, Uzman Ekibimiz Seni Arasın
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
              Bu sayfa direkt paylaşım içindir. Formu doldurduktan sonra danışmanımız sana en uygun programı netleştirmek için en kısa
              sürede iletişime geçer.
            </p>

            <div className="mt-6">
              <InlineLeadCaptureCard source="direct_link_inline_page" />
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
