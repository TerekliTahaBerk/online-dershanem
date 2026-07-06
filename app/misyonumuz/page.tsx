import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PageHero } from "@/components/site/page-hero";
import { siteUrl } from "@/lib/content";

export const metadata: Metadata = {
  title: "Misyonumuz",
  description:
    "Online Dershanem'in misyonu: matematikte zorlanan öğrenciyi küçük grup canlı derslerle derste görünür hale getirmek.",
  alternates: { canonical: "/misyonumuz" },
  openGraph: {
    title: "Misyonumuz | Online Dershanem",
    description:
      "Matematikte zorlanan öğrenciyi küçük grup canlı derslerle derste görünür hale getirme misyonumuz.",
    url: `${siteUrl}/misyonumuz`,
    images: [{ url: `${siteUrl}/opengraph-image`, width: 1200, height: 630, alt: "Misyonumuz" }],
  },
};

const principles = [
  {
    n: "01",
    title: "Küçük grup, gerçek ilgi",
    body: "En fazla 4 öğrenci. Herkesin soru sorabildiği, kimsenin arkada kaybolmadığı bir masa.",
  },
  {
    n: "02",
    title: "Şeffaflık, abartı değil",
    body: "Neyi verip neyi vermediğimizi açıkça yazarız. Haftalık notla süreci gözünüzün önüne getiririz.",
  },
  {
    n: "03",
    title: "Erişilebilir olmak",
    body: "Kaliteli takibi, birebir dersin maliyetine mahkûm etmeden, sürdürülebilir bir fiyatta sunmak.",
  },
];

export default function MissionPage() {
  return (
    <div className="site-scope">
      <SiteHeader />
      <main>
        <PageHero
          eyebrow="Misyonumuz"
          align="left"
          title={
            <>
              Matematiği, bir çocuğun <span className="site-hl">korktuğu</span> ders olmaktan
              çıkarmak istedik.
            </>
          }
        />

        {/* PROSE */}
        <section className="site-container pt-4 sm:pt-6">
          <div className="mx-auto flex max-w-2xl flex-col gap-6 text-[18px] leading-8 text-[var(--site-body)]">
            <p>
              Online Dershanem, kalabalık dershane sıralarında kaybolan ya da birebir
              özel dersin maliyetine ulaşamayan öğrenciler için kuruldu. İkisinin
              arasında, bilinçli bir yer aradık: yeterince küçük ki her öğrenci görünür
              olsun, yeterince erişilebilir ki her aile sürdürebilsin.
            </p>
            <p>
              Matematiğin bir yetenek meselesi değil, bir{" "}
              <em className="font-display italic text-[var(--site-ink)]">düzen</em> meselesi
              olduğuna inanıyoruz. Doğru büyüklükte bir grup, takip edilen bir plan ve dürüst
              bir geri bildirim — çoğu öğrenci için gereken bu.
            </p>
            <p>
              Abartılı vaatler vermiyoruz. &ldquo;Garantili puan&rdquo; veya &ldquo;bir ayda
              zirve&rdquo; demiyoruz. Bunun yerine, her hafta çocuğunuzun nerede olduğunu kısa
              bir notla anlatıyor, sürecin içine sizi de alıyoruz. Güven, gösterişle değil
              şeffaflıkla kurulur.
            </p>
          </div>
        </section>

        {/* PULL QUOTE */}
        <section className="mt-14 border-y border-[var(--site-line)] bg-[var(--site-bg-warm)]">
          <div className="site-container py-16 text-center sm:py-20">
            <p className="mx-auto max-w-3xl font-display text-[clamp(1.5rem,3.5vw,2.3rem)] font-normal italic leading-[1.35] tracking-[-0.01em] text-[var(--site-ink)]">
              &ldquo;Çocuğun dersten eli boş kalkmasın. Ne çalışacağını bilsin, veli de süreci
              görsün. Kurduğumuz her şey bu basit cümlenin etrafında.&rdquo;
            </p>
            <p className="mt-6 text-[14px] text-[var(--site-muted)]">— Online Dershanem, kurucu ekip</p>
          </div>
        </section>

        {/* DEĞERLER */}
        <section className="site-container py-16 sm:py-20">
          <h2 className="mb-10 font-display text-[clamp(1.8rem,3.4vw,2.6rem)] leading-tight tracking-[-0.02em] text-[var(--site-ink)]">
            Bize yön veren üç ilke
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {principles.map((p) => (
              <div key={p.n} className="rounded-[24px] border border-[var(--site-line)] bg-white p-7">
                <div className="mb-5 font-display text-[30px] text-[var(--brand-orange-ink)]">{p.n}</div>
                <h3 className="mb-2.5 text-[18px] font-semibold text-[var(--site-ink)]">{p.title}</h3>
                <p className="text-[15px] leading-7 text-[var(--site-body)]">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* KAPANIŞ */}
        <section className="site-container pb-20">
          <div className="overflow-hidden rounded-[32px] bg-[var(--brand-orange)] px-8 py-14 text-center text-white sm:px-12 sm:py-16">
            <h2 className="mx-auto max-w-xl font-display text-[clamp(1.9rem,4vw,2.8rem)] leading-tight tracking-[-0.02em]">
              Tanışalım mı?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[16.5px] leading-7 text-white/85">
              Çocuğunuz için doğru yer miyiz, en iyisi konuşarak anlaşılır. Bir ön görüşme her
              zaman ücretsiz.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/iletisim/"
                className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[16px] font-bold text-[var(--brand-orange-ink)] transition-colors hover:bg-[var(--brand-orange-tint)]"
              >
                İletişim
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
              <Link
                href="/paketler/"
                className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-7 py-3.5 text-[16px] font-semibold text-white transition-colors hover:bg-white/20"
              >
                Ders paketi
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
