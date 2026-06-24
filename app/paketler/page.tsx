import type { Metadata } from "next";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { siteUrl } from "@/lib/content";
import { PackagesPageContent } from "@/components/sections/packages-page-content";

export const metadata: Metadata = {
  title: "Matematik Ders Paketi — Fiyat ve İçerik",
  description:
    "En fazla 4 öğrencilik canlı matematik dersi, ders içi soru-cevap, ders sonrası ödevlendirme ve veliye sade gelişim özeti. Aylık ₺3.000.",
  // Asıl ürün sayfası /matematik-ders-paketi/ — sıralama sinyalleri orada
  // toplansın diye canonical oraya işaret eder (keyword cannibalization fix).
  alternates: { canonical: "/matematik-ders-paketi/" },
  openGraph: {
    title: "Matematik Ders Paketi | Online Dershanem",
    description:
      "En fazla 4 öğrencilik canlı matematik dersi ve ders sonrası net çalışma yönü.",
    url: `${siteUrl}/paketler/`,
  },
};

export default function PackagesPage() {
  return (
    <>
      <Navbar />
      <main className="bg-[var(--od-cream)] text-[var(--od-ink)]">
        <section className="relative overflow-hidden border-b border-[var(--od-line)] bg-[var(--od-sky-soft)]/70">
          <div className="mx-auto max-w-4xl px-5 pt-28 pb-16 sm:pt-36 sm:pb-20 text-center">
            <h1 className="text-[38px] font-black leading-[1.05] tracking-normal text-[var(--od-ink)] sm:text-[60px]">
              Matematik Ders Paketi.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[15.5px] leading-7 text-[var(--od-ink-soft)]">
              Tek public satış ürünü: en fazla dört öğrencilik canlı matematik
              dersi, derste soru-cevap, ders sonrası çalışma yönü ve veliye sade özet.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-14 sm:py-20">
          <PackagesPageContent />
        </section>
      </main>
      <Footer />
    </>
  );
}
