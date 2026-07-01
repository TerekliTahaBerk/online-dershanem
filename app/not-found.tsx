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
    <main className="od-public flex min-h-screen items-center justify-center bg-[var(--od-cream)] px-5 py-16">
      <div className="text-center max-w-2xl">
        <p className="select-none font-display text-7xl font-medium text-[var(--od-line)]">404</p>
        <h1 className="mt-4 text-[34px] text-[var(--od-ink)]">Sayfa bulunamadı</h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--od-ink-soft)]">
          Aradığın sayfa taşınmış, silinmiş ya da hiç var olmamış olabilir.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex min-h-12 items-center gap-2 rounded-[10px] bg-[var(--od-olive)] px-5 py-2.5 text-sm font-medium text-[var(--od-cream)] transition-colors hover:bg-[#2C3A21]"
          >
            <Home className="h-4 w-4" />
            Ana Sayfa
          </Link>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex min-h-12 items-center gap-2 rounded-[10px] border border-[var(--od-ink)] bg-[var(--od-paper)] px-5 py-2.5 text-sm font-medium text-[var(--od-ink)] transition-colors hover:bg-[var(--od-cream-2)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Geri Dön
          </button>
        </div>

        {/* Popüler sayfalar — kullanıcıyı kaybetmemek için */}
        <div className="mt-12 rounded-[16px] border border-[var(--od-line)] bg-[var(--od-paper)] p-6 text-left shadow-[0_1px_2px_rgba(20,20,15,0.04)]">
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-[var(--od-olive)]" />
            <h2 className="text-[20px] text-[var(--od-ink)]">Popüler Sayfalar</h2>
          </div>
          <ul className="grid sm:grid-cols-2 gap-2">
            {POPULAR_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-[8px] px-3 py-2 text-sm text-[var(--od-ink-soft)] transition-colors hover:bg-[var(--od-cream-2)] hover:text-[var(--od-olive)]"
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
