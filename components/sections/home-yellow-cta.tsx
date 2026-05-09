import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Opennote-style yellow accent CTA banner — full-width, doodle-free.
 * Headline-led layout with refined typography and a stronger lead.
 */
export function HomeYellowCTA() {
  return (
    <section className="bg-[var(--od-cream)] px-5 py-14 sm:py-20">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-[32px] bg-[var(--od-yellow)] shadow-[0_28px_70px_-32px_rgba(180,140,30,0.45)]">
        <div className="px-8 py-14 text-center sm:px-16 sm:py-20">
          <span className="inline-flex items-center rounded-full bg-[#2A2618]/10 px-3 py-1 text-[11.5px] font-semibold uppercase tracking-[0.18em] text-[#2A2618]">
            Yeni nesil dershane
          </span>

          <h3 className="mx-auto mt-6 max-w-3xl font-display text-[36px] font-normal leading-[1.04] tracking-tight text-[#2A2618] sm:text-[58px]">
            Seninle birlikte{" "}
            <em className="italic text-[#3A4A2C]">düşünen</em> dershane.
          </h3>

          <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-[1.7] text-[#4A4126] sm:text-[17.5px]">
            Hangi konuda zorlandığını <strong className="font-medium text-[#2A2618]">birlikte</strong> görüyoruz;
            haftanı senin yerine kuruyoruz, denemenden sonra ne yapacağını
            söylüyoruz. Burada hocan sayıları takip etmiyor — <em className="italic">seni</em> takip ediyor.
            Sen sadece otur ve çalış; gerisi düşünülmüş bir akış.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/kayit"
              className="inline-flex items-center gap-2 rounded-full bg-[#2A2618] px-7 py-3.5 text-[14.5px] font-medium text-white transition hover:bg-[#3A3422]"
            >
              Ücretsiz dene
              <ArrowRight size={15} strokeWidth={1.8} />
            </Link>
            <Link
              href="/paketler/"
              className="inline-flex items-center rounded-full border border-[#2A2618]/25 bg-transparent px-6 py-3.5 text-[14.5px] font-medium text-[#2A2618] transition hover:bg-[#2A2618]/5"
            >
              Paketleri incele
            </Link>
          </div>

          <p className="mx-auto mt-7 max-w-md text-[12.5px] leading-6 text-[#4A4126]/75">
            Kredi kartı gerekmez · 1 dakikada hesap · Dilediğin zaman vazgeç
          </p>
        </div>
      </div>
    </section>
  );
}
