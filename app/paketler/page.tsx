import type { Metadata } from "next";
import Image from "next/image";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { siteUrl } from "@/lib/content";
import { PackagesPageContent } from "@/components/sections/packages-page-content";

export const metadata: Metadata = {
  title: "Matematik Paketleri",
  description:
    "Matematik Deneme Kulübü (₺750/ay), Matematik Ders Paketi (₺3.000/ay) ve Matematik Tam Destek (₺3.500/ay) paketlerini inceleyin.",
  alternates: { canonical: "/paketler/" },
  openGraph: {
    title: "Matematik Paketleri | Online Dershanem",
    description:
      "Matematik Deneme Kulübü, Matematik Ders Paketi ve Tam Destek paketlerini inceleyin.",
    url: `${siteUrl}/paketler/`,
  },
};

export default function PackagesPage() {
  return (
    <>
      <Navbar />
      <main className="bg-[var(--od-cream)] text-[var(--od-ink)]">
        {/* Premium hero with soft doodle backdrop */}
        <section className="relative overflow-hidden border-b border-[var(--od-line)]">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <Image
              src="/v991-nt-35.jpg"
              alt=""
              fill
              sizes="100vw"
              priority
              className="object-cover opacity-[0.14] mix-blend-multiply"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,253,245,0.55) 0%, rgba(255,253,245,0.92) 70%, var(--od-cream) 100%)",
              }}
            />
          </div>

          <div className="mx-auto max-w-4xl px-5 pt-28 pb-16 sm:pt-36 sm:pb-20 text-center">
            <span className="text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--od-olive)]">
              Matematik Paketleri
            </span>
            <h1 className="mt-5 font-display text-[38px] font-normal leading-[1.05] tracking-tight text-[var(--od-ink)] sm:text-[68px]">
              Matematikte{" "}
              <em className="italic text-[var(--od-olive)]">ilerle</em>.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[15.5px] leading-7 text-[var(--od-ink-soft)]">
              Üç paket, tek odak: matematik. İster denemeyle eksiğini ölç, ister
              butik grupta canlı derse katıl, ister Tam Destek ile ikisini birden al.
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
