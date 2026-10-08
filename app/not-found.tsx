import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Home } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { BackButton } from "@/components/site/back-button";

export const metadata: Metadata = {
  title: "Sayfa bulunamadı",
  robots: { index: false, follow: false },
};

const POPULAR_LINKS = [
  { href: "/paketler", label: "Paketini oluştur", note: "Ders, koçluk ve deneme" },
  { href: "/urunler", label: "Ürünler", note: "Üç ürünü karşılaştır" },
  { href: "/urunler/online-dershanem", label: "Canlı öğrenme", note: "LGS ve YKS için küçük grup canlı ders" },
  { href: "/sss", label: "Sıkça sorulan sorular", note: "Fiyat, ders ve ödeme" },
  { href: "/iletisim", label: "İletişim", note: "WhatsApp, telefon, form" },
];

/**
 * 404 — sitenin üst menüsü ve alt bilgisiyle birlikte: kullanıcı yolunu
 * kaybettiği anda gezinmeyi de kaybetmesin.
 */
export default function NotFound() {
  return (
    <div className="site-scope">
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="bg-dc-canvas">
        <div className="site-container py-16 sm:py-24">
          <div className="max-w-[640px]">
            <p className="dc-eyebrow">Hata 404</p>
            <h1 className="mt-4 font-display text-(length:--public-title) leading-[1.08] tracking-tight text-dc-ink">
              Sayfa bulunamadı
            </h1>
            <p className="mt-4 text-[17px] leading-[1.65] text-dc-ink-body">
              Bağlantı eskimiş ya da adres yanlış yazılmış olabilir. Aşağıdaki
              sayfalardan devam edebilirsin.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/" className="site-btn site-btn-primary site-btn-lg">
                <Home size={17} aria-hidden="true" />
                Ana sayfa
              </Link>
              <BackButton />
            </div>
          </div>

          <h2 className="mt-14 text-[17px] font-extrabold text-dc-ink">
            Sık ziyaret edilenler
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {POPULAR_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="group flex min-h-[72px] items-center justify-between gap-4 rounded-dc-card-sm border border-dc-line bg-white px-5 py-4 transition-colors hover:border-dc-brand"
                >
                  <span>
                    <span className="block text-[15.5px] font-bold text-dc-ink">
                      {link.label}
                    </span>
                    <span className="mt-0.5 block text-[13.5px] text-dc-ink-muted">
                      {link.note}
                    </span>
                  </span>
                  <ArrowRight
                    size={18}
                    aria-hidden="true"
                    className="flex-none text-dc-ink-faint transition-colors group-hover:text-dc-brand-strong"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
