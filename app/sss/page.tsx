import type { Metadata } from "next";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { StickyContactBar } from "@/components/sections/sticky-contact-bar";
import { HomeFAQ } from "@/components/sections/home-faq";

export const metadata: Metadata = {
  title: "Sıkça Sorulanlar | Online Dershanem",
  description:
    "Online Dershanem hakkında sık sorulan sorular: dersler nasıl işliyor, ödeme, kontenjan, deneme dersleri ve daha fazlası.",
  alternates: { canonical: "/sss/" },
};

export default function SssPage() {
  return (
    <>
      <Navbar />
      <main className="bg-[var(--od-cream)] text-[var(--od-ink)]">
        <section className="border-b border-[var(--od-line)]">
          <div className="mx-auto max-w-3xl px-5 pt-28 pb-14 sm:pt-36 sm:pb-20 text-center">
            <span className="text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--od-olive)]">
              Yardım Merkezi
            </span>
            <h1 className="mt-5 font-display text-[42px] font-normal leading-[1.05] tracking-tight sm:text-[60px]">
              Sıkça <em className="italic text-[var(--od-olive)]">sorulanlar</em>.
            </h1>
            <p className="mt-6 text-[15.5px] leading-7 text-[var(--od-ink-soft)]">
              Aklındaki sorunun cevabı muhtemelen aşağıda. Bulamazsan iletişim
              sayfasından bize ulaşabilirsin — aynı gün dönüyoruz.
            </p>
          </div>
        </section>

        <HomeFAQ />
      </main>
      <Footer />
      <StickyContactBar />
    </>
  );
}
