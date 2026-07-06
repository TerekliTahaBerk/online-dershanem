"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, ArrowLeft, Search } from "lucide-react";

const POPULAR_LINKS = [
  { href: "/#matematik-ders-paketi", label: "Matematik Ders Paketi" },
  { href: "/yks/", label: "TYT-AYT Matematik" },
  { href: "/lgs/", label: "LGS Matematik" },
  { href: "/misyonumuz/", label: "Misyonumuz" },
  { href: "/iletisim/", label: "İletişim" },
  { href: "/sss/", label: "Sıkça Sorulan Sorular" },
];

export default function NotFound() {
  const router = useRouter();

  return (
    <main className="site-scope flex min-h-screen items-center justify-center bg-[var(--site-bg-warm)] px-5 py-16">
      <div className="text-center max-w-2xl">
        <p className="select-none font-display text-7xl font-medium text-[var(--site-line)]">404</p>
        <h1 className="mt-4 font-display text-[34px] text-[var(--site-ink)]">Sayfa bulunamadı</h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--site-body)]">
          Aradığın sayfa taşınmış, silinmiş ya da hiç var olmamış olabilir.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--brand-orange)] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_-12px_rgba(44,58,32,0.5)] transition-colors hover:bg-[var(--brand-orange-hover)]"
          >
            <Home className="h-4 w-4" />
            Ana Sayfa
          </Link>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[var(--site-line)] bg-white px-6 py-3 text-sm font-semibold text-[var(--site-ink)] transition-colors hover:bg-[var(--site-bg-warm)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Geri Dön
          </button>
        </div>

        {/* Popüler sayfalar — kullanıcıyı kaybetmemek için */}
        <div className="mt-12 rounded-[24px] border border-[var(--site-line)] bg-white p-6 text-left shadow-[0_1px_2px_rgba(20,20,15,0.04)]">
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-[var(--brand-orange-ink)]" />
            <h2 className="font-display text-[20px] text-[var(--site-ink)]">Popüler Sayfalar</h2>
          </div>
          <ul className="grid sm:grid-cols-2 gap-2">
            {POPULAR_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-[12px] px-3 py-2 text-sm text-[var(--site-body)] transition-colors hover:bg-[var(--site-bg-warm)] hover:text-[var(--brand-orange-ink)]"
                >
                  → {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
