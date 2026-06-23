import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { contact } from "@/lib/content";

export const metadata: Metadata = {
  title: "Panelimizi yeniliyoruz | Online Dershanem",
  description:
    "Online Dershanem öğrenci, veli ve öğretmen panelleri yeni matematik takip sistemi için hazırlanıyor. Matematik Ders Paketi'ni satın alma işleminizi güvenle tamamlayabilirsiniz.",
  robots: { index: false, follow: false },
};

const whatsappHref = `https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}`;

export default function PanelMaintenancePage() {
  return (
    <>
      <Navbar />
      <main className="min-h-[70vh] bg-[var(--od-cream)] px-5 py-20 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[var(--od-olive)]">
            Online Dershanem
          </span>

          <h1 className="mt-4 font-display text-[34px] font-normal leading-[1.08] tracking-tight text-[var(--od-ink)] sm:text-[46px]">
            Panelimizi yeniliyoruz.
          </h1>

          <p className="mt-5 text-[16px] leading-relaxed text-[var(--od-ink-soft)]">
            Online Dershanem öğrenci, veli ve öğretmen panelleri yeni matematik
            takip sistemi için hazırlanıyor. Bu süreçte Matematik Ders Paketi'ni inceleyebilir,
            satın alma işleminizi güvenle tamamlayabilirsiniz.
          </p>

          <p className="mx-auto mt-6 max-w-xl rounded-2xl border border-[var(--od-line)] bg-white px-5 py-4 text-[14px] leading-relaxed text-[var(--od-ink)]">
            Ödeme sonrası ekibimiz sizinle iletişime geçerek öğrenci hesabınızı
            hazırlayacak ve giriş bilgilerinizi paylaşacaktır.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/#matematik-ders-paketi"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--od-ink)] px-6 py-3 text-[14px] font-medium text-white transition hover:bg-black sm:w-auto"
            >
              Matematik Dersini İncele
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/"
              className="inline-flex w-full items-center justify-center rounded-full border border-[var(--od-ink)]/15 bg-white px-6 py-3 text-[14px] font-medium text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/40 sm:w-auto"
            >
              Ana Sayfaya Dön
            </Link>
          </div>

          <p className="mt-7 text-[13px] text-[var(--od-ink-soft)]">
            Sorularınız için{" "}
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[var(--od-olive)] underline-offset-4 hover:underline"
            >
              WhatsApp&apos;tan bize ulaşın
            </a>{" "}
            veya{" "}
            <a
              href={`mailto:${contact.email}`}
              className="font-medium text-[var(--od-olive)] underline-offset-4 hover:underline"
            >
              {contact.email}
            </a>
            .
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
