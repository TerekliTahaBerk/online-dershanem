import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";

type Params = Promise<{ slug: string }>;
type Search = Promise<{ status?: string }>;

export const metadata: Metadata = {
  title: "Ödeme Sonucu · ODK",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function OdkCheckoutResultPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { slug } = await params;
  const { status } = await searchParams;
  const isSuccess = status === "success";

  return (
    <>
      <Navbar />
      <main className="bg-slate-50 min-h-screen py-16">
        <div className="max-w-xl mx-auto px-4">
          {isSuccess ? (
            <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 p-8 text-center">
              <div className="text-5xl mb-3">✅</div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Ödemeniz alındı
              </h1>
              <p className="text-slate-600 mb-2">
                Siparişiniz başarıyla onaylandığında paket erişiminiz otomatik
                aktive olur. Bu işlem genellikle birkaç saniye sürer.
              </p>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 mb-4 text-left">
                <strong>👨‍🏫 Sıradaki Adım:</strong> Deneme planınızı
                kişiselleştirmek için <strong>hocalarımız 24 saat içinde</strong>{" "}
                sizinle iletişime geçecektir. Şimdilik bir aksiyon almanıza
                gerek yok.
              </div>
              <p className="text-xs text-slate-500 mb-6">
                Sayfayı kapatabilirsiniz. Erişiminizi panelinizden takip
                edebilirsiniz.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Link
                  href="/panel/ogrenci/odk"
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                >
                  ODK Panelime Git
                </Link>
                <Link
                  href={`/odk-paketleri/${slug}`}
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
                >
                  Pakete Dön
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-rose-200 p-8 text-center">
              <div className="text-5xl mb-3">⚠️</div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Ödeme tamamlanamadı
              </h1>
              <p className="text-slate-600 mb-6">
                İşleminiz banka tarafından onaylanmadı ya da yarıda kaldı.
                Hesabınızdan herhangi bir tutar çekilmediyse tekrar
                deneyebilirsiniz.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Link
                  href={`/odk-paketleri/${slug}/satin-al`}
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                >
                  Tekrar Dene
                </Link>
                <Link
                  href="/iletisim"
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
                >
                  Destek
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
