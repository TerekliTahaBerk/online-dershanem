import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";

type Search = Promise<{ status?: string }>;

export const metadata: Metadata = {
  title: "Teşekkürler · Online Dershanem",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function OdCheckoutThankYouPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const { status } = await searchParams;
  const isFailed = status === "failed";
  const isPending = status === "pending";
  const isSuccess = !isFailed && !isPending; // default + "success"

  if (isFailed) {
    return (
      <>
        <Navbar />
        <main className="bg-slate-50 min-h-screen py-16">
          <div className="max-w-xl mx-auto px-4">
            <div className="bg-white rounded-2xl shadow-sm border border-rose-200 p-8 text-center">
              <div className="text-5xl mb-3">⚠️</div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Ödeme tamamlanamadı
              </h1>
              <p className="text-slate-600 mb-5">
                İşleminiz başarısız oldu veya iptal edildi. Kart bilgilerinizi
                kontrol edip tekrar deneyebilir ya da bizimle iletişime
                geçebilirsiniz.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Link
                  href="/paketler"
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                >
                  Paketlere Dön
                </Link>
                <Link
                  href="/iletisim"
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
                >
                  İletişim
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  void isSuccess;

  return (
    <>
      <Navbar />
      <main className="bg-slate-50 min-h-screen py-16">
        <div className="max-w-xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 p-8 text-center">
            <div className="text-5xl mb-3">✅</div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              {isPending ? "Bilgileriniz alındı" : "Ödemeniz alındı!"}
            </h1>
            <p className="text-slate-600 mb-4">
              {isPending
                ? "Talebiniz kayıt altına alındı."
                : "Ödemeniz başarıyla tamamlandı. Teşekkür ederiz!"}
            </p>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 mb-5 text-left">
              <strong>��‍🏫 Sıradaki Adım:</strong> Hocalarımız{" "}
              <strong>24 saat içinde</strong> sizinle iletişime geçerek
              programınızı planlayacak. Henüz öğrenciye ders veya öğretmen
              atanmadı; planlama bizimle birlikte yapılacaktır.
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Link
                href="/panel/ogrenci"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
              >
                Panele Git
              </Link>
              <Link
                href="/iletisim"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
              >
                İletişim
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
