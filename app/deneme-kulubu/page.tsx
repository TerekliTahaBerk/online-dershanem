import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";

export const metadata: Metadata = {
  title: "Deneme Kulübü Yayında Değil",
  description:
    "Deneme Kulübü şu anda public satışta değildir. Online Dershanem'de satışta olan ürün Matematik Ders Paketi'dir.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function DenemeKulubuPausedPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-[70vh] bg-[var(--od-cream)] text-[var(--od-ink)]">
        <section className="mx-auto max-w-3xl px-5 py-24 text-center sm:py-32">
          <h1 className="text-[38px] font-black leading-[1.05] tracking-normal sm:text-[58px]">
            Deneme Kulübü şu anda yayında değil.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[16px] leading-8 text-[var(--od-ink-soft)]">
            Public satış akışında şu anda yalnızca Matematik Ders Paketi yer
            alıyor. Matematik dersini satın alabilir veya öğrenciniz için en
            doğru küçük grubu birlikte belirlemek üzere bizimle iletişime geçebilirsiniz.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/#matematik-ders-paketi"
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-[var(--od-ink)] px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-black"
            >
              Matematik Ders Paketini İncele
            </Link>
            <Link
              href="/iletisim/"
              className="inline-flex min-h-12 items-center justify-center rounded-md border border-[var(--od-ink)]/20 bg-white px-6 py-3 text-[15px] font-semibold text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/50"
            >
              İletişime Geç
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
