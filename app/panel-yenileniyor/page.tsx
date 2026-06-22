import type { Metadata } from "next";
import Link from "next/link";
import { Home, Wrench } from "lucide-react";

export const metadata: Metadata = {
  title: "Panel Yenileniyor | Online Dershanem",
  description:
    "Online Dershanem öğrenci, öğretmen, veli ve yönetim panelleri yeni sürüm için hazırlanıyor.",
  robots: { index: false, follow: false },
};

export default function PanelMaintenancePage() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-12">
      <div className="text-center max-w-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <Wrench className="h-7 w-7" />
        </div>

        <h1 className="mt-6 text-2xl font-semibold text-stone-800">
          Panel yenileniyor
        </h1>
        <p className="mt-3 text-stone-600 text-[15px] leading-relaxed">
          Online Dershanem öğrenci, öğretmen, veli ve yönetim panelleri yeni
          sürüm için hazırlanıyor.
        </p>
        <p className="mt-2 text-stone-500 text-sm leading-relaxed">
          Bu süreçte ders/paket bilgileri ve başvuru formları web sitesinde
          kullanılmaya devam eder.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition"
          >
            <Home className="h-4 w-4" />
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    </div>
  );
}
