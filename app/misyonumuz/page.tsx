import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
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
    <>
      <Navbar />
      <main className="od-public overflow-x-hidden bg-[var(--od-cream)] text-[var(--od-ink)]">
        {/* EDITORYAL AÇILIŞ */}
        <section className="mx-auto max-w-[820px] px-[clamp(20px,4vw,40px)] pb-[clamp(40px,6vw,64px)] pt-[clamp(56px,9vw,120px)]">
          <p className="mb-7 text-[14px] font-medium uppercase tracking-[0.06em] text-[var(--od-olive-soft)]">
            Misyonumuz
          </p>
          <h1 className="max-w-[22ch] font-display text-[clamp(30px,5vw,52px)] font-normal leading-[1.16] tracking-[-0.02em]">
            Matematiği, bir çocuğun <em className="italic">korktuğu</em> ders olmaktan
            çıkarmak istedik.
          </h1>
        </section>

        {/* PROSE */}
        <section className="mx-auto max-w-[680px] px-[clamp(20px,4vw,40px)] pb-[clamp(48px,7vw,80px)]">
          <div className="flex flex-col gap-7 text-[19px] leading-[1.7] text-[#2E2E28]">
            <p>
              Online Dershanem, kalabalık dershane sıralarında kaybolan ya da birebir
              özel dersin maliyetine ulaşamayan öğrenciler için kuruldu. İkisinin
              arasında, bilinçli bir yer aradık: yeterince küçük ki her öğrenci görünür
              olsun, yeterince erişilebilir ki her aile sürdürebilsin.
            </p>
            <p>
              Matematiğin bir yetenek meselesi değil, bir{" "}
              <em className="font-display italic">düzen</em> meselesi olduğuna
              inanıyoruz. Doğru büyüklükte bir grup, takip edilen bir plan ve dürüst bir
              geri bildirim — çoğu öğrenci için gereken bu.
            </p>
            <p>
              Abartılı vaatler vermiyoruz. “Garantili puan” veya “bir ayda zirve”
              demiyoruz. Bunun yerine, her hafta çocuğunuzun nerede olduğunu kısa bir
              notla anlatıyor, sürecin içine sizi de alıyoruz. Güven, gösterişle değil
              şeffaflıkla kurulur.
            </p>
          </div>
        </section>

        {/* PULL QUOTE */}
        <section className="border-y border-[var(--od-line)] bg-[var(--od-cream-2)]">
          <div className="mx-auto max-w-[820px] px-[clamp(20px,4vw,40px)] py-[clamp(48px,7vw,88px)] text-center">
            <p className="font-display text-[clamp(24px,4vw,36px)] font-normal italic leading-[1.3] tracking-[-0.01em]">
              “Çocuğun dersten eli boş kalkmasın. Ne çalışacağını bilsin, veli de süreci
              görsün. Kurduğumuz her şey bu basit cümlenin etrafında.”
            </p>
            <p className="mt-6 text-[14px] text-[var(--od-ink-soft)]">
              — Online Dershanem, kurucu ekip
            </p>
          </div>
        </section>

        {/* DEĞERLER */}
        <section className="mx-auto max-w-[1120px] px-[clamp(20px,4vw,40px)] py-[clamp(48px,7vw,88px)]">
          <h2 className="mb-11 font-display text-[clamp(24px,3.4vw,34px)] font-medium tracking-[-0.02em]">
            Bize yön veren üç ilke
          </h2>
          <div className="grid gap-px overflow-hidden rounded-[18px] border border-[var(--od-line)] bg-[var(--od-line)] sm:grid-cols-2 lg:grid-cols-3">
            {principles.map((p) => (
              <div key={p.n} className="bg-[var(--od-cream)] p-8">
                <div className="mb-5 font-display text-[30px] text-[var(--od-olive-soft)]">
                  {p.n}
                </div>
                <h3 className="mb-2.5 text-[18px] font-semibold">{p.title}</h3>
                <p className="text-[15px] leading-[1.6] text-[var(--od-ink-soft)]">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* KAPANIŞ */}
        <section className="border-t border-[var(--od-line)] bg-[var(--od-olive)] text-[var(--od-cream)]">
          <div className="mx-auto max-w-[820px] px-[clamp(20px,4vw,40px)] py-[clamp(56px,8vw,104px)] text-center">
            <h2 className="mb-5 font-display text-[clamp(26px,4vw,42px)] font-medium leading-[1.1] tracking-[-0.02em]">
              Tanışalım mı?
            </h2>
            <p className="mx-auto mb-8 max-w-[42ch] text-[17px] leading-[1.6] text-[#D8DCCF]">
              Çocuğunuz için doğru yer miyiz, en iyisi konuşarak anlaşılır. Bir ön görüşme
              her zaman ücretsiz.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/iletisim/"
                className="inline-flex min-h-12 items-center rounded-[11px] bg-[var(--od-cream)] px-6 py-3.5 text-[16px] font-medium text-[var(--od-olive)] transition-colors hover:bg-[var(--od-cream-2)]"
              >
              İletişim
              </Link>
              <Link
                href="/matematik-ders-paketi/"
                className="inline-flex min-h-12 items-center rounded-[11px] border border-[var(--od-cream)]/[0.28] bg-[var(--od-cream)]/10 px-6 py-3.5 text-[16px] font-medium text-[var(--od-cream)] transition-colors hover:bg-[var(--od-cream)]/[0.18]"
              >
                Ders paketi
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
