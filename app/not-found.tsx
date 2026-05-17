"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, ArrowLeft, Search } from "lucide-react";

const POPULAR_LINKS = [
  { href: "/yks/", label: "TYT-AYT Paketleri" },
  { href: "/lgs/", label: "LGS Paketleri" },
  { href: "/deneme-kulubu/", label: "Deneme Kulübü" },
  { href: "/odk-paketleri/", label: "ODK Paketleri" },
  { href: "/iletisim/", label: "İletişim" },
  { href: "/sss/", label: "Sıkça Sorulan Sorular" },
];

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-12">
      <div className="text-center max-w-2xl">
        <p className="text-7xl font-bold text-stone-200 select-none">404</p>
        <h1 className="mt-4 text-2xl font-semibold text-stone-800">Sayfa bulunamadı</h1>
        <p className="mt-2 text-stone-500 text-sm leading-relaxed">
          Aradığın sayfa taşınmış, silinmiş ya da hiç var olmamış olabilir.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition"
          >
            <Home className="h-4 w-4" />
            Ana Sayfa
          </Link>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Geri Dön
          </button>
        </div>

        {/* Popüler sayfalar — kullanıcıyı kaybetmemek için */}
        <div className="mt-12 rounded-2xl border border-stone-200 bg-white p-6 text-left">
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-stone-500" />
            <h2 className="text-sm font-semibold text-stone-700">Popüler Sayfalar</h2>
          </div>
          <ul className="grid sm:grid-cols-2 gap-2">
            {POPULAR_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 hover:text-emerald-700 transition"
                >
                  → {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
