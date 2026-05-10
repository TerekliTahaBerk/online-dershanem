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
      {/* Soft pastel backdrop — sky blue → cream gradient with faint doodle */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(80% 60% at 70% 20%, var(--od-sky-soft) 0%, var(--od-cream) 65%)",
          }}
        />
        <Image
          src="/v991-nt-35.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-[0.10] mix-blend-multiply"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(250,250,247,0.4) 0%, rgba(250,250,247,0.85) 70%, var(--od-cream) 100%)",
          }}
        />
      </div>

      <div className="mx-auto flex max-w-6xl flex-col items-center gap-12 px-5 pt-20 pb-24 sm:pt-28 sm:pb-28">
        <div className="flex max-w-2xl flex-col items-center text-center">
          <h1 className="font-display text-[38px] font-normal leading-[1.1] tracking-[0.005em] text-[var(--od-ink)] [word-spacing:0.04em] xs:text-[42px] sm:text-[64px] sm:leading-[1.1]">
            Seninle birlikte
            <br />
            düşünen <em className="italic text-[var(--od-olive)]">dershane.</em>
          </h1>

          <p className="mt-8 max-w-xl text-[16px] leading-[1.8] text-[var(--od-ink-soft)] [word-spacing:0.02em] sm:text-[17.5px]">
            Sınava hazırlık tek paket dayatmasıyla, kalabalık sınıflarla ve
            ezbere planlarla olmaz. Burada sadece ihtiyacın olan dersi
            seçersin; en fazla{" "}
            <strong className="font-medium text-[var(--od-ink)]">dört kişilik</strong>{" "}
            butik grupta hocan adınla seslenir, haftan senin için kurulur,
            ilerleyişin hafta hafta ölçülebilir hâle gelir.
          </p>

          <p className="mt-4 max-w-xl text-[15px] leading-[1.7] italic text-[var(--od-olive)] sm:text-[16px]">
            Birebir özel dersin yakınlığını, dershane ekonomisiyle.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/paketler/"
              className="inline-flex items-center justify-center rounded-full bg-[var(--od-ink)] px-7 py-3.5 text-[14.5px] font-medium tracking-[0.01em] text-white shadow-[0_10px_30px_-12px_rgba(20,20,15,0.45)] transition hover:bg-[#2A2A22]"
            >
              Paketleri İncele
            </Link>
            <Link
              href="/kayit"
              className="inline-flex items-center justify-center rounded-full border border-[var(--od-ink)]/15 bg-white px-6 py-3.5 text-[14.5px] font-medium text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/35"
            >
              Hemen Kayıt Ol
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
