import Image from "next/image";
import Link from "next/link";

/**
 * Opennote-inspired hero.
 *
 * Layout:
 *  - cream background with a faint doodle illustration tiled behind everything
 *  - small navbar-friendly spacer (handled by parent)
 *  - centered illustrative doodle clip on top
 *  - massive serif headline with italic accent
 *  - single dark CTA pill
 */
export function HomeHero() {
  return (
    <section className="relative isolate overflow-hidden bg-[var(--od-cream)]">
      {/* Faint doodle backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[var(--od-cream)]"
      >
        <Image
          src="/v991-nt-35.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-[0.18] mix-blend-multiply"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,253,245,0.55) 0%, rgba(255,253,245,0.85) 60%, var(--od-cream) 100%)",
          }}
        />
      </div>

      <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 px-5 pt-16 pb-20 sm:pt-24 sm:pb-24 lg:flex-row lg:items-center lg:justify-between lg:gap-14">
        <div className="flex max-w-2xl flex-col items-center text-center lg:items-start lg:text-left">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--od-line)] bg-white/70 px-3 py-1 text-[11.5px] font-medium uppercase tracking-[0.18em] text-[var(--od-olive)] backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--od-olive)]" />
            TYT · AYT · LGS
          </span>

          <h1 className="font-display text-[44px] font-normal leading-[1.08] tracking-[0.005em] text-[var(--od-ink)] [word-spacing:0.04em] sm:text-[64px] sm:leading-[1.08]">
            Seninle birlikte
            <br />
            düşünen <em className="italic text-[var(--od-olive)]">dershane.</em>
          </h1>

          <p className="mt-7 max-w-xl text-[16px] leading-[1.75] text-[var(--od-ink-soft)] [word-spacing:0.02em] sm:text-[17.5px]">
            Sınava hazırlık tek paket dayatmasıyla, kalabalık sınıflarla ve
            ezbere planlarla olmaz. Burada sadece ihtiyacın olan dersi
            seçersin; en fazla <strong className="font-medium text-[var(--od-ink)]">dört kişilik</strong>{" "}
            küçük grupta, hocan adınla seslenir, haftan senin için kurulur,
            ilerleyişin hafta hafta görünür hale gelir.
          </p>

          <p className="mt-3 max-w-xl text-[15px] leading-[1.7] text-[var(--od-ink-soft)] sm:text-[16px]">
            Birebir özel dersin yakınlığını, dershane fiyatlarıyla.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Link
              href="/kayit"
              className="inline-flex items-center justify-center rounded-full bg-[var(--od-ink)] px-7 py-3.5 text-[14.5px] font-medium tracking-[0.01em] text-white shadow-[0_10px_30px_-12px_rgba(20,20,15,0.45)] transition hover:bg-[#2A2A22]"
            >
              Ücretsiz dene
            </Link>
            <Link
              href="/paketler/"
              className="inline-flex items-center justify-center rounded-full border border-[var(--od-ink)]/15 bg-white px-6 py-3.5 text-[14.5px] font-medium text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/35"
            >
              Paketleri gör
            </Link>
          </div>
          <p className="mt-4 text-[12.5px] tracking-[0.02em] text-[#8B8B7E]">
            Kart bilgisi istemiyoruz · 1 dakikada hesap · İstediğin an iptal et
          </p>
        </div>

        {/* Founders animation */}
        <div className="relative w-full max-w-[420px] shrink-0 lg:max-w-[460px]">
          <div className="absolute -inset-3 -z-10 rounded-[36px] bg-[var(--od-yellow-soft)] blur-[1px]" aria-hidden />
          <Image
            src="/founders.webp"
            alt="Online Dershanem kurucuları"
            width={400}
            height={225}
            unoptimized
            priority
            className="w-full rounded-[28px] border border-[var(--od-line)] bg-[var(--od-cream-2)] object-cover shadow-[0_28px_70px_-30px_rgba(20,20,15,0.25)]"
          />
          <span className="absolute -bottom-3 left-5 rounded-full border border-[var(--od-line)] bg-white px-3 py-1 text-[11.5px] font-medium uppercase tracking-[0.14em] text-[var(--od-olive)] shadow-sm">
            Kurucular
          </span>
        </div>
      </div>
    </section>
  );
}
