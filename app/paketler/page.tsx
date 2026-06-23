import type { Metadata } from "next";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { siteUrl } from "@/lib/content";
import { PackagesPageContent } from "@/components/sections/packages-page-content";

export const metadata: Metadata = {
  title: "Matematik Ders Paketi",
  description:
    "Maksimum 4 kişilik canlı matematik dersi, haftalık konu takibi, ders sonrası ödevlendirme ve veli bilgilendirmesi. Aylık ₺3.000.",
  alternates: { canonical: "/paketler/" },
  openGraph: {
    title: "Matematik Ders Paketi | Online Dershanem",
    description:
      "Maksimum 4 kişilik canlı matematik dersi ve ders sonrası takip.",
    url: `${siteUrl}/paketler/`,
  },
};

export default function PackagesPage() {
  return (
    <>
      <Navbar />
      <main className="bg-[var(--od-cream)] text-[var(--od-ink)]">
        <section className="relative overflow-hidden border-b border-[var(--od-line)]">
          <div className="mx-auto max-w-4xl px-5 pt-28 pb-16 sm:pt-36 sm:pb-20 text-center">
            <h1 className="text-[38px] font-black leading-[1.05] tracking-normal text-[var(--od-ink)] sm:text-[64px]">
              Matematik Ders Paketi.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[15.5px] leading-7 text-[var(--od-ink-soft)]">
              Tek public satış ürünü: maksimum 4 kişilik canlı matematik dersi,
              ders sonrası takip ve veli bilgilendirmesi.
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
