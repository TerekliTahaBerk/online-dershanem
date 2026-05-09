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

      <div className="mx-auto flex max-w-3xl flex-col items-center px-5 pt-16 pb-20 text-center sm:pt-24 sm:pb-24">
        {/* Top doodle accent — small, hand-drawn vibe via the same image, masked to a tiny tile */}
        <div className="mb-6 h-24 w-40 sm:h-28 sm:w-48 relative">
          <Image
            src="/v991-nt-35.jpg"
            alt=""
            fill
            sizes="200px"
            className="object-cover opacity-80"
            style={{ objectPosition: "30% 40%" }}
          />
        </div>

        <h1 className="font-display text-[44px] font-normal leading-[1.04] tracking-[-0.015em] text-[var(--od-ink)] sm:text-[68px] sm:leading-[1.02]">
          Seninle birlikte
          <br />
          düşünen <em className="italic text-[var(--od-olive)]">dershane.</em>
        </h1>

        <p className="mt-6 max-w-xl text-[16px] leading-7 text-[var(--od-ink-soft)] sm:text-[17px]">
          Toplu paket zorunluluğu yok. Sadece ihtiyacın olan dersi seç; en fazla
          dört kişilik gruplarda birebir hıza yakın bir takiple çalış.
        </p>

        <Link
          href="/kayit"
          className="mt-9 inline-flex items-center justify-center rounded-full bg-[var(--od-ink)] px-7 py-3.5 text-[14.5px] font-medium text-white shadow-[0_10px_30px_-12px_rgba(20,20,15,0.45)] transition hover:bg-[#2A2A22]"
        >
          Ücretsiz dene
        </Link>
        <p className="mt-3 text-[12.5px] text-[#8B8B7E]">
          Kart bilgisi istemiyoruz · İstediğin an iptal et
        </p>
      </div>
    </section>
  );
}
