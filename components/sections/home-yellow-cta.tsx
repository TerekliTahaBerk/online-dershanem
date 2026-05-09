import Image from "next/image";
import Link from "next/link";

/**
 * Opennote-style yellow accent CTA banner.
 * Soft pastel yellow with hand-drawn doodle on the right side.
 */
export function HomeYellowCTA() {
  return (
    <section className="bg-[var(--od-cream)] px-5 py-12 sm:py-16">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-[var(--od-yellow)] shadow-[0_24px_60px_-32px_rgba(180,140,30,0.45)]">
        <div className="grid items-center gap-6 p-8 sm:grid-cols-[1.2fr_1fr] sm:p-12">
          <div>
            <h3 className="font-display text-[28px] font-normal leading-[1.1] tracking-tight text-[#2A2618] sm:text-[36px]">
              Sınava giden yol
              <br />
              <em className="italic">daha iyi araçları</em> hak ediyor.
            </h3>
            <p className="mt-3 max-w-md text-[14.5px] leading-7 text-[#5A4F2A]">
              Konu, soru, deneme, takvim ve hocan — hepsi tek bir akışta.
              İhtiyacın olan sadece çalışmak.
            </p>
            <Link
              href="/kayit"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-[#2A2618] px-6 py-3 text-[14px] font-medium text-white transition hover:bg-[#3A3422]"
            >
              Ücretsiz dene
            </Link>
          </div>
          <div className="relative hidden h-44 sm:block">
            <Image
              src="/v991-nt-35.jpg"
              alt=""
              fill
              sizes="500px"
              className="object-cover opacity-90 mix-blend-multiply"
              style={{ objectPosition: "60% 50%" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
