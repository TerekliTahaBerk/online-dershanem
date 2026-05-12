import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/content";

export const metadata: Metadata = {
  title: "ODK Paketleri | OnlineDenemeKulübü",
  description:
    "TYT, AYT, LGS ve YKS denemelerine erişim için OnlineDenemeKulübü paketleri. Dijital optik form, anlık net hesaplama ve kazanım analizi dahil.",
  alternates: { canonical: "/odk-paketleri/" },
  openGraph: {
    title: "OnlineDenemeKulübü Paketleri",
    description:
      "Dijital deneme + optik + analiz. TYT/AYT/LGS/YKS paketlerini incele.",
    url: `${siteUrl}/odk-paketleri/`,
  },
};

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
  if (days % 30 === 0) return `${days / 30} ay`;
  return `${days} gün`;
}

export default async function OdkPackagesPage() {
  const packages = await prisma.odkPackage.findMany({
    where: { isActive: true },
    orderBy: { priceCents: "asc" },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      priceCents: true,
      durationDays: true,
      _count: { select: { packageExams: true } },
    },
  });

  return (
    <>
      <Navbar />
      <main className="bg-[var(--od-cream)] text-[var(--od-ink)]">
        <section className="border-b border-[var(--od-line)]">
          <div className="mx-auto max-w-4xl px-5 pt-28 pb-12 sm:pt-36 sm:pb-16 text-center">
            <span className="text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--od-olive)]">
              OnlineDenemeKulübü
            </span>
            <h1 className="mt-5 font-display text-[38px] font-normal leading-[1.05] tracking-tight sm:text-[64px]">
              Denemeyi <em className="italic text-[var(--od-olive)]">dijital</em> çöz.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[15.5px] leading-7 text-[var(--od-ink-soft)]">
              PDF kitapçık + dijital optik form. Anlık net hesaplama, kazanım
              bazlı analiz, gelişim grafiği ve sınıf raporları.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16">
          {packages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--od-line)] p-12 text-center">
              <h2 className="font-display text-2xl">Yakında</h2>
              <p className="mt-3 text-[15px] text-[var(--od-ink-soft)]">
                Paket katalogumuz hazırlanıyor. Ön kayıt için bizimle iletişime geçin.
              </p>
              <Link
                href="/iletisim"
                className="mt-6 inline-flex items-center justify-center rounded-full border border-[var(--od-olive)] px-6 py-2 text-[14px] font-medium text-[var(--od-olive)] hover:bg-[var(--od-olive)] hover:text-white transition"
              >
                İletişim
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {packages.map((p) => (
                <article
                  key={p.id}
                  className="flex flex-col rounded-2xl border border-[var(--od-line)] bg-white p-6 shadow-sm hover:shadow-md transition"
                >
                  <h3 className="font-display text-[22px] leading-tight">{p.title}</h3>
                  {p.description ? (
                    <p className="mt-3 text-[14px] leading-6 text-[var(--od-ink-soft)] line-clamp-3">
                      {p.description}
                    </p>
                  ) : null}
                  <ul className="mt-5 flex flex-wrap gap-2 text-[12px] text-[var(--od-ink-soft)]">
                    <li className="rounded-full bg-[var(--od-cream)] px-3 py-1 border border-[var(--od-line)]">
                      {p._count.packageExams} deneme
                    </li>
                    <li className="rounded-full bg-[var(--od-cream)] px-3 py-1 border border-[var(--od-line)]">
                      {formatDuration(p.durationDays)}
                    </li>
                  </ul>
                  <div className="mt-6 flex items-end justify-between">
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-[var(--od-ink-soft)]">Fiyat</div>
                      <div className="font-display text-[28px] leading-none">{formatPrice(p.priceCents)}</div>
                    </div>
                    <Link
                      href={`/odk-paketleri/${p.slug}`}
                      className="rounded-full bg-[var(--od-olive)] px-5 py-2 text-[13px] font-medium text-white hover:opacity-90 transition"
                    >
                      İncele
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="border-t border-[var(--od-line)] bg-white">
          <div className="mx-auto max-w-4xl px-5 py-16 text-center">
            <h2 className="font-display text-3xl">Neden OnlineDenemeKulübü?</h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-3 text-left">
              {[
                { t: "Dijital optik", d: "Kağıt formla uğraşmadan, gerçek sınav arayüzünde işaretle." },
                { t: "Anlık değerlendirme", d: "Teslim ettiğin an netlerini, doğru-yanlış-boş dağılımını gör." },
                { t: "Kazanım analizi", d: "Hangi konuda zayıfsın? Veriyi okuyalım, sen çalış." },
              ].map((b) => (
                <div key={b.t}>
                  <h3 className="font-display text-xl">{b.t}</h3>
                  <p className="mt-2 text-[14px] leading-6 text-[var(--od-ink-soft)]">{b.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-[var(--od-line)]">
          <div className="mx-auto max-w-4xl px-5 py-16">
            <div className="text-center">
              <span className="text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--od-olive)]">
                Sık Sorulanlar
              </span>
              <h2 className="mt-3 font-display text-[30px] leading-tight tracking-tight text-[var(--od-ink)] sm:text-[36px]">
                Merak edilenler.
              </h2>
            </div>

            <div className="mx-auto mt-8 max-w-3xl divide-y divide-[var(--od-line)] rounded-[20px] border border-[var(--od-line)] bg-white">
              {[
                {
                  q: "Paketi satın aldıktan sonra denemelere nasıl erişeceğim?",
                  a: "Satın alma onayından sonra öğrenci panelinde ‘Denemelerim’ bölümünden tüm aktif denemeler listelenir. Tek tıkla çözüme başlayabilirsin.",
                },
                {
                  q: "Deneme süresi dolmadan ara verebilir miyim?",
                  a: "Hayır. Süre başladığında geri sayım kesintisiz işler — tıpkı gerçek sınavda olduğu gibi. Bu, doğru ölçüm için bilinçli bir tasarım kararı.",
                },
                {
                  q: "Sonuçlarımı kim görüyor?",
                  a: "Sonuçların yalnızca sana, varsa öğretmenine ve veliye (öğrenci alt yaştaysa) görünür. Üçüncü taraflarla paylaşılmaz.",
                },
                {
                  q: "Mobilde de çözebilir miyim?",
                  a: "Evet. PDF kitapçık ve dijital optik form mobilde alt-üst düzene geçer; tablet ve telefonda da rahat çözebilirsin.",
                },
                {
                  q: "İade politikası nedir?",
                  a: "Hiç deneme başlatmadıysan, satın aldıktan sonra 14 gün içinde tam iade hakkın var. Detaylar için /iade sayfasına bakabilirsin.",
                },
              ].map((item) => (
                <details key={item.q} className="group px-5 py-5 sm:px-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-[15px] font-medium text-[var(--od-ink)]">
                    {item.q}
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--od-line)] bg-[var(--od-cream)] text-[var(--od-olive)] transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-[14px] leading-7 text-[var(--od-ink-soft)]">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
