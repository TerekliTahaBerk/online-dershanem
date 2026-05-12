import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";

type Params = Promise<{ slug: string }>;

export const metadata: Metadata = {
  title: "Satın Al · ODK",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default async function OdkCheckoutPage({ params }: { params: Params }) {
  const { slug } = await params;
  const pkg = await prisma.odkPackage.findUnique({
    where: { slug, isActive: true },
    select: { id: true, title: true, priceCents: true, durationDays: true },
  });
  if (!pkg) notFound();

  const session = await getServerAuthSession();
  if (!session?.user) {
    redirect(`/giris?next=/odk-paketleri/${slug}/satin-al`);
  }

  return (
    <>
      <Navbar />
      <main className="bg-[var(--od-cream)] text-[var(--od-ink)]">
        <section className="mx-auto max-w-2xl px-5 pt-28 pb-16 sm:pt-36">
          <Link
            href={`/odk-paketleri/${slug}`}
            className="inline-flex items-center gap-1 text-[13px] text-[var(--od-ink-soft)] hover:text-[var(--od-ink)]"
          >
            ← Pakete dön
          </Link>
          <h1 className="mt-6 font-display text-[36px] sm:text-[48px] leading-[1.05]">
            Satın Al
          </h1>

          <div className="mt-10 rounded-2xl border border-[var(--od-line)] bg-white p-6">
            <h2 className="font-display text-2xl">{pkg.title}</h2>
            <div className="mt-4 flex items-baseline justify-between border-b border-[var(--od-line)] pb-4">
              <span className="text-[var(--od-ink-soft)]">Tutar</span>
              <span className="font-display text-3xl">{formatPrice(pkg.priceCents)}</span>
            </div>
            {pkg.durationDays ? (
              <div className="mt-3 flex items-baseline justify-between text-[14px]">
                <span className="text-[var(--od-ink-soft)]">Erişim süresi</span>
                <span>
                  {pkg.durationDays % 30 === 0 ? `${pkg.durationDays / 30} ay` : `${pkg.durationDays} gün`}
                </span>
              </div>
            ) : null}

            <div className="mt-8 rounded-xl bg-[var(--od-cream)] border border-dashed border-[var(--od-line)] p-5 text-[14px] leading-6 text-[var(--od-ink-soft)]">
              <strong className="block text-[var(--od-ink)] mb-2">Ödeme entegrasyonu yakında</strong>
              PayTR / iyzico entegrasyonu yakında aktif olacak. Şu an satın
              almak için <Link href="/iletisim" className="underline">bizimle iletişime geçin</Link>;
              ödeme onayından sonra hesabınıza paket erişimi tanımlanır.
            </div>

            <div className="mt-6 flex items-center justify-between">
              <Link
                href="/iletisim"
                className="rounded-full border border-[var(--od-olive)] px-6 py-2.5 text-[14px] font-medium text-[var(--od-olive)] hover:bg-[var(--od-olive)] hover:text-white transition"
              >
                İletişime Geç
              </Link>
              <Link
                href="/panel"
                className="text-[13px] text-[var(--od-ink-soft)] hover:text-[var(--od-ink)]"
              >
                Panele dön →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
