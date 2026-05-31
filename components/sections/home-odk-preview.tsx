import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ListChecks,
  TrendingUp,
} from "lucide-react";
import { FadeIn } from "@/components/ui/fade-in";
import { prisma } from "@/lib/prisma";

export const revalidate = 300;

const priceFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
});

/**
 * Compact, conversion-focused Deneme Kulübü preview for the homepage.
 * Pulls live ODK packages from the database (top 3 by price) so the home
 * page reflects the same pricing source as the full landing.
 */
export async function HomeOdkPreview() {
  // Phase 2 / Session 19 — defensive fallback for static prerender.
  // The homepage shouldn't crash builds when the DB is unreachable
  // (e.g. CI without secrets). ISR re-fetches once production is live.
  let packages: Array<{
    id: string;
    title: string;
    slug: string;
    priceCents: number;
    originalPriceCents: number | null;
    durationDays: number | null;
    _count: { packageExams: number };
  }> = [];
  try {
    packages = await prisma.odkPackage.findMany({
      where: { isActive: true },
      orderBy: { priceCents: "asc" },
      take: 3,
      select: {
        id: true,
        title: true,
        slug: true,
        priceCents: true,
        originalPriceCents: true,
        durationDays: true,
        _count: { select: { packageExams: true } },
      },
    });
  } catch (err) {
    console.warn("[HomeOdkPreview] package list query failed", err);
    packages = [];
  }

  return (
    <section className="bg-[var(--od-cream)] py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid items-end gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <FadeIn>
            <div>
              <span className="text-[12.5px] font-medium uppercase tracking-[0.18em] text-[#8B8B7E]">
                Deneme Kulübü
              </span>
              <h2 className="mt-3 font-display text-[32px] font-normal leading-[1.08] tracking-tight text-[var(--od-ink)] sm:text-[44px]">
                Sınava giden{" "}
                <em className="italic text-[var(--od-olive)]">veriyle çalışan</em> hat.
              </h2>
              <p className="mt-4 max-w-xl text-[15.5px] leading-7 text-[var(--od-ink-soft)]">
                TYT, AYT ve LGS için dijital deneme deneyimi, kazanım bazlı analiz ve
                veli takip paneli — tek sistemde, tek paketle.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.05}>
            <ul className="grid gap-2 sm:grid-cols-2">
              {[
                { icon: BarChart3, label: "Dijital deneme + analiz" },
                { icon: ListChecks, label: "Kazanım bazlı rapor" },
                { icon: TrendingUp, label: "Net gelişim grafiği" },
                { icon: CheckCircle2, label: "Veli takip paneli" },
              ].map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-3 rounded-2xl border border-[var(--od-line)] bg-white px-4 py-3 text-[13.5px] text-[var(--od-ink)]"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--od-cream-2)] text-[var(--od-olive)]">
                    <Icon className="h-4 w-4" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </FadeIn>
        </div>

        {packages.length > 0 ? (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((p, i) => {
              const highlight = i === 1; // middle card popped
              return (
                <FadeIn key={p.id} delay={i * 0.05}>
                  <article
                    className={`relative flex h-full flex-col rounded-[24px] border p-6 transition ${
                      highlight
                        ? "border-[var(--od-ink)] bg-white shadow-[0_36px_80px_-36px_rgba(20,20,15,0.28)]"
                        : "border-[var(--od-line)] bg-white/90 hover:border-[var(--od-ink)]/30"
                    }`}
                  >
                    {highlight ? (
                      <span className="absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full bg-[var(--od-ink)] px-3 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-white">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--od-yellow)]" />
                        Popüler
                      </span>
                    ) : null}

                    <div className="text-[11.5px] font-medium uppercase tracking-wider text-[#8B8B7E]">
                      ODK Paketi
                    </div>
                    <h3 className="mt-1 font-display text-[22px] font-normal leading-tight text-[var(--od-ink)]">
                      {p.title}
                    </h3>

                    <div className="mt-4 flex items-baseline gap-1.5">
                      <span className="font-display text-[28px] leading-none tracking-tight text-[var(--od-ink)]">
                        {priceFormatter.format(p.priceCents / 100)}
                      </span>
                      <span className="text-[12px] text-[var(--od-ink-soft)]">/ paket</span>
                    </div>
                    {p.originalPriceCents && p.originalPriceCents > p.priceCents ? (
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-[12.5px] text-[var(--od-ink-soft)] line-through decoration-[var(--od-ink-soft)]/60">
                          {priceFormatter.format(p.originalPriceCents / 100)}
                        </span>
                        <span className="rounded-full bg-[var(--od-olive)]/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--od-olive)]">
                          %{Math.round((1 - p.priceCents / p.originalPriceCents) * 100)}
                        </span>
                      </div>
                    ) : null}
                    <div className="mt-1.5 text-[11.5px] text-[#8B8B7E]">
                      {p._count.packageExams} deneme
                      {p.durationDays
                        ? ` · ${p.durationDays % 30 === 0 ? `${p.durationDays / 30} ay` : `${p.durationDays} gün`}`
                        : ""}
                    </div>

                    <ul className="mt-5 flex-1 space-y-2.5 text-[13px] text-[var(--od-ink-soft)]">
                      {[
                        "Dijital optik + PDF kitapçık",
                        "Kazanım bazlı analiz",
                        "Net gelişim grafiği",
                      ].map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <CheckCircle2
                            size={14}
                            strokeWidth={2.2}
                            className="mt-0.5 shrink-0 text-[var(--od-olive)]"
                          />
                          <span className="leading-snug">{f}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href={`/odk-paketleri/${p.slug}/satin-al`}
                      className={`mt-6 inline-flex items-center justify-center rounded-full px-4 py-2.5 text-[13.5px] font-medium transition ${
                        highlight
                          ? "bg-[var(--od-ink)] text-white hover:bg-[#2A2A22]"
                          : "border border-[var(--od-ink)]/15 bg-white text-[var(--od-ink)] hover:border-[var(--od-ink)]/40"
                      }`}
                    >
                      Pakete başla
                    </Link>
                  </article>
                </FadeIn>
              );
            })}
          </div>
        ) : (
          <div className="mt-12 rounded-[20px] border border-dashed border-[var(--od-line)] bg-white p-8 text-center">
            <p className="text-[14px] text-[var(--od-ink-soft)]">
              ODK paket katalogu hazırlanıyor. Tüm detayları Deneme Kulübü sayfasında
              inceleyebilirsin.
            </p>
          </div>
        )}

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/deneme-kulubu#paketler"
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--od-ink)] px-5 py-2.5 text-[13.5px] font-medium text-white transition hover:bg-black"
          >
            Tüm Paketleri İncele
            <ArrowRight size={14} />
          </Link>
          <Link
            href="/deneme-kulubu"
            className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[13.5px] text-[var(--od-ink-soft)] transition hover:text-[var(--od-ink)]"
          >
            Deneme Kulübü&apos;nü tanı →
          </Link>
        </div>
      </div>
    </section>
  );
}
