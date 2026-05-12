import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/content";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const pkg = await prisma.odkPackage.findUnique({
    where: { slug },
    select: { title: true, description: true },
  });
  if (!pkg) return { title: "Paket bulunamadı" };
  return {
    title: `${pkg.title} | ODK Paketi`,
    description: pkg.description ?? `${pkg.title} – OnlineDenemeKulübü paketi.`,
    alternates: { canonical: `/odk-paketleri/${slug}/` },
    openGraph: {
      title: pkg.title,
      description: pkg.description ?? "",
      url: `${siteUrl}/odk-paketleri/${slug}/`,
    },
  };
}

export const revalidate = 300;

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDuration(days: number | null): string {
  if (!days) return "Süresiz";
  if (days % 30 === 0) return `${days / 30} ay erişim`;
  return `${days} gün erişim`;
}

export default async function OdkPackageDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const pkg = await prisma.odkPackage.findUnique({
    where: { slug, isActive: true },
    select: {
      id: true,
      title: true,
      description: true,
      priceCents: true,
      durationDays: true,
      packageExams: {
        orderBy: { sortOrder: "asc" },
        select: {
          exam: {
            select: {
              id: true,
              title: true,
              cadenceFamily: true,
              classLevel: true,
              durationMinutes: true,
              status: true,
            },
          },
        },
      },
    },
  });
  if (!pkg) notFound();

  const exams = pkg.packageExams.map((pe) => pe.exam).filter((e) => e.status !== "ARCHIVED");

  return (
    <>
      <Navbar />
      <main className="bg-[var(--od-cream)] text-[var(--od-ink)]">
        <section className="border-b border-[var(--od-line)]">
          <div className="mx-auto max-w-5xl px-5 pt-28 pb-12 sm:pt-36 sm:pb-16">
            <Link
              href="/odk-paketleri"
              className="inline-flex items-center gap-1 text-[13px] text-[var(--od-ink-soft)] hover:text-[var(--od-ink)]"
            >
              ← Tüm paketler
            </Link>
            <h1 className="mt-6 font-display text-[40px] sm:text-[56px] leading-[1.05]">
              {pkg.title}
            </h1>
            {pkg.description ? (
              <p className="mt-5 max-w-2xl text-[16px] leading-7 text-[var(--od-ink-soft)]">
                {pkg.description}
              </p>
            ) : null}

            <div className="mt-8 flex flex-wrap items-end gap-6">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-[var(--od-ink-soft)]">Fiyat</div>
                <div className="font-display text-[40px] leading-none">{formatPrice(pkg.priceCents)}</div>
                <div className="mt-1 text-[12px] text-[var(--od-ink-soft)]">{formatDuration(pkg.durationDays)}</div>
              </div>
              <Link
                href={`/odk-paketleri/${slug}/satin-al`}
                className="rounded-full bg-[var(--od-olive)] px-8 py-3 text-[15px] font-medium text-white hover:opacity-90 transition"
              >
                Satın Al
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-16">
          <h2 className="font-display text-3xl">Pakete dahil denemeler</h2>
          {exams.length === 0 ? (
            <p className="mt-6 text-[var(--od-ink-soft)]">Henüz deneme eklenmemiş.</p>
          ) : (
            <ul className="mt-8 grid gap-3">
              {exams.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--od-line)] bg-white p-4"
                >
                  <div>
                    <div className="font-medium">{e.title}</div>
                    <div className="text-[12px] text-[var(--od-ink-soft)]">
                      {e.cadenceFamily}
                      {e.classLevel ? ` · ${e.classLevel}. sınıf` : ""}
                      {e.durationMinutes ? ` · ${e.durationMinutes} dk` : ""}
                    </div>
                  </div>
                  <span className="rounded-full bg-[var(--od-cream)] border border-[var(--od-line)] px-3 py-1 text-[11px] uppercase tracking-wider text-[var(--od-ink-soft)]">
                    {e.status === "PUBLISHED" ? "Yayında" : "Hazırlanıyor"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
