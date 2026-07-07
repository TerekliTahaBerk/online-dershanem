import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

export const metadata: Metadata = {
  title: "Deneme Kulübü Yayında Değil",
  description:
    "Deneme Kulübü şu anda yayında değildir. Online Dershanem'de LGS ve YKS Matematik Ders Paketleri satıştadır.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function DenemeKulubuPausedPage() {
  return (
    <div className="site-scope">
      <SiteHeader />
      <main className="min-h-[70vh]">
        <section className="site-container py-24 text-center sm:py-32">
          <span className="site-eyebrow">Deneme Kulübü</span>
          <h1 className="mx-auto mt-4 max-w-2xl font-display text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.06] tracking-[-0.02em] text-[var(--site-ink)]">
            Deneme Kulübü şu anda yayında değil.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[16.5px] leading-8 text-[var(--site-body)]">
            Şu anda LGS ve YKS Matematik Ders Paketleri satışta. Matematik
            ders paketlerini inceleyebilir veya öğrenciniz için en doğru küçük grubu birlikte belirlemek
            üzere bizimle iletişime geçebilirsiniz.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/paketler/" className="site-btn site-btn-primary site-btn-lg">
              Ders Paketlerini İncele
            </Link>
            <Link href="/iletisim/" className="site-btn site-btn-secondary site-btn-lg">
              İletişime Geç
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
